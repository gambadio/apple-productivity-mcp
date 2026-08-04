import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function withClient(run) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/index.js'],
    cwd: fileURLToPath(new URL('..', import.meta.url))
  });
  const client = new Client({ name: 'apple-productivity-mcp-integration-test', version: '1.0.0' });
  await client.connect(transport);
  try {
    return await run(client);
  } finally {
    await client.close();
  }
}

function toolText(result) {
  assert.equal(result.isError, undefined, result.content?.[0]?.text || 'tool returned an error');
  assert.equal(result.content?.[0]?.type, 'text');
  return result.content[0].text;
}

const integrationTest = process.env.RUN_APPLE_INTEGRATION === '1' ? test : test.skip;

integrationTest('Apple Mail discovery tool can read local account metadata through the MCP', async () => {
  await withClient(async (client) => {
    const result = await client.callTool({ name: 'apple_mail_list_accounts', arguments: {} });
    const text = toolText(result);
    assert.ok(Array.isArray(JSON.parse(text)));
  });
});

integrationTest('Calendar tool can read a local one-day window through the MCP', async () => {
  const start = new Date();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  await withClient(async (client) => {
    const result = await client.callTool({
      name: 'apple_calendar_list_events',
      arguments: { start: start.toISOString(), end: end.toISOString(), limit: 1 }
    });
    const text = toolText(result);
    assert.ok(Array.isArray(JSON.parse(text)));
  });
});

integrationTest('Reminders tool can read local reminders through the MCP', async () => {
  await withClient(async (client) => {
    const result = await client.callTool({ name: 'apple_reminders_list', arguments: { limit: 1 } });
    const text = toolText(result);
    assert.ok(Array.isArray(JSON.parse(text)));
  });
});
