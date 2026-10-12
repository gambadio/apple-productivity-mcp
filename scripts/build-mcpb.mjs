#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const exec = promisify(execFile);
const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const registry = JSON.parse(await readFile(path.join(root, 'server.json'), 'utf8'));
const output = path.resolve(process.argv[2] ?? path.join(root, 'dist', `apple-productivity-mcp-${metadata.version}.mcpb`));
const mcpbVersion = '2.1.2';

if (process.platform !== 'darwin') throw new Error('Build and verify this macOS-only bundle on macOS.');
if (manifest.version !== metadata.version || registry.version !== metadata.version || registry.packages.some(p => p.version !== metadata.version)) {
  throw new Error('package.json, manifest.json, and server.json versions must match before packaging.');
}
if (metadata.mcpName !== registry.name) throw new Error('package.json mcpName must match server.json name.');
if (manifest.server.entry_point !== 'src/index.js' || manifest.compatibility.platforms.join(',') !== 'darwin') {
  throw new Error('The bundle must launch src/index.js and declare macOS-only compatibility.');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function copyTree(source, destination, { allowedExtensions } = {}) {
  const info = await lstat(source);
  if (info.isSymbolicLink()) throw new Error(`Refusing to bundle a symbolic link: ${source}`);
  if (info.isDirectory()) {
    await mkdir(destination, { recursive: true });
    for (const entry of (await readdir(source)).sort()) {
      if (['node_modules', '.git', '.cache', '.DS_Store'].includes(entry) || entry === '.env' || entry.startsWith('.env.')) continue;
      await copyTree(path.join(source, entry), path.join(destination, entry), { allowedExtensions });
    }
  } else if (info.isFile() && (!allowedExtensions || allowedExtensions.includes(path.extname(source)))) {
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  } else if (!info.isFile()) {
    throw new Error(`Refusing to bundle a non-regular file: ${source}`);
  }
}

async function discoverTools(directory) {
  const client = new Client({ name: 'apple-productivity-bundle-check', version: metadata.version });
  // Discovery does not call app tools. Ignore the builder's personal configuration.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key, value]) => value !== undefined && !key.startsWith('APPLE_MCP_')));
  Object.assign(env, { APPLE_MCP_READ_ONLY: 'false', APPLE_MCP_ENABLED_GROUPS: '', APPLE_MCP_FILE_ROOTS: '[]', APPLE_MCP_SHORTCUTS: '[]' });
  const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(directory, 'src/index.js')], cwd: directory, env, stderr: 'inherit' });
  try {
    await client.connect(transport, { timeout: 15000 });
    const tools = [];
    let cursor;
    do {
      const result = await client.listTools(cursor ? { cursor } : {}, { timeout: 15000 });
      tools.push(...result.tools);
      cursor = result.nextCursor;
    } while (cursor);
    if (!tools.length) throw new Error('The staged server returned no tools.');
    return tools.map(({ name, description }) => ({ name, description })).sort((a, b) => a.name.localeCompare(b.name));
  } finally {
    await client.close();
  }
}

async function runMcpb(args) {
  const command = process.env.MCPB_BIN || 'npm';
  const commandArgs = process.env.MCPB_BIN ? args : ['exec', '--yes', '--package', `@anthropic-ai/mcpb@${mcpbVersion}`, '--', 'mcpb', ...args];
  const result = await exec(command, commandArgs, { cwd: root, maxBuffer: 8 * 1024 * 1024, timeout: 180000 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

const staging = await mkdtemp(path.join(os.tmpdir(), 'apple-productivity-mcpb-'));
try {
  // Allowlist project content instead of packing the repository or npm cache.
  for (const name of ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE', 'server.json']) await copyFile(path.join(root, name), path.join(staging, name));
  await copyTree(path.join(root, 'src'), path.join(staging, 'src'), { allowedExtensions: ['.js', '.mjs', '.json'] });
  await copyTree(path.join(root, 'docs'), path.join(staging, 'docs'), { allowedExtensions: ['.md', '.json'] });
  const { stdout } = await exec('npm', ['ls', '--omit=dev', '--all', '--parseable'], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  const modulesRoot = path.join(root, 'node_modules');
  const dependencies = [...new Set(stdout.trim().split(/\r?\n/))].filter(location => location !== root);
  if (!dependencies.length) throw new Error('No production dependencies found. Run npm ci first.');
  for (const dependency of dependencies) {
    if (!isInside(modulesRoot, dependency) || !isInside(modulesRoot, await realpath(dependency))) {
      throw new Error(`Production dependency is outside node_modules: ${dependency}`);
    }
    await copyTree(dependency, path.join(staging, path.relative(root, dependency)));
  }
  manifest.tools = await discoverTools(staging);
  // Configuration changes can enable additional tools, such as allowlisted Shortcut execution.
  manifest.tools_generated = true;
  await writeFile(path.join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await runMcpb(['validate', path.join(staging, 'manifest.json')]);
  await mkdir(path.dirname(output), { recursive: true });
  await runMcpb(['pack', staging, output]);
  const { stdout: archiveListing } = await exec('/usr/bin/unzip', ['-Z1', output], { maxBuffer: 8 * 1024 * 1024 });
  const entries = archiveListing.trim().split(/\r?\n/);
  if (entries.some(entry => entry.startsWith('/') || entry.includes('\\') || entry.split('/').includes('..'))) {
    throw new Error('The packed archive contains an unsafe path.');
  }
  const extracted = await mkdtemp(path.join(os.tmpdir(), 'apple-productivity-unpacked-'));
  try {
    await exec('/usr/bin/unzip', ['-q', output, '-d', extracted]);
    const packedTools = await discoverTools(extracted);
    if (JSON.stringify(packedTools) !== JSON.stringify(manifest.tools)) throw new Error('The packed server tool catalog differs from the staged catalog.');
  } finally {
    await rm(extracted, { recursive: true, force: true });
  }
  const hash = createHash('sha256').update(await readFile(output)).digest('hex');
  await writeFile(`${output}.sha256`, `${hash}  ${path.basename(output)}\n`);
  console.log(`Verified ${manifest.tools.length} tools in both staged and unpacked bundles.\nBundle: ${output}\nSHA-256: ${hash}`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
