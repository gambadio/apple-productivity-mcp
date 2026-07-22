import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_LIMIT = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAIL_LIST_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Mail = Application('Mail');
  const account = Mail.accounts.byName(input.account);
  if (!account.exists()) throw new Error('Mail account not found: ' + input.account);
  const mailbox = account.mailboxes.byName(input.mailbox);
  if (!mailbox.exists()) throw new Error('Mailbox not found: ' + input.mailbox);
  const messages = mailbox.messages();
  const result = messages.slice(0, input.limit).map((message) => ({
    mailId: String(message.id() || ''),
    messageId: String(message.messageId() || ''),
    sender: String(message.sender() || ''),
    subject: String(message.subject() || ''),
    receivedAt: message.dateReceived() ? message.dateReceived().toISOString() : null,
    isRead: Boolean(message.readStatus()),
    isFlagged: Boolean(message.flaggedStatus())
  }));
  return JSON.stringify(result);
}
`;

const MAIL_GET_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Mail = Application('Mail');
  const account = Mail.accounts.byName(input.account);
  const mailbox = account.mailboxes.byName(input.mailbox);
  const message = mailbox.messages().find((item) => String(item.id() || '') === input.mailId);
  if (!message) throw new Error('Message not found in mailbox: ' + input.mailbox);
  return JSON.stringify({
    mailId: String(message.id() || ''),
    messageId: String(message.messageId() || ''),
    sender: String(message.sender() || ''),
    subject: String(message.subject() || ''),
    receivedAt: message.dateReceived() ? message.dateReceived().toISOString() : null,
    isRead: Boolean(message.readStatus()),
    isFlagged: Boolean(message.flaggedStatus()),
    body: String(message.content() || '')
  });
}
`;

const MAIL_SEND_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Mail = Application('Mail');
  const account = Mail.accounts.byName(input.account);
  if (!account.exists()) throw new Error('Mail account not found: ' + input.account);
  const message = Mail.OutgoingMessage({subject: input.subject, content: input.body, visible: false});
  message.sender = account.emailAddresses()[0];
  for (const address of input.to) message.toRecipients.push(Mail.ToRecipient({address}));
  for (const address of input.cc) message.ccRecipients.push(Mail.CcRecipient({address}));
  for (const address of input.bcc) message.bccRecipients.push(Mail.BccRecipient({address}));
  Mail.outgoingMessages.push(message);
  message.send();
  return JSON.stringify({sent: true, messageId: String(message.messageId() || '')});
}
`;

const MAIL_MUTATION_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Mail = Application('Mail');
  const account = Mail.accounts.byName(input.account);
  if (!account.exists()) throw new Error('Mail account not found: ' + input.account);
  const mailbox = account.mailboxes.byName(input.mailbox);
  if (!mailbox.exists()) throw new Error('Mailbox not found: ' + input.mailbox);
  const message = mailbox.messages().find((item) => String(item.id() || '') === input.mailId);
  if (!message) throw new Error('Message not found in mailbox: ' + input.mailbox);
  if (input.operation === 'set_status') {
    if (typeof input.isRead === 'boolean') message.readStatus = input.isRead;
    if (typeof input.isFlagged === 'boolean') message.flaggedStatus = input.isFlagged;
  } else if (input.operation === 'move') {
    const destination = account.mailboxes.byName(input.targetMailbox);
    if (!destination.exists()) throw new Error('Destination mailbox not found: ' + input.targetMailbox);
    message.move({to: destination});
  } else if (input.operation === 'delete') {
    message.delete();
  } else {
    throw new Error('Unknown mail operation: ' + input.operation);
  }
  return JSON.stringify({mailId: input.mailId, operation: input.operation, success: true});
}
`;

const CALENDAR_LIST_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const start = new Date(input.start);
  const end = new Date(input.end);
  const Calendar = Application('Calendar');
  const output = [];
  for (const calendar of Calendar.calendars()) {
    const calendarName = String(calendar.name());
    if (input.calendars.length && !input.calendars.includes(calendarName)) continue;
    for (const event of calendar.events()) {
      const startsAt = event.startDate();
      const endsAt = event.endDate();
      if (!startsAt || startsAt > end || (endsAt && endsAt < start)) continue;
      output.push({
        uid: String(event.uid() || ''),
        calendar: calendarName,
        title: String(event.summary() || ''),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt ? endsAt.toISOString() : null,
        allDay: Boolean(event.allDayEvent()),
        location: String(event.location() || '')
      });
    }
  }
  output.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return JSON.stringify(output.slice(0, input.limit));
}
`;

const CALENDAR_CREATE_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Calendar = Application('Calendar');
  const calendar = Calendar.calendars.byName(input.calendar);
  if (!calendar.exists()) throw new Error('Calendar not found: ' + input.calendar);
  const properties = {
    summary: input.title,
    startDate: new Date(input.start),
    endDate: new Date(input.end),
    allDayEvent: input.allDay
  };
  if (input.location) properties.location = input.location;
  if (input.notes) properties.description = input.notes;
  const event = Calendar.Event(properties);
  calendar.events.push(event);
  return JSON.stringify({uid: String(event.uid() || ''), calendar: input.calendar, created: true});
}
`;

