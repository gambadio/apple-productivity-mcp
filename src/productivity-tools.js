import { z } from 'zod';
import { access } from 'node:fs/promises';
import { runJxa } from './apple-client.js';
import { createPathPolicy, parseArraySetting } from './local-tools.js';

const name = z.string().trim().min(1).max(1024);
const id = z.string().min(1).max(1024);
const limit = z.number().int().min(1).max(100).default(50);
const date = z.string().datetime({offset:true});
const mailRef = {account:name.default('iCloud'),mailbox:name.default('INBOX')};
const eventRef = {calendar:name,uid:id};

export const PRODUCTIVITY_SCRIPT = String.raw`
function run(argv) {
 const p=JSON.parse(argv[0]); const op=p.operation;
 const iso=d=>d?d.toISOString():null;
 function exact(items,fn,value,label){const matches=items.filter(x=>String(fn(x))===value);if(matches.length!==1)throw Error(matches.length?'Ambiguous '+label:'Not found: '+label);return matches[0];}
 function reminderData(r){return {id:String(r.id()),title:String(r.name()),notes:String(r.body()||''),completed:!!r.completed(),priority:r.priority(),dueAt:iso(r.dueDate()),remindAt:iso(r.remindMeDate()),flagged:!!r.flagged()};}
 if(op.indexOf('reminders_')===0){
  const app=Application('Reminders');
  if(op==='reminders_list_accounts')return JSON.stringify(app.accounts().map(a=>({id:String(a.id()),name:String(a.name())})));
  if(op==='reminders_create_list'){
   const account=exact(app.accounts(),a=>a.id(),p.accountId,'Reminders account');
   if(account.lists().some(x=>String(x.name())===p.name))throw Error('List already exists.');
   const list=app.List({name:p.name});account.lists.push(list);return JSON.stringify({id:String(list.id()),name:String(list.name())});
  }
  if(op==='reminders_rename_list'||op==='reminders_delete_list'){
   const list=exact(app.lists(),x=>x.id(),p.id,'reminder list');
   if(op==='reminders_rename_list')list.name=p.name;else app.delete(list);
   return JSON.stringify({id:p.id,success:true});
  }
  if(op==='reminders_search'){
   const output=[];
   for(const list of app.lists()){
    if(p.lists.length&&p.lists.indexOf(String(list.name()))<0)continue;
    const filters={name:{_contains:p.query}};if(!p.includeCompleted)filters.completed=false;
    const items=list.reminders.whose(filters).slice(0,p.limit-1)();
    for(const r of items){output.push({...reminderData(r),list:String(list.name())});if(output.length>=p.limit)return JSON.stringify(output);}
   }
   return JSON.stringify(output);
  }
  const reminder=exact(app.reminders(),r=>r.id(),p.id,'reminder');
  if(op==='reminders_get')return JSON.stringify(reminderData(reminder));
  if(op==='reminders_set_completed')reminder.completed=p.completed;
  else if(op==='reminders_set_flagged')reminder.flagged=p.flagged;
  else if(op==='reminders_set_alarm')reminder.remindMeDate=p.remindAt?new Date(p.remindAt):null;
  else throw Error('Unknown Reminders operation');
  return JSON.stringify({id:p.id,success:true});
 }
 if(op.indexOf('calendar_')===0){
  const app=Application('Calendar');
  if(op==='calendar_create_calendar'){
   if(app.calendars().some(x=>String(x.name())===p.name))throw Error('Calendar already exists.');
   const c=app.Calendar({name:p.name,description:p.description});app.calendars.push(c);return JSON.stringify({name:String(c.name()),created:true});
  }
  const c=exact(app.calendars(),x=>x.name(),p.calendar,'calendar');
  if(op==='calendar_rename_calendar'||op==='calendar_delete_calendar'){
   if(!c.writable())throw Error('Calendar is read-only.');
   if(op==='calendar_rename_calendar')c.name=p.name;else app.delete(c);
   return JSON.stringify({calendar:p.calendar,success:true});
  }
  const e=exact(c.events(),x=>x.uid(),p.uid,'event');
  if(op==='calendar_get_event')return JSON.stringify({uid:String(e.uid()),calendar:p.calendar,title:String(e.summary()),start:iso(e.startDate()),end:iso(e.endDate()),allDay:!!e.alldayEvent(),location:String(e.location()||''),notes:String(e.description()||''),url:String(e.url()||''),recurrence:String(e.recurrence()||''),attendees:e.attendees().map(a=>({name:String(a.displayName()||''),email:String(a.email()||''),status:String(a.participationStatus())})),alarms:e.displayAlarms().map(a=>({minutes:a.triggerInterval()}))});
  if(!c.writable())throw Error('Calendar is read-only.');
  if(op==='calendar_add_alarm'){const alarm=app.DisplayAlarm({triggerInterval:p.minutes});e.displayAlarms.push(alarm);}
  else if(op==='calendar_set_recurrence')e.recurrence=p.recurrence;
  else if(op==='calendar_set_url')e.url=p.url;
  else throw Error('Unknown Calendar operation');
  return JSON.stringify({uid:p.uid,success:true});
 }
 if(op.indexOf('mail_')===0){
  const app=Application('Mail');const account=exact(app.accounts(),x=>x.name(),p.account,'Mail account');
  if(op==='mail_create_draft'){
   const addresses=account.emailAddresses();if(!addresses.length)throw Error('Account has no sender address.');
   const m=app.OutgoingMessage({subject:p.subject,content:p.body,visible:true});m.sender=addresses[0];
   for(const a of p.to)m.toRecipients.push(app.ToRecipient({address:a}));
   for(const a of p.cc)m.ccRecipients.push(app.CcRecipient({address:a}));
   for(const a of p.bcc)m.bccRecipients.push(app.BccRecipient({address:a}));
   app.outgoingMessages.push(m);return JSON.stringify({id:String(m.id()),created:true,sent:false});
  }
  if(op==='mail_create_mailbox'){
   if(account.mailboxes().some(x=>String(x.name())===p.name))throw Error('Mailbox already exists.');
   const box=app.Mailbox({name:p.name});account.mailboxes.push(box);return JSON.stringify({created:true,name:p.name});
  }
  const box=exact(account.mailboxes(),x=>x.name(),p.mailbox,'mailbox');
  if(op==='mail_search'){
   const filter={};filter[p.field]={_contains:p.query};
   const messages=box.messages.whose(filter).slice(0,p.limit-1)();
   return JSON.stringify(messages.map(m=>({mailId:String(m.id()),sender:String(m.sender()),subject:String(m.subject()),receivedAt:iso(m.dateReceived()),isRead:!!m.readStatus(),isFlagged:!!m.flaggedStatus()})));
  }
  const m=box.messages.byId(Number(p.mailId));if(!m.exists())throw Error('Message not found.');
  if(op==='mail_list_attachments')return JSON.stringify(m.mailAttachments().map((a,i)=>({index:i,name:String(a.name()||''),mimeType:String(a.mimeType()||''),size:a.fileSize(),downloaded:!!a.downloaded()})));
  if(op==='mail_save_attachment'){
   const attachments=m.mailAttachments();if(p.index>=attachments.length)throw Error('Attachment index out of range.');
   ObjC.import('Foundation');if($.NSFileManager.defaultManager.fileExistsAtPath(p.path))throw Error('Destination already exists.');
   app.save(attachments[p.index],{in:Path(p.path)});return JSON.stringify({saved:p.path});
  }
  throw Error('Unknown Mail operation');
 }
 throw Error('Unknown operation');
}`;

