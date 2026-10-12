import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppleClient } from '../src/apple-client.js';
import vm from 'node:vm';

test('calendar listing queries Calendar.app for events that overlap the requested time window', async () => {
  let script = '';
  const client = createAppleClient(async (receivedScript) => {
    script = receivedScript;
    return '[]';
  });

  await client.listCalendarEvents({
    start: '2026-07-24T09:00:00Z',
    end: '2026-07-24T10:00:00Z'
  });

  assert.match(script, /events\.whose/);
  assert.match(script, /startDate: \{_lessThanEquals: end\}/);
  assert.match(script, /endDate: \{_greaterThanEquals: start\}/);
});

test('calendar listing uses the installed dictionary alldayEvent property', async () => {
  const start=new Date('2026-10-12T09:00:00Z');
  const event={uid:()=> 'e1',summary:()=> 'Fixture',startDate:()=>start,endDate:()=>new Date(start.getTime()+3600000),alldayEvent:()=>true,location:()=>null};
  const app={calendars:()=>[{name:()=> 'Test',events:{whose:()=>()=>[event]}}]};
  const client=createAppleClient(async (script,args)=>vm.runInNewContext(script+'\nrun(argv)',{Application:()=>app,argv:[JSON.stringify(args)]}));
  const result=await client.listCalendarEvents({start:start.toISOString(),end:new Date(start.getTime()+86400000).toISOString()});
  assert.equal(result[0].allDay,true);
});
