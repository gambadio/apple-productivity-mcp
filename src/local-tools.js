import { z } from 'zod';
import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, open, opendir, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runJxa } from './apple-client.js';

const exec = promisify(execFile);
const absolutePath = z.string().min(1).max(4096).refine(p => path.isAbsolute(p) && !p.includes('\0'), 'Use an absolute path without NUL characters.');
const limit = z.number().int().min(1).max(500).default(100);
const safeName = z.string().min(1).max(256).refine(s => !s.startsWith('-') && !s.includes('\0'), 'Invalid name.');
const APPS = {
  Mail: 'com.apple.mail', Calendar: 'com.apple.iCal', Reminders: 'com.apple.reminders',
  Notes: 'com.apple.Notes', Contacts: 'com.apple.AddressBook', Safari: 'com.apple.Safari',
  Pages: 'com.apple.iWork.Pages', Numbers: 'com.apple.iWork.Numbers', Keynote: 'com.apple.iWork.Keynote',
  TextEdit: 'com.apple.TextEdit', Music: 'com.apple.Music', Photos: 'com.apple.Photos',
  Messages: 'com.apple.MobileSMS', Shortcuts: 'com.apple.shortcuts', Finder: 'com.apple.finder',
  Preview: 'com.apple.Preview', Maps: 'com.apple.Maps', Books: 'com.apple.iBooksX',
  Home: 'com.apple.Home', Freeform: 'com.apple.freeform', TV: 'com.apple.TV',
  Podcasts: 'com.apple.podcasts', QuickTime: 'com.apple.QuickTimePlayerX'
};

const FINDER = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0]);
  const app = Application('Finder');
  if (input.operation === 'selection') return JSON.stringify(app.selection().slice(0,input.limit).map(x => ({name:String(x.name()),url:String(x.url())})));
  if (input.operation === 'reveal') { app.reveal(Path(input.path)); app.activate(); }
  else if (input.operation === 'trash') { app.delete(Path(input.path)); }
  else throw Error('Unsupported Finder operation');
  return JSON.stringify({success:true,operation:input.operation,path:input.path});
}`;

const CAPABILITIES = String.raw`
ObjC.import('AppKit');
function run(argv) {
  const input=JSON.parse(argv[0]);
  const result={};
  Object.keys(input.apps).forEach(name => {
    const url=$.NSWorkspace.sharedWorkspace.URLForApplicationWithBundleIdentifier(input.apps[name]);
    // An Objective-C nil wrapper is truthy in JavaScript; unwrap it first.
    result[name]={installed:Boolean(ObjC.unwrap(url)),bundleId:input.apps[name]};
  });
  return JSON.stringify(result);
}`;

function inside(root, target) { const r = path.relative(root, target); return r === '' || (!r.startsWith(`..${path.sep}`) && r !== '..' && !path.isAbsolute(r)); }

// File tools are opt-in. Resolve symlinks before checking the configured boundaries.
export function createPathPolicy(roots = []) {
  return async (target, { create = false, allowRoot = true } = {}) => {
    absolutePath.parse(target);
    if (!roots.length) throw new Error('File tools require APPLE_MCP_FILE_ROOTS: a JSON array of allowed absolute directories.');
    const canonicalRoots = await Promise.all(roots.map(p => realpath(absolutePath.parse(p))));
    let resolved;
    try { resolved = await realpath(target); }
    catch (error) {
      if (!create || error.code !== 'ENOENT') throw error;
      // realpath also reports ENOENT for a dangling symlink. Treating that as a
      // new filename would let app-based saves follow it outside the roots.
      let unresolved;
      try { unresolved = await lstat(target); }
      catch (inspectionError) { if (inspectionError.code !== 'ENOENT') throw inspectionError; }
      if (unresolved) throw new Error('Existing path cannot be resolved; dangling symlink destinations are not allowed.');
      // Only one new component is permitted. Parents must exist and be in scope.
      resolved = path.join(await realpath(path.dirname(target)), path.basename(target));
    }
    if (!canonicalRoots.some(root => inside(root, resolved))) throw new Error('Path is outside APPLE_MCP_FILE_ROOTS.');
    if (!allowRoot && canonicalRoots.includes(resolved)) throw new Error('Cannot modify an allowed root itself.');
    return resolved;
  };
}

export function parseArraySetting(value, label) {
  if (!value) return [];
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${label} must be a JSON array of strings.`); }
  if (!Array.isArray(parsed) || parsed.some(x => typeof x !== 'string' || !x)) throw new Error(`${label} must be a JSON array of nonempty strings.`);
  return parsed;
}

