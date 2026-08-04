#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createAppleClient } from './apple-client.js';

const apple = createAppleClient();
const server = new McpServer(
  { name: 'apple-productivity-local', version: '2.1.0' },
  {
    instructions:
      'This server controls the user\'s local Apple Mail, Calendar, and Reminders apps. Use the discovery tools when exact account, mailbox, calendar, or list names are unknown. Treat sends, moves, updates, completions, and deletions as real external actions that may sync to other devices or providers.'
  }
);

function asToolResult(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function asToolError(error) {
  return {
    content: [{ type: 'text', text: `Apple automation error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true
  };
}

function useApple(action) {
  return async (input) => {
    try {
      return asToolResult(await action(input));
    } catch (error) {
      return asToolError(error);
    }
  };
}

const READ_ONLY_TOOLS = new Set([
  'apple_mail_list_accounts',
  'apple_mail_list',
  'apple_mail_get',
  'apple_calendar_list_calendars',
  'apple_calendar_list_events',
  'apple_reminders_list_lists',
  'apple_reminders_list'
]);
const DESTRUCTIVE_TOOLS = new Set([
  'apple_mail_update_status',
  'apple_mail_move',
  'apple_mail_delete',
  'apple_calendar_update_event',
  'apple_calendar_delete_event',
  'apple_reminders_update',
  'apple_reminders_complete',
  'apple_reminders_delete'
]);
const IDEMPOTENT_TOOLS = new Set([
  'apple_mail_update_status',
  'apple_calendar_update_event',
  'apple_reminders_update',
  'apple_reminders_complete'
]);

function annotationsFor(name) {
  if (READ_ONLY_TOOLS.has(name)) {
    return { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  }
  if (name === 'apple_mail_send') {
    return { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true };
  }
  return {
    readOnlyHint: false,
    destructiveHint: DESTRUCTIVE_TOOLS.has(name),
    idempotentHint: IDEMPOTENT_TOOLS.has(name),
    // Mail, Calendar, and Reminders may sync through iCloud, CalDAV, Exchange, or another provider.
    openWorldHint: true
  };
}

function registerTool(name, description, inputSchema, action) {
  return server.registerTool(
    name,
    { description, inputSchema, annotations: annotationsFor(name) },
    action
  );
}

const account = z.string().min(1).default('iCloud').describe('Apple Mail account name.');
const mailbox = z.string().min(1).default('INBOX').describe('Mailbox name, normally INBOX.');
const mailId = z.string().min(1).describe('Local Mail message id returned by apple_mail_list.');
const limit = z.number().int().min(1).max(100);
const isoDate = z.string().datetime({ offset: true });
const calendar = z.string().min(1).describe('Calendar name.');
const reminderId = z.string().min(1).describe('Reminder id returned by apple_reminders_list.');

registerTool(
  'apple_mail_list_accounts',
  'Read-only: list local Apple Mail account names, sender addresses, and mailbox names. Use this before other Mail tools when the exact names are unknown.',
  {},
  useApple(() => apple.listMailAccounts())
);

registerTool(
  'apple_mail_list',
  'Read-only: list local Apple Mail metadata. Returns message ID, sender, subject, received time, and read/flag status. It does not read message bodies.',
  { account, mailbox, limit: limit.default(20).describe('Maximum messages to return.') },
  useApple((input) => apple.listMail(input))
);

registerTool(
  'apple_mail_get',
  'Read-only: read one local Apple Mail message, including its body. Use apple_mail_list first to obtain the local mail id.',
  { account, mailbox, mailId },
  useApple((input) => apple.getMail(input))
);

registerTool(
  'apple_mail_send',
  'Send an Apple Mail message from the selected local account. This immediately sends email to the specified recipients.',
  {
    account,
    to: z.array(z.string().email()).min(1).describe('Primary recipients.'),
    cc: z.array(z.string().email()).default([]),
    bcc: z.array(z.string().email()).default([]),
    subject: z.string().min(1),
    body: z.string().default('')
  },
  useApple((input) => apple.sendMail(input))
);

registerTool(
  'apple_mail_update_status',
  'Modify a local Apple Mail message read/unread and/or flagged status.',
  { account, mailbox, mailId, isRead: z.boolean().optional(), isFlagged: z.boolean().optional() },
  useApple((input) => apple.updateMailStatus(input))
);

registerTool(
  'apple_mail_move',
  'Move a local Apple Mail message to another mailbox in the same account.',
  { account, mailbox, mailId, targetMailbox: z.string().min(1) },
  useApple((input) => apple.moveMail(input))
);

registerTool(
  'apple_mail_delete',
  'Delete a local Apple Mail message. This is destructive and moves the message according to Mail.app deletion behavior.',
  { account, mailbox, mailId },
  useApple((input) => apple.deleteMail(input))
);

registerTool(
  'apple_calendar_list_calendars',
  'Read-only: list local Calendar.app calendar names and whether each calendar is writable. Use this before creating or modifying events when the exact calendar name is unknown.',
  {},
  useApple(() => apple.listCalendars())
);

registerTool(
  'apple_calendar_list_events',
  'Read-only: list local Calendar.app events in a time range.',
  {
    start: isoDate.describe('Inclusive ISO 8601 start date/time.'),
    end: isoDate.describe('Inclusive ISO 8601 end date/time; must be after start.'),
    calendars: z.array(z.string()).default([]).describe('Optional calendar-name allowlist. Empty means all calendars.'),
    limit: limit.default(50)
  },
  useApple((input) => apple.listCalendarEvents(input))
);

registerTool(
  'apple_calendar_create_event',
  'Create a new local Calendar.app event.',
  {
    calendar,
    title: z.string().min(1),
    start: isoDate,
    end: isoDate,
    allDay: z.boolean().default(false),
    location: z.string().default(''),
    notes: z.string().default('')
  },
  useApple((input) => apple.createCalendarEvent(input))
);

registerTool(
  'apple_calendar_update_event',
  'Modify an existing local Calendar.app event. Obtain the uid from apple_calendar_list_events.',
  {
    calendar,
    uid: z.string().min(1),
    title: z.string().min(1).optional(),
    start: isoDate.optional(),
    end: isoDate.optional(),
    allDay: z.boolean().optional(),
    location: z.string().optional(),
    notes: z.string().optional()
  },
  useApple((input) => apple.updateCalendarEvent(input))
);

registerTool(
  'apple_calendar_delete_event',
  'Delete an existing local Calendar.app event. This is destructive.',
  { calendar, uid: z.string().min(1) },
  useApple((input) => apple.deleteCalendarEvent(input))
);

registerTool(
  'apple_reminders_list_lists',
  'Read-only: list local Apple Reminders list names and IDs. Use this before creating reminders when the exact list name is unknown.',
  {},
  useApple(() => apple.listReminderLists())
);

registerTool(
  'apple_reminders_list',
  'Read-only: list local Apple Reminders.',
  {
    lists: z.array(z.string()).default([]).describe('Optional reminder-list allowlist. Empty means all lists.'),
    includeCompleted: z.boolean().default(false),
    limit: limit.default(50)
  },
  useApple((input) => apple.listReminders(input))
);

registerTool(
  'apple_reminders_create',
  'Create a local Apple Reminder.',
  {
    list: z.string().min(1),
    title: z.string().min(1),
    dueAt: isoDate.nullable().default(null),
    notes: z.string().default(''),
    priority: z.number().int().min(0).max(9).default(0)
  },
  useApple((input) => apple.createReminder(input))
);

registerTool(
  'apple_reminders_update',
  'Modify an existing local Apple Reminder.',
  {
    id: reminderId,
    title: z.string().min(1).optional(),
    dueAt: isoDate.nullable().optional(),
    notes: z.string().optional(),
    priority: z.number().int().min(0).max(9).optional()
  },
  useApple((input) => apple.updateReminder(input))
);

registerTool(
  'apple_reminders_complete',
  'Mark an existing local Apple Reminder as completed.',
  { id: reminderId },
  useApple((input) => apple.completeReminder(input))
);

registerTool(
  'apple_reminders_delete',
  'Delete an existing local Apple Reminder. This is destructive.',
  { id: reminderId },
  useApple((input) => apple.deleteReminder(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);
