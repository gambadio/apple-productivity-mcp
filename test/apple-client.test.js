import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('mail listing normalizes its limit and returns structured local metadata', async () => {
  let call;
  const client = createAppleClient(async (script, args) => {
    call = { script, args };
    return JSON.stringify([{ sender: 'Example <example@example.com>', subject: 'Hello', receivedAt: '2026-07-12T10:00:00.000Z', isRead: false }]);
  });

  const messages = await client.listMail({ account: 'iCloud', limit: 999 });

  assert.equal(call.args.account, 'iCloud');
  assert.equal(call.args.limit, 100);
  assert.match(call.script, /Application\('Mail'\)/);
  assert.deepEqual(messages, [{ sender: 'Example <example@example.com>', subject: 'Hello', receivedAt: '2026-07-12T10:00:00.000Z', isRead: false }]);
});

test('calendar listing rejects an invalid date range before accessing macOS', async () => {
  let called = false;
  const client = createAppleClient(async () => {
    called = true;
    return '[]';
  });

  await assert.rejects(
    client.listCalendarEvents({ start: '2026-07-13T00:00:00Z', end: '2026-07-12T00:00:00Z' }),
    /end must be after start/
  );
  assert.equal(called, false);
});

test('reminder listing returns an actionable permission error unchanged', async () => {
  const client = createAppleClient(async () => {
    throw new Error('Not authorized to send Apple events to Reminders.');
  });

  await assert.rejects(
    client.listReminders({ limit: 10 }),
    /Not authorized to send Apple events to Reminders/
  );
});
