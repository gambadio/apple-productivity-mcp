import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('calendar updates require both start and end whenever changing event timing', async () => {
  let called = false;
  const client = createAppleClient(async () => {
    called = true;
    return '{}';
  });

  await assert.rejects(
    client.updateCalendarEvent({
      calendar: 'Work',
      uid: 'event-1',
      start: '2026-07-24T11:00:00Z'
    }),
    /provide both start and end/
  );
  assert.equal(called, false);
});