export function createLocalTools({ runScript = runJxa, runCommand = exec, fileRoots = parseArraySetting(process.env.APPLE_MCP_FILE_ROOTS, 'APPLE_MCP_FILE_ROOTS'), shortcuts = parseArraySetting(process.env.APPLE_MCP_SHORTCUTS, 'APPLE_MCP_SHORTCUTS') } = {}) {
  const tools = [];
  for (const shortcut of shortcuts) safeName.parse(shortcut);
  const checkPath = createPathPolicy(fileRoots);
  const command = async (bin, args, timeout = 30000) => {
    const {stdout} = await runCommand(bin, args, {timeout, maxBuffer:1024*1024});
    return String(stdout).trim();
  };
  function add(name, description, inputSchema, handler, {readOnly = true, destructive = false, idempotent = readOnly, openWorld = false} = {}) {
    tools.push({name,description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:destructive,idempotentHint:idempotent,openWorldHint:openWorld},handler:async input => handler(z.object(inputSchema).strict().parse(input ?? {}))});
  }
  const json = async (script,input) => JSON.parse(await runScript(script,input));
  add('apple_system_capabilities','Read-only: discover installed Apple apps, platform, file roots, and allowed Shortcuts. Does not test Automation permission.',{},async () => ({platform:os.platform(),release:os.release(),apps:await json(CAPABILITIES,{apps:APPS}),fileRoots,allowedShortcuts:shortcuts,permissions:'Each app may require macOS Automation approval on first use.'}));
  add('apple_system_open_app','Launch or activate a supported Apple app.',{app:z.enum(Object.keys(APPS))},async ({app}) => {await command('/usr/bin/open',['-b',APPS[app]]);return {opened:app};},{readOnly:false});
  add('apple_files_list','Read-only: list one allowed folder. Bounded, non-recursive; hidden entries excluded by default.',{path:absolutePath,limit,includeHidden:z.boolean().default(false)},async input => {
    const folder=await checkPath(input.path); const entries=[];
    const dir=await opendir(folder);
    for await(const item of dir) {
      if (!input.includeHidden && item.name.startsWith('.')) continue;
      entries.push({name:item.name,path:path.join(folder,item.name),type:item.isSymbolicLink()?'symlink':item.isDirectory()?'directory':'file'});
      if(entries.length>=input.limit) break;
    }
    return {path:folder,entries,limit:input.limit};
  });
  add('apple_files_info','Read-only: file/folder metadata within allowed roots.',{path:absolutePath},async input => {
    const p=await checkPath(input.path); const s=await lstat(p);
    return {path:p,type:s.isDirectory()?'directory':s.isFile()?'file':'other',bytes:s.size,modifiedAt:s.mtime.toISOString(),createdAt:s.birthtime.toISOString()};
  });
  add('apple_files_read_text','Read-only: read bounded UTF-8 text from an allowed regular file. Does not parse Pages, PDF, or other binary formats.',{path:absolutePath,maxBytes:z.number().int().min(1).max(1024*1024).default(65536)},async input => {
    const p=await checkPath(input.path);const file=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
    try {const s=await file.stat();if(!s.isFile())throw Error('Expected a regular file.');const buffer=Buffer.alloc(input.maxBytes);const {bytesRead}=await file.read(buffer,0,buffer.length,0);const data=buffer.subarray(0,bytesRead);if(data.includes(0))throw Error('Binary file: use the corresponding Apple app tool.');return {path:p,text:data.toString('utf8'),bytesRead,truncated:s.size>bytesRead};} finally {await file.close();}
  });
  add('apple_files_write_text','Create a UTF-8 file in an allowed folder. Existing files require overwrite=true.',{path:absolutePath,text:z.string().max(1024*1024),overwrite:z.boolean().default(false)},async input => {
    const p=await checkPath(input.path,{create:true,allowRoot:false});
    const flags=constants.O_WRONLY|constants.O_CREAT|constants.O_NOFOLLOW|(input.overwrite?0:constants.O_EXCL);
    const file=await open(p,flags,0o600);
    try {if(!(await file.stat()).isFile())throw Error('Expected a regular file.');if(input.overwrite)await file.truncate(0);await file.writeFile(input.text,'utf8');}finally{await file.close();}
    return {path:p,bytes:Buffer.byteLength(input.text)};
  },{readOnly:false,destructive:true,openWorld:true});
  add('apple_files_create_folder','Create one new folder under an existing allowed folder.',{path:absolutePath},async input => {const p=await checkPath(input.path,{create:true,allowRoot:false});await mkdir(p,{recursive:false});return {created:p};},{readOnly:false,openWorld:true});
  add('apple_files_copy','Copy one regular file within allowed roots. Never overwrites a destination.',{source:absolutePath,destination:absolutePath},async input => {
    const source=await checkPath(input.source);const destination=await checkPath(input.destination,{create:true,allowRoot:false});if(!(await lstat(source)).isFile())throw Error('Only regular files can be copied.');await copyFile(source,destination,constants.COPYFILE_EXCL);return {source,destination};
  },{readOnly:false,openWorld:true});
  add('apple_files_search','Read-only: Spotlight filename search within one allowed folder. Results depend on local Spotlight indexing.',{path:absolutePath,query:z.string().min(1).max(256),limit},async input => {
    const root=await checkPath(input.path);const raw=await command('/usr/bin/mdfind',['-0','-onlyin',root,'-name',input.query]);const files=[];
    for(const item of raw.split('\0').filter(Boolean)) {try{files.push(await checkPath(item));}catch{}if(files.length>=input.limit)break;}
    return {paths:files,limit:input.limit};
  });
  add('apple_files_trash','Move an allowed file or folder to Finder Trash. Symbolic links are refused to avoid deleting their targets. May sync deletions through iCloud. Never empties Trash.',{path:absolutePath},async input => {
    const target=await checkPath(input.path,{allowRoot:false});
    // Other file operations intentionally resolve links, but deleting the resolved
    // target would be a different action from trashing the selected link itself.
    if((await lstat(input.path)).isSymbolicLink())throw Error('Trashing symbolic links is not supported; use Finder to remove the link itself.');
    return json(FINDER,{operation:'trash',path:target});
  },{readOnly:false,destructive:true,openWorld:true});
  add('apple_finder_reveal','Reveal an allowed file or folder in Finder.',{path:absolutePath},async input => json(FINDER,{operation:'reveal',path:await checkPath(input.path)}),{readOnly:false});
  add('apple_finder_selection','Read-only: get selected Finder items (names and URLs). Does not read contents.',{limit},input => json(FINDER,{...input,operation:'selection'}));
  add('apple_shortcuts_list','Read-only: list installed Shortcuts, optionally in one folder.',{folder:safeName.optional()},async input => ({shortcuts:(await command('/usr/bin/shortcuts',['list','--show-identifiers',...(input.folder?['--folder-name',input.folder]:[])])).split('\n').filter(Boolean)}));
  add('apple_shortcuts_list_folders','Read-only: list Shortcuts folders.',{},async () => ({folders:(await command('/usr/bin/shortcuts',['list','--folders'])).split('\n').filter(Boolean)}));
  if(shortcuts.length) add('apple_shortcuts_run','Run an explicitly allowlisted shortcut. It can modify files, send messages, or control other apps; inspect the shortcut before allowing it. Timeout does not guarantee its effects stop.',{name:z.enum(shortcuts),inputPath:absolutePath.optional()},async input => {
    const args=['run',input.name];if(input.inputPath)args.push('--input-path',await checkPath(input.inputPath));
    return {name:input.name,output:await command('/usr/bin/shortcuts',args,60000)};
  },{readOnly:false,destructive:true,openWorld:true});
  return tools;
}
