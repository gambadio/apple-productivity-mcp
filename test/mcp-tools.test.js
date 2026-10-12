import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('the local MCP advertises Apple Mail, Calendar, and Reminders read/write tools', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/index.js'],
    cwd: fileURLToPath(new URL('..', import.meta.url))
  });
  const client = new Client({ name: 'apple-productivity-mcp-test', version: '1.0.0' });
  await client.connect(transport);
  try {
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name).sort();
    const legacyNames = [
      'apple_calendar_create_event',
      'apple_calendar_delete_event',
      'apple_calendar_list_calendars',
      'apple_calendar_list_events',
      'apple_calendar_update_event',
      'apple_mail_delete',
      'apple_mail_get',
      'apple_mail_list',
      'apple_mail_list_accounts',
      'apple_mail_move',
      'apple_mail_send',
      'apple_mail_update_status',
      'apple_reminders_complete',
      'apple_reminders_create',
      'apple_reminders_delete',
      'apple_reminders_list',
      'apple_reminders_list_lists',
      'apple_reminders_update'
    ];
    for (const name of legacyNames) assert.ok(names.includes(name), `Legacy tool missing: ${name}`);
    assert.equal(names.length, 133);
    assert.equal(new Set(names).size, names.length);
    for (const tool of result.tools) {
      assert.ok(tool.inputSchema && tool.description);
      for (const flag of ['readOnlyHint','destructiveHint','idempotentHint','openWorldHint']) assert.equal(typeof tool.annotations[flag], 'boolean', `${tool.name}: ${flag}`);
    }
    const readTool = result.tools.find((tool) => tool.name === 'apple_mail_list');
    const sendTool = result.tools.find((tool) => tool.name === 'apple_mail_send');
    const updateTool = result.tools.find((tool) => tool.name === 'apple_mail_update_status');
    const deleteTool = result.tools.find((tool) => tool.name === 'apple_calendar_delete_event');
    assert.match(readTool.description, /read-only/i);
    assert.equal(readTool.annotations?.readOnlyHint, true);
    assert.match(sendTool.description, /immediately sends/i);
    assert.equal(sendTool.annotations?.openWorldHint, true);
    assert.equal(sendTool.annotations?.destructiveHint, false);
    assert.equal(updateTool.annotations?.destructiveHint, true);
    assert.equal(updateTool.annotations?.idempotentHint, true);
    assert.match(deleteTool.description, /destructive/i);
    assert.equal(deleteTool.annotations?.destructiveHint, true);
    assert.equal(deleteTool.annotations?.openWorldHint, true);
  } finally {
    await client.close();
  }
});
