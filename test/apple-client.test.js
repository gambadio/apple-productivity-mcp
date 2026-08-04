import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('discovery methods return structured account, calendar, and reminder-list metadata', async () => {
  const client = createAppleClient(async (script) => {
    if (script.includes("Application('Mail')")) return JSON.stringify([{ name: 'Personal', mailboxes: ['Inbox'] }]);
    if (script.includes("Application('Calendar')")) return JSON.stringify([{ name: 'Work', writable: true }]);
    return JSON.stringify([{ id: 'list-1', name: 'Tasks' }]);
  });

  assert.deepEqual(await client.listMailAccounts(), [{ name: 'Personal', mailboxes: ['Inbox'] }]);
  assert.deepEqual(await client.listCalendars(), [{ name: 'Work', writable: true }]);
  assert.deepEqual(await client.listReminderLists(), [{ id: 'list-1', name: 'Tasks' }]);
});

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
  assert.match(call.script, /messages\.slice\(0, input\.limit - 1\)/);
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
