import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';

test('calendar listing script includes events that overlap the requested time window', async () => {
  let script = '';
  const client = createAppleClient(async (receivedScript) => {
    script = receivedScript;
    return '[]';
  });

  await client.listCalendarEvents({
    start: '2026-07-24T09:00:00Z',
    end: '2026-07-24T10:00:00Z'
  });

  assert.match(script, /startsAt > end \|\| \(endsAt && endsAt < start\)/);
});
