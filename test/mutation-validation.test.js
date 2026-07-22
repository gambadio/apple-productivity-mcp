import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('mail mutations select the local Mail.app id rather than the RFC Message-ID header', async () => {
  let call;
  const client = createAppleClient(async (script, args) => {
    call = { script, args };
    return JSON.stringify({ mailId: '42', operation: 'set_status', success: true });
  });

  await client.updateMailStatus({ mailId: '42', isRead: true });

  assert.equal(call.args.mailId, '42');
  assert.match(call.script, /item\.id\(\).*input\.mailId/);
  assert.doesNotMatch(call.script, /item\.messageId\(\).*input\.messageId/);
});

test('calendar update rejects a no-op before accessing Calendar.app', async () => {
  let called = false;
  const client = createAppleClient(async () => {
    called = true;
    return '{}';
  });

  await assert.rejects(
    client.updateCalendarEvent({ calendar: 'Work', uid: 'event-1' }),
    /at least one editable field/
  );
  assert.equal(called, false);
});

test('reminder update rejects a no-op before accessing Reminders.app', async () => {
  let called = false;
  const client = createAppleClient(async () => {
    called = true;
    return '{}';
  });

  await assert.rejects(
    client.updateReminder({ id: 'reminder-1' }),
    /at least one editable field/
  );
  assert.equal(called, false);
});
