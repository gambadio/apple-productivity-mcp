import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('sending a mail passes recipients and content to the local Apple Mail script', async () => {
  let call;
  const client = createAppleClient(async (script, args) => {
    call = { script, args };
    return JSON.stringify({ sent: true, messageId: '<local-test@example.com>' });
  });

  const result = await client.sendMail({
    account: 'iCloud',
    to: ['recipient@example.com'],
    subject: 'Hello',
    body: 'Local MCP test'
  });

  assert.equal(call.args.to[0], 'recipient@example.com');
  assert.equal(call.args.subject, 'Hello');
  assert.match(call.script, /send\(\)/);
  assert.deepEqual(result, { sent: true, messageId: '<local-test@example.com>' });
});

test('calendar event creation validates and serializes event dates', async () => {
  let call;
  const client = createAppleClient(async (script, args) => {
    call = { script, args };
    return JSON.stringify({ uid: 'event-1', created: true });
  });

  const result = await client.createCalendarEvent({
    calendar: 'Work',
    title: 'Planning',
    start: '2026-07-24T09:00:00Z',
    end: '2026-07-24T10:00:00Z'
  });

  assert.equal(call.args.calendar, 'Work');
  assert.equal(call.args.start, '2026-07-24T09:00:00.000Z');
  assert.match(call.script, /events\.push/);
  assert.deepEqual(result, { uid: 'event-1', created: true });
});

test('completing a reminder calls the local Reminders mutation script with its id', async () => {
  let call;
  const client = createAppleClient(async (script, args) => {
    call = { script, args };
    return JSON.stringify({ id: 'reminder-1', completed: true });
  });

  const result = await client.completeReminder({ id: 'reminder-1' });

  assert.equal(call.args.id, 'reminder-1');
  assert.match(call.script, /completed\s*=\s*true/);
  assert.deepEqual(result, { id: 'reminder-1', completed: true });
});
