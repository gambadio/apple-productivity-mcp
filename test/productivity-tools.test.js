import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createProductivityTools } from '../src/productivity-tools.js';

const fn=(tools,name)=>tools.find(x=>x.name===`apple_${name}`).handler;
function harness(apps){return async(script,input)=>vm.runInNewContext(script+'\nrun(argv)',{Application:name=>apps[name],argv:[JSON.stringify(input)]});}

test('reminder mutations preserve text as data and exact identifiers; duplicate lists refuse mutation',async()=>{
 const reminder={id:()=> 'r1'};
 const lists=[{id:()=> 'duplicate'},{id:()=> 'duplicate'}];
 const tools=createProductivityTools(harness({Reminders:{reminders:()=>[reminder],lists:()=>lists}}));
 await fn(tools,'reminders_set_completed')({id:'r1',completed:false});assert.equal(reminder.completed,false);
 await fn(tools,'reminders_set_flagged')({id:'r1',flagged:true});assert.equal(reminder.flagged,true);
 await assert.rejects(fn(tools,'reminders_rename_list')({id:'duplicate',name:'new'}),/Ambiguous/);
 await assert.rejects(fn(tools,'reminders_get')({id:'missing'}),/Not found/);
});

test('calendar mutations reject read-only calendars and invalid rules before mutation',async()=>{
 const event={uid:()=> 'u1'};const calendar={name:()=> 'Work',writable:()=>false,events:()=>[event]};
 const tools=createProductivityTools(harness({Calendar:{calendars:()=>[calendar]}}));
 await assert.rejects(fn(tools,'calendar_set_recurrence')({calendar:'Work',uid:'u1',recurrence:'FREQ=WEEKLY;COUNT=5'}),/read-only/);
 assert.equal(event.recurrence,undefined);
 await assert.rejects(fn(tools,'calendar_set_recurrence')({calendar:'Work',uid:'u1',recurrence:'run bad stuff'}));
 await assert.rejects(fn(tools,'calendar_set_url')({calendar:'Work',uid:'u1',url:'javascript:alert(1)'}));
 calendar.writable=()=>true;
 await fn(tools,'calendar_set_recurrence')({calendar:'Work',uid:'u1',recurrence:'FREQ=WEEKLY;COUNT=5'});assert.equal(event.recurrence,'FREQ=WEEKLY;COUNT=5');
});

test('Mail drafts never call send and pass hostile subject text literally',async()=>{
 let created,sent=false;const app={accounts:()=>[{name:()=> 'iCloud',emailAddresses:()=>['sender@example.com']}],OutgoingMessage:props=>({props,id:()=>3,toRecipients:[],ccRecipients:[],bccRecipients:[],send:()=>{sent=true;}}),ToRecipient:props=>props,outgoingMessages:{push:m=>{created=m;}}};
 const tools=createProductivityTools(harness({Mail:app}));const subject='\"; Application("Mail").send(); //';
 const result=await fn(tools,'mail_create_draft')({subject,to:['test@example.com'],body:'Hello'});
 assert.equal(result.sent,false);assert.equal(sent,false);assert.equal(created.props.subject,subject);assert.equal(created.toRecipients[0].address,'test@example.com');
});

test('Mail search bounds collection before retrieving metadata',async()=>{
 let filter,slice;
 const messages={whose:f=>{filter=f;return{slice:(a,b)=>{slice=[a,b];return()=>[];}};}};
 const app={accounts:()=>[{name:()=> 'iCloud',mailboxes:()=>[{name:()=> 'INBOX',messages}]}]};
 const result=await fn(createProductivityTools(harness({Mail:app})),'mail_search')({query:'Invoice',limit:3});
 assert.equal(result.length,0);assert.equal(filter.subject._contains,'Invoice');assert.deepEqual(slice,[0,2]);
});