export function createProductivityTools(runScript=runJxa, {fileRoots=parseArraySetting(process.env.APPLE_MCP_FILE_ROOTS,'APPLE_MCP_FILE_ROOTS')}={}) {
 const tools=[];const checkPath=createPathPolicy(fileRoots);
 function add(operation,description,inputSchema,{readOnly=false,destructive=false,idempotent=readOnly,prepare}={}){
  tools.push({name:`apple_${operation}`,description,inputSchema,annotations:{readOnlyHint:readOnly,destructiveHint:destructive,idempotentHint:idempotent,openWorldHint:!readOnly},handler:async input=>{
   let parsed=z.object(inputSchema).strict().parse(input??{});if(prepare)parsed=await prepare(parsed);
   return JSON.parse(await runScript(PRODUCTIVITY_SCRIPT,{...parsed,operation}));
  }});
 }
 add('reminders_list_accounts','Read-only: list Reminders account IDs and names.',{},{readOnly:true});
 add('reminders_create_list','Create a Reminders list in an exact account ID.',{accountId:id,name});
 add('reminders_rename_list','Rename a Reminders list by ID.',{id,name},{destructive:true,idempotent:true});
 add('reminders_delete_list','Delete a Reminders list and its reminders. Destructive; may sync to iCloud.',{id},{destructive:true});
 add('reminders_get','Read-only: get reminder notes, completion, due time, alarm, priority, and flag.',{id},{readOnly:true});
 add('reminders_search','Read-only: search reminder titles within selected lists.',{query:name,lists:z.array(name).max(100).default([]),includeCompleted:z.boolean().default(false),limit},{readOnly:true});
 add('reminders_set_completed','Set a reminder completion state, including reopening a completed reminder.',{id,completed:z.boolean()},{destructive:true,idempotent:true});
 add('reminders_set_flagged','Set or clear a reminder flag.',{id,flagged:z.boolean()},{destructive:true,idempotent:true});
 add('reminders_set_alarm','Set or clear a reminder notification date.',{id,remindAt:date.nullable()},{destructive:true,idempotent:true});
 add('calendar_create_calendar','Create a Calendar.app calendar using the app default account.',{name,description:z.string().max(10000).default('')});
 add('calendar_rename_calendar','Rename a uniquely named writable calendar.',{calendar:name,name},{destructive:true,idempotent:false});
 add('calendar_delete_calendar','Delete a uniquely named writable calendar and all its events. Destructive.',{calendar:name},{destructive:true});
 add('calendar_get_event','Read-only: get event notes, recurrence, URL, attendees, and display alarms.',eventRef,{readOnly:true});
 add('calendar_add_alarm','Add a display alarm to an event. Negative minutes means before the event.',{...eventRef,minutes:z.number().int().min(-525600).max(525600)});
 add('calendar_set_recurrence','Set an event recurrence rule (for example FREQ=WEEKLY;COUNT=5); empty string clears recurrence. Calendar validates the rule.',{...eventRef,recurrence:z.string().max(2048).refine(s=>s===''||/^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;[A-Z]+=[A-Z0-9,+-]+)*$/.test(s),'Use a supported iCalendar recurrence rule.')},{destructive:true,idempotent:true});
 add('calendar_set_url','Set or clear an event HTTP/HTTPS URL.',{...eventRef,url:z.union([z.literal(''),z.string().url().refine(s=>/^https?:\/\//.test(s))])},{destructive:true,idempotent:true});
 add('mail_search','Read-only: search a mailbox by subject or sender; returns bounded metadata without bodies.',{...mailRef,query:name,field:z.enum(['subject','sender']).default('subject'),limit},{readOnly:true});
 add('mail_create_draft','Create a visible outgoing Mail draft. Does not send; Mail controls draft persistence.',{account:name.default('iCloud'),to:z.array(z.string().email()).max(100).default([]),cc:z.array(z.string().email()).max(100).default([]),bcc:z.array(z.string().email()).max(100).default([]),subject:z.string().max(10000).default(''),body:z.string().max(200000).default('')});
 add('mail_create_mailbox','Create a mailbox in the selected Mail account.',{account:name.default('iCloud'),name});
 const messageRef={...mailRef,mailId:z.string().regex(/^\d+$/)};
 add('mail_list_attachments','Read-only: list attachment metadata for one message.',messageRef,{readOnly:true});
 add('mail_save_attachment','Save one attachment to a new file under APPLE_MCP_FILE_ROOTS. Existing paths are refused.',{...messageRef,index:z.number().int().min(0).max(1000),path:z.string().min(1)},{prepare:async input=>{
  const p=await checkPath(input.path,{create:true,allowRoot:false});
  try{await access(p);throw Error('Destination already exists.');}catch(error){if(error.code!=='ENOENT')throw error;}
  return {...input,path:p};
 }});
 return tools;
}