const CALENDAR_MUTATION_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Calendar = Application('Calendar');
  const calendar = Calendar.calendars.byName(input.calendar);
  if (!calendar.exists()) throw new Error('Calendar not found: ' + input.calendar);
  const event = calendar.events().find((item) => String(item.uid() || '') === input.uid);
  if (!event) throw new Error('Calendar event not found: ' + input.uid);
  if (input.operation === 'update') {
    if (input.title !== undefined) event.summary = input.title;
    if (input.start !== undefined) event.startDate = new Date(input.start);
    if (input.end !== undefined) event.endDate = new Date(input.end);
    if (input.location !== undefined) event.location = input.location;
    if (input.notes !== undefined) event.description = input.notes;
    if (input.allDay !== undefined) event.allDayEvent = input.allDay;
  } else if (input.operation === 'delete') {
    event.delete();
  } else {
    throw new Error('Unknown calendar operation: ' + input.operation);
  }
  return JSON.stringify({uid: input.uid, operation: input.operation, success: true});
}
`;

const REMINDERS_LIST_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Reminders = Application('Reminders');
  const output = [];
  for (const list of Reminders.lists()) {
    const listName = String(list.name());
    if (input.lists.length && !input.lists.includes(listName)) continue;
    for (const reminder of list.reminders()) {
      const completed = Boolean(reminder.completed());
      if (!input.includeCompleted && completed) continue;
      const dueAt = reminder.dueDate();
      output.push({
        id: String(reminder.id() || ''),
        list: listName,
        title: String(reminder.name() || ''),
        dueAt: dueAt ? dueAt.toISOString() : null,
        completed,
        priority: Number(reminder.priority() || 0)
      });
    }
  }
  output.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return a.title.localeCompare(b.title);
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  });
  return JSON.stringify(output.slice(0, input.limit));
}
`;

const REMINDERS_CREATE_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Reminders = Application('Reminders');
  const list = Reminders.lists.byName(input.list);
  if (!list.exists()) throw new Error('Reminder list not found: ' + input.list);
  const properties = {name: input.title, priority: input.priority};
  if (input.dueAt) properties.dueDate = new Date(input.dueAt);
  if (input.notes) properties.body = input.notes;
  const reminder = Reminders.Reminder(properties);
  list.reminders.push(reminder);
  return JSON.stringify({id: String(reminder.id() || ''), list: input.list, created: true});
}
`;

const REMINDERS_MUTATION_SCRIPT = String.raw`
function run(argv) {
  const input = JSON.parse(argv[0] || '{}');
  const Reminders = Application('Reminders');
  let reminder = null;
  for (const list of Reminders.lists()) {
    const candidate = list.reminders().find((item) => String(item.id() || '') === input.id);
    if (candidate) { reminder = candidate; break; }
  }
  if (!reminder) throw new Error('Reminder not found: ' + input.id);
  if (input.operation === 'update') {
    if (input.title !== undefined) reminder.name = input.title;
    if (input.dueAt !== undefined) reminder.dueDate = input.dueAt ? new Date(input.dueAt) : null;
    if (input.notes !== undefined) reminder.body = input.notes;
    if (input.priority !== undefined) reminder.priority = input.priority;
  } else if (input.operation === 'complete') {
    reminder.completed = true;
  } else if (input.operation === 'delete') {
    reminder.delete();
  } else {
    throw new Error('Unknown reminders operation: ' + input.operation);
  }
  return JSON.stringify({id: input.id, operation: input.operation, completed: input.operation === 'complete' ? true : undefined, success: true});
}
`;

function normalizeLimit(value, fallback = 20) {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(numeric)));
}

function normalizedDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid ISO date/time`);
  return date;
}

function normalizeEmails(value, label, required = false) {
  const emails = Array.isArray(value) ? value.map((email) => String(email).trim()).filter(Boolean) : [];
  if (required && emails.length === 0) throw new Error(`${label} must include at least one email address`);
  if (emails.some((email) => !EMAIL_RE.test(email))) throw new Error(`${label} contains an invalid email address`);
  return emails;
}

function textOrUndefined(value, label) {
  if (value === undefined || value === null) return undefined;
  const text = String(value);
  if (!text.trim()) throw new Error(`${label} must not be empty`);
  return text;
}

async function runJxa(script, args) {
  try {
    const { stdout } = await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', '-e', script, JSON.stringify(args)],
      { timeout: 15000, maxBuffer: 1024 * 1024 }
    );
    return stdout.trim();
  } catch (error) {
    if (error?.killed || error?.signal === 'SIGTERM') {
      throw new Error(
        'Apple automation timed out after 15 seconds. Grant the app that launches Claude Code (usually Terminal) permission to control the requested Apple app in System Settings > Privacy & Security > Automation, then retry.'
      );
    }
    const details = [error.stderr, error.message].filter(Boolean).join(' ').trim();
    throw new Error(`Apple automation unavailable: ${details}`);
  }
}

function parseJson(raw, source, expectArray = false) {
  let parsed;
  try {
    parsed = JSON.parse(raw || (expectArray ? '[]' : '{}'));
  } catch {
    throw new Error(`${source} returned invalid JSON`);
  }
  if (expectArray && !Array.isArray(parsed)) throw new Error(`${source} returned an unexpected response`);
  if (!expectArray && (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object')) {
    throw new Error(`${source} returned an unexpected response`);
  }
  return parsed;
}

function mutationArgs(input, { id, operation }) {
  if (!input[id]) throw new Error(`${id} is required`);
  return { ...input, [id]: String(input[id]), operation };
}

export function createAppleClient(runScript = runJxa) {
  return {
    async listMail({ account = 'iCloud', mailbox = 'INBOX', limit = 20 } = {}) {
      const args = { account: String(account), mailbox: String(mailbox), limit: normalizeLimit(limit) };
      return parseJson(await runScript(MAIL_LIST_SCRIPT, args), 'Mail', true);
    },

    async getMail({ account = 'iCloud', mailbox = 'INBOX', mailId } = {}) {
      if (!mailId) throw new Error('mailId is required');
      const args = { account: String(account), mailbox: String(mailbox), mailId: String(mailId) };
      return parseJson(await runScript(MAIL_GET_SCRIPT, args), 'Mail');
    },

    async sendMail({ account = 'iCloud', to, cc = [], bcc = [], subject, body } = {}) {
      const args = {
        account: String(account),
        to: normalizeEmails(to, 'to', true),
        cc: normalizeEmails(cc, 'cc'),
        bcc: normalizeEmails(bcc, 'bcc'),
        subject: textOrUndefined(subject, 'subject'),
        body: String(body ?? '')
      };
      return parseJson(await runScript(MAIL_SEND_SCRIPT, args), 'Mail');
    },

    async updateMailStatus({ account = 'iCloud', mailbox = 'INBOX', mailId, isRead, isFlagged } = {}) {
      if (isRead === undefined && isFlagged === undefined) throw new Error('provide isRead and/or isFlagged');
      const args = mutationArgs({ account: String(account), mailbox: String(mailbox), mailId, isRead, isFlagged }, { id: 'mailId', operation: 'set_status' });
      return parseJson(await runScript(MAIL_MUTATION_SCRIPT, args), 'Mail');
    },

    async moveMail({ account = 'iCloud', mailbox = 'INBOX', mailId, targetMailbox } = {}) {
      if (!targetMailbox) throw new Error('targetMailbox is required');
      const args = mutationArgs({ account: String(account), mailbox: String(mailbox), mailId, targetMailbox: String(targetMailbox) }, { id: 'mailId', operation: 'move' });
      return parseJson(await runScript(MAIL_MUTATION_SCRIPT, args), 'Mail');
    },

    async deleteMail({ account = 'iCloud', mailbox = 'INBOX', mailId } = {}) {
      const args = mutationArgs({ account: String(account), mailbox: String(mailbox), mailId }, { id: 'mailId', operation: 'delete' });
      return parseJson(await runScript(MAIL_MUTATION_SCRIPT, args), 'Mail');
    },

    async listCalendarEvents({ start, end, calendars = [], limit = 50 } = {}) {
      const startDate = normalizedDate(start, 'start');
      const endDate = normalizedDate(end, 'end');
      if (endDate <= startDate) throw new Error('end must be after start');
      const args = {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        calendars: Array.isArray(calendars) ? calendars.map(String) : [],
        limit: normalizeLimit(limit, 50)
      };
      return parseJson(await runScript(CALENDAR_LIST_SCRIPT, args), 'Calendar', true);
    },

    async createCalendarEvent({ calendar, title, start, end, allDay = false, location = '', notes = '' } = {}) {
      if (!calendar) throw new Error('calendar is required');
      const startDate = normalizedDate(start, 'start');
      const endDate = normalizedDate(end, 'end');
      if (endDate <= startDate) throw new Error('end must be after start');
      const args = { calendar: String(calendar), title: textOrUndefined(title, 'title'), start: startDate.toISOString(), end: endDate.toISOString(), allDay: Boolean(allDay), location: String(location), notes: String(notes) };
      return parseJson(await runScript(CALENDAR_CREATE_SCRIPT, args), 'Calendar');
    },

    async updateCalendarEvent({ calendar, uid, title, start, end, allDay, location, notes } = {}) {
      if (!calendar) throw new Error('calendar is required');
      if (!uid) throw new Error('uid is required');
      if ([title, start, end, allDay, location, notes].every((value) => value === undefined)) {
        throw new Error('provide at least one editable field');
      }
      const args = { calendar: String(calendar), uid: String(uid), operation: 'update' };
      if (title !== undefined) args.title = textOrUndefined(title, 'title');
      const changesTiming = start !== undefined || end !== undefined;
      if (changesTiming && (start === undefined || end === undefined)) {
        throw new Error('provide both start and end when changing event timing');
      }
      if (start !== undefined) args.start = normalizedDate(start, 'start').toISOString();
      if (end !== undefined) args.end = normalizedDate(end, 'end').toISOString();
      if (changesTiming && new Date(args.end) <= new Date(args.start)) throw new Error('end must be after start');
      if (allDay !== undefined) args.allDay = Boolean(allDay);
      if (location !== undefined) args.location = String(location);
      if (notes !== undefined) args.notes = String(notes);
      return parseJson(await runScript(CALENDAR_MUTATION_SCRIPT, args), 'Calendar');
    },

    async deleteCalendarEvent({ calendar, uid } = {}) {
      if (!calendar) throw new Error('calendar is required');
      const args = mutationArgs({ calendar: String(calendar), uid }, { id: 'uid', operation: 'delete' });
      return parseJson(await runScript(CALENDAR_MUTATION_SCRIPT, args), 'Calendar');
    },

    async listReminders({ lists = [], includeCompleted = false, limit = 50 } = {}) {
      const args = { lists: Array.isArray(lists) ? lists.map(String) : [], includeCompleted: Boolean(includeCompleted), limit: normalizeLimit(limit, 50) };
      return parseJson(await runScript(REMINDERS_LIST_SCRIPT, args), 'Reminders', true);
    },

    async createReminder({ list, title, dueAt = null, notes = '', priority = 0 } = {}) {
      if (!list) throw new Error('list is required');
      const args = { list: String(list), title: textOrUndefined(title, 'title'), dueAt: dueAt ? normalizedDate(dueAt, 'dueAt').toISOString() : null, notes: String(notes), priority: Number(priority) || 0 };
      return parseJson(await runScript(REMINDERS_CREATE_SCRIPT, args), 'Reminders');
    },

    async updateReminder({ id, title, dueAt, notes, priority } = {}) {
      if ([title, dueAt, notes, priority].every((value) => value === undefined)) {
        throw new Error('provide at least one editable field');
      }
      const args = mutationArgs({ id }, { id: 'id', operation: 'update' });
      if (title !== undefined) args.title = textOrUndefined(title, 'title');
      if (dueAt !== undefined) args.dueAt = dueAt ? normalizedDate(dueAt, 'dueAt').toISOString() : null;
      if (notes !== undefined) args.notes = String(notes);
      if (priority !== undefined) args.priority = Number(priority) || 0;
      return parseJson(await runScript(REMINDERS_MUTATION_SCRIPT, args), 'Reminders');
    },

    async completeReminder({ id } = {}) {
      const args = mutationArgs({ id }, { id: 'id', operation: 'complete' });
      return parseJson(await runScript(REMINDERS_MUTATION_SCRIPT, args), 'Reminders');
    },

    async deleteReminder({ id } = {}) {
      const args = mutationArgs({ id }, { id: 'id', operation: 'delete' });
      return parseJson(await runScript(REMINDERS_MUTATION_SCRIPT, args), 'Reminders');
    }
  };
}
