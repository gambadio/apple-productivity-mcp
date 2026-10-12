# Tool reference

Generated from the MCP `tools/list` response. Run `npm run docs:tools` after changing schemas.

133 tools are registered by default; `apple_shortcuts_run` is an additional opt-in tool. App groups and read-only mode can reduce the list. File tools require configured roots when called.

## mail

### `apple_mail_list_accounts`

Read-only: list local Apple Mail account names, sender addresses, and mailbox names. Use this before other Mail tools when the exact names are unknown.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_list`

Read-only: list local Apple Mail metadata. Returns message ID, sender, subject, received time, and read/flag status. It does not read message bodies.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "mailbox": {
      "default": "INBOX",
      "description": "Mailbox name, normally INBOX.",
      "type": "string",
      "minLength": 1
    },
    "limit": {
      "default": 20,
      "description": "Maximum messages to return.",
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_get`

Read-only: read one local Apple Mail message, including its body. Use apple_mail_list first to obtain the local mail id.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "mailbox": {
      "default": "INBOX",
      "description": "Mailbox name, normally INBOX.",
      "type": "string",
      "minLength": 1
    },
    "mailId": {
      "type": "string",
      "minLength": 1,
      "description": "Local Mail message id returned by apple_mail_list."
    }
  },
  "required": [
    "mailId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_send`

Send an Apple Mail message from the selected local account. This immediately sends email to the specified recipients.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "to": {
      "minItems": 1,
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      },
      "description": "Primary recipients."
    },
    "cc": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      }
    },
    "bcc": {
      "default": [],
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      }
    },
    "subject": {
      "type": "string",
      "minLength": 1
    },
    "body": {
      "default": "",
      "type": "string"
    }
  },
  "required": [
    "to",
    "subject"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_update_status`

Modify a local Apple Mail message read/unread and/or flagged status.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "mailbox": {
      "default": "INBOX",
      "description": "Mailbox name, normally INBOX.",
      "type": "string",
      "minLength": 1
    },
    "mailId": {
      "type": "string",
      "minLength": 1,
      "description": "Local Mail message id returned by apple_mail_list."
    },
    "isRead": {
      "type": "boolean"
    },
    "isFlagged": {
      "type": "boolean"
    }
  },
  "required": [
    "mailId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_move`

Move a local Apple Mail message to another mailbox in the same account.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "mailbox": {
      "default": "INBOX",
      "description": "Mailbox name, normally INBOX.",
      "type": "string",
      "minLength": 1
    },
    "mailId": {
      "type": "string",
      "minLength": 1,
      "description": "Local Mail message id returned by apple_mail_list."
    },
    "targetMailbox": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "mailId",
    "targetMailbox"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_delete`

Delete a local Apple Mail message. This is destructive and moves the message according to Mail.app deletion behavior.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "description": "Apple Mail account name.",
      "type": "string",
      "minLength": 1
    },
    "mailbox": {
      "default": "INBOX",
      "description": "Mailbox name, normally INBOX.",
      "type": "string",
      "minLength": 1
    },
    "mailId": {
      "type": "string",
      "minLength": 1,
      "description": "Local Mail message id returned by apple_mail_list."
    }
  },
  "required": [
    "mailId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_search`

Read-only: search a mailbox by subject or sender; returns bounded metadata without bodies.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mailbox": {
      "default": "INBOX",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "field": {
      "default": "subject",
      "type": "string",
      "enum": [
        "subject",
        "sender"
      ]
    },
    "limit": {
      "default": 50,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_create_draft`

Create a visible outgoing Mail draft. Does not send; Mail controls draft persistence.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "to": {
      "default": [],
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      }
    },
    "cc": {
      "default": [],
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      }
    },
    "bcc": {
      "default": [],
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "format": "email",
        "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
      }
    },
    "subject": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "body": {
      "default": "",
      "type": "string",
      "maxLength": 200000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_create_mailbox`

Create a mailbox in the selected Mail account.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_list_attachments`

Read-only: list attachment metadata for one message.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mailbox": {
      "default": "INBOX",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mailId": {
      "type": "string",
      "pattern": "^\\d+$"
    }
  },
  "required": [
    "mailId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_mail_save_attachment`

Save one attachment to a new file under APPLE_MCP_FILE_ROOTS. Existing paths are refused.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "account": {
      "default": "iCloud",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mailbox": {
      "default": "INBOX",
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mailId": {
      "type": "string",
      "pattern": "^\\d+$"
    },
    "index": {
      "type": "integer",
      "minimum": 0,
      "maximum": 1000
    },
    "path": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "mailId",
    "index",
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## calendar

### `apple_calendar_list_calendars`

Read-only: list local Calendar.app calendar names and whether each calendar is writable. Use this before creating or modifying events when the exact calendar name is unknown.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_list_events`

Read-only: list local Calendar.app events in a time range.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "start": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      "description": "Inclusive ISO 8601 start date/time."
    },
    "end": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$",
      "description": "Inclusive ISO 8601 end date/time; must be after start."
    },
    "calendars": {
      "default": [],
      "description": "Optional calendar-name allowlist. Empty means all calendars.",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "limit": {
      "default": 50,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "start",
    "end"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_create_event`

Create a new local Calendar.app event.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "description": "Calendar name."
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "start": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
    },
    "end": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
    },
    "allDay": {
      "default": false,
      "type": "boolean"
    },
    "location": {
      "default": "",
      "type": "string"
    },
    "notes": {
      "default": "",
      "type": "string"
    }
  },
  "required": [
    "calendar",
    "title",
    "start",
    "end"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_update_event`

Modify an existing local Calendar.app event. Obtain the uid from apple_calendar_list_events.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "description": "Calendar name."
    },
    "uid": {
      "type": "string",
      "minLength": 1
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "start": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
    },
    "end": {
      "type": "string",
      "format": "date-time",
      "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
    },
    "allDay": {
      "type": "boolean"
    },
    "location": {
      "type": "string"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "calendar",
    "uid"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_delete_event`

Delete an existing local Calendar.app event. This is destructive.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "description": "Calendar name."
    },
    "uid": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "calendar",
    "uid"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_create_calendar`

Create a Calendar.app calendar using the app default account.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "description": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_rename_calendar`

Rename a uniquely named writable calendar.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "calendar",
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_delete_calendar`

Delete a uniquely named writable calendar and all its events. Destructive.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "calendar"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_get_event`

Read-only: get event notes, recurrence, URL, attendees, and display alarms.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "calendar",
    "uid"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_add_alarm`

Add a display alarm to an event. Negative minutes means before the event.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "minutes": {
      "type": "integer",
      "minimum": -525600,
      "maximum": 525600
    }
  },
  "required": [
    "calendar",
    "uid",
    "minutes"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_set_recurrence`

Set an event recurrence rule (for example FREQ=WEEKLY;COUNT=5); empty string clears recurrence. Calendar validates the rule.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "recurrence": {
      "type": "string",
      "maxLength": 2048
    }
  },
  "required": [
    "calendar",
    "uid",
    "recurrence"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_calendar_set_url`

Set or clear an event HTTP/HTTPS URL.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "calendar": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "uid": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "url": {
      "anyOf": [
        {
          "type": "string",
          "const": ""
        },
        {
          "type": "string",
          "format": "uri"
        }
      ]
    }
  },
  "required": [
    "calendar",
    "uid",
    "url"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## reminders

### `apple_reminders_list_lists`

Read-only: list local Apple Reminders list names and IDs. Use this before creating reminders when the exact list name is unknown.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_list`

Read-only: list local Apple Reminders.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "lists": {
      "default": [],
      "description": "Optional reminder-list allowlist. Empty means all lists.",
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "includeCompleted": {
      "default": false,
      "type": "boolean"
    },
    "limit": {
      "default": 50,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_create`

Create a local Apple Reminder.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "list": {
      "type": "string",
      "minLength": 1
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "dueAt": {
      "default": null,
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
        },
        {
          "type": "null"
        }
      ]
    },
    "notes": {
      "default": "",
      "type": "string"
    },
    "priority": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 9
    }
  },
  "required": [
    "list",
    "title"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_update`

Modify an existing local Apple Reminder.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Reminder id returned by apple_reminders_list."
    },
    "title": {
      "type": "string",
      "minLength": 1
    },
    "dueAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
        },
        {
          "type": "null"
        }
      ]
    },
    "notes": {
      "type": "string"
    },
    "priority": {
      "type": "integer",
      "minimum": 0,
      "maximum": 9
    }
  },
  "required": [
    "id"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_complete`

Mark an existing local Apple Reminder as completed.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Reminder id returned by apple_reminders_list."
    }
  },
  "required": [
    "id"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_delete`

Delete an existing local Apple Reminder. This is destructive.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "description": "Reminder id returned by apple_reminders_list."
    }
  },
  "required": [
    "id"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_list_accounts`

Read-only: list Reminders account IDs and names.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_create_list`

Create a Reminders list in an exact account ID.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "accountId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "accountId",
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_rename_list`

Rename a Reminders list by ID.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "id",
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_delete_list`

Delete a Reminders list and its reminders. Destructive; may sync to iCloud.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "id"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_get`

Read-only: get reminder notes, completion, due time, alarm, priority, and flag.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "id"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_search`

Read-only: search reminder titles within selected lists.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "lists": {
      "default": [],
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "includeCompleted": {
      "default": false,
      "type": "boolean"
    },
    "limit": {
      "default": 50,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_set_completed`

Set a reminder completion state, including reopening a completed reminder.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "completed": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "completed"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_set_flagged`

Set or clear a reminder flag.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "flagged": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "flagged"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_reminders_set_alarm`

Set or clear a reminder notification date.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "remindAt": {
      "anyOf": [
        {
          "type": "string",
          "format": "date-time",
          "pattern": "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "required": [
    "id",
    "remindAt"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## pages

### `apple_pages_list_documents`

List open Pages documents. Does not launch a stopped application.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_open`

Open a local Pages document. Launches the app and may show its window or import dialogs.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_create`

Create an unsaved Pages document. May show a window. Use the returned name for subsequent operations; save explicitly.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "templateName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "text": {
      "description": "Optional initial body text; omitting preserves the selected template body.",
      "type": "string",
      "maxLength": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_save`

Save Pages to a .pages path with an existing parent directory. Existing paths, including the current document path, require overwrite:true. TextEdit saves RTF; no implicit format conversion.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_close`

Close one Pages document. Refuses unsaved changes or a document without a saved path unless discardChanges:true; save separately to retain changes.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "discardChanges": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_export`

Export Pages to PDF or its supported Microsoft Office format. Requires an existing parent directory; existing destinations require overwrite:true. Large exports may exceed the automation timeout.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "format": {
      "type": "string",
      "enum": [
        "pdf",
        "docx"
      ]
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path",
    "format"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_read_text`

Read Pages plain text with character pagination. Pages supports word-processing body text only; rich formatting and text boxes are not returned.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000
    },
    "maxChars": {
      "default": 10000,
      "type": "integer",
      "minimum": 1,
      "maximum": 50000
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_pages_set_text`

Replace or append Pages plain text. This can remove existing rich formatting; changes may autosave and sync. Pages requires a word-processing document.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "text": {
      "type": "string",
      "maxLength": 100000
    },
    "mode": {
      "default": "replace",
      "type": "string",
      "enum": [
        "replace",
        "append"
      ]
    }
  },
  "required": [
    "documentName",
    "text"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## numbers

### `apple_numbers_list_documents`

List open Numbers documents. Does not launch a stopped application.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_open`

Open a local Numbers document. Launches the app and may show its window or import dialogs.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_create`

Create an unsaved Numbers document. May show a window. Use the returned name for subsequent operations; save explicitly.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "templateName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_save`

Save Numbers to a .numbers path with an existing parent directory. Existing paths, including the current document path, require overwrite:true. TextEdit saves RTF; no implicit format conversion.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_close`

Close one Numbers document. Refuses unsaved changes or a document without a saved path unless discardChanges:true; save separately to retain changes.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "discardChanges": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_export`

Export Numbers to PDF or its supported Microsoft Office format. Requires an existing parent directory; existing destinations require overwrite:true. Large exports may exceed the automation timeout.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "format": {
      "type": "string",
      "enum": [
        "pdf",
        "xlsx"
      ]
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path",
    "format"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_list_sheets`

List sheets in an open Numbers spreadsheet.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_list_tables`

List table names and dimensions in a Numbers sheet.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "sheetName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "documentName",
    "sheetName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_create_table`

Add a named table without header or footer rows to a Numbers sheet. Rejects duplicate table names.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "sheetName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "tableName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "rows": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "columns": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "required": [
    "documentName",
    "sheetName",
    "tableName",
    "rows",
    "columns"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_read_range`

Read values, formatted text and formulas from a rectangular Numbers range, using 1-based row and column indexes. Maximum 200 cells; strings are truncated to 500 characters per field.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "sheetName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "tableName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "startRow": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "startColumn": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "rows": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
    },
    "columns": {
      "type": "integer",
      "minimum": 1,
      "maximum": 200
    }
  },
  "required": [
    "documentName",
    "sheetName",
    "tableName",
    "startRow",
    "startColumn",
    "rows",
    "columns"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_numbers_write_range`

Write a rectangular grid to existing Numbers cells using 1-based indexes. null clears a cell. Formula strings require allowFormulas:true. Bounds are checked before writing; an application failure may leave partial changes. May autosave and sync.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "sheetName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "tableName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "startRow": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000000
    },
    "startColumn": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "values": {
      "minItems": 1,
      "maxItems": 500,
      "type": "array",
      "items": {
        "minItems": 1,
        "maxItems": 500,
        "type": "array",
        "items": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 10000
            },
            {
              "type": "number"
            },
            {
              "type": "boolean"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "allowFormulas": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "sheetName",
    "tableName",
    "startRow",
    "startColumn",
    "values"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## keynote

### `apple_keynote_list_documents`

List open Keynote documents. Does not launch a stopped application.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_open`

Open a local Keynote document. Launches the app and may show its window or import dialogs.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_create`

Create an unsaved Keynote document. May show a window. Use the returned name for subsequent operations; save explicitly.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "themeName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_save`

Save Keynote to a .key path with an existing parent directory. Existing paths, including the current document path, require overwrite:true. TextEdit saves RTF; no implicit format conversion.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_close`

Close one Keynote document. Refuses unsaved changes or a document without a saved path unless discardChanges:true; save separately to retain changes.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "discardChanges": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_export`

Export Keynote to PDF or its supported Microsoft Office format. Requires an existing parent directory; existing destinations require overwrite:true. Large exports may exceed the automation timeout.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "format": {
      "type": "string",
      "enum": [
        "pdf",
        "pptx"
      ]
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path",
    "format"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_list_slides`

Read slide indexes, default title/body text, presenter notes and skipped status. Does not extract other text boxes, charts, images, or media. Returned text is bounded.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 10,
      "type": "integer",
      "minimum": 1,
      "maximum": 20
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_add_slide`

Append a Keynote slide, optionally using an exact master-slide layout name, and set its default title/body, presenter notes and skipped status. Changes may autosave and sync.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "layoutName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "title": {
      "type": "string",
      "maxLength": 10000
    },
    "body": {
      "type": "string",
      "maxLength": 50000
    },
    "presenterNotes": {
      "type": "string",
      "maxLength": 50000
    },
    "skipped": {
      "type": "boolean"
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_keynote_update_slide`

Update default title/body, presenter notes or skipped status of a Keynote slide using its current 1-based index. List slides immediately before modifying; changes may autosave and sync.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "slideIndex": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100000
    },
    "title": {
      "type": "string",
      "maxLength": 10000
    },
    "body": {
      "type": "string",
      "maxLength": 50000
    },
    "presenterNotes": {
      "type": "string",
      "maxLength": 50000
    },
    "skipped": {
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "slideIndex"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## textedit

### `apple_textedit_list_documents`

List open TextEdit documents. Does not launch a stopped application.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_open`

Open a local TextEdit document. Launches the app and may show its window or import dialogs.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_create`

Create an unsaved TextEdit document. May show a window. Use the returned name for subsequent operations; save explicitly.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "text": {
      "default": "",
      "type": "string",
      "maxLength": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_save`

Save TextEdit to a .rtf path with an existing parent directory. Existing paths, including the current document path, require overwrite:true. TextEdit saves RTF; no implicit format conversion.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "path": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName",
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_close`

Close one TextEdit document. Refuses unsaved changes or a document without a saved path unless discardChanges:true; save separately to retain changes.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "discardChanges": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_read_text`

Read TextEdit plain text with character pagination. Pages supports word-processing body text only; rich formatting and text boxes are not returned.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000000
    },
    "maxChars": {
      "default": 10000,
      "type": "integer",
      "minimum": 1,
      "maximum": 50000
    }
  },
  "required": [
    "documentName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_textedit_set_text`

Replace or append TextEdit plain text. This can remove existing rich formatting; changes may autosave and sync. Pages requires a word-processing document.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "documentName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024,
      "description": "Exact name returned by list_documents; ambiguous duplicate names are rejected."
    },
    "text": {
      "type": "string",
      "maxLength": 100000
    },
    "mode": {
      "default": "replace",
      "type": "string",
      "enum": [
        "replace",
        "append"
      ]
    }
  },
  "required": [
    "documentName",
    "text"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## notes

### `apple_notes_list_accounts`

Read-only: list Notes account IDs and names.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_list_folders`

Read-only: list Notes folder IDs and names, optionally within one account.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "accountId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_list`

Read-only: list note metadata without reading note bodies, optionally within a folder.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "folderId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_search`

Read-only: find Notes by title substring; this does not search note bodies.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "folderId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_get`

Read-only: get note metadata and bounded plain text or HTML. Locked notes return metadata only.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "noteId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "format": {
      "default": "text",
      "type": "string",
      "enum": [
        "text",
        "html"
      ]
    },
    "maxChars": {
      "default": 20000,
      "type": "integer",
      "minimum": 1,
      "maximum": 200000
    }
  },
  "required": [
    "noteId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_create`

Create a note in an explicit folder, with an escaped title heading and optional HTML body. May sync to iCloud.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "folderId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "htmlBody": {
      "default": "",
      "type": "string",
      "maxLength": 200000
    }
  },
  "required": [
    "folderId",
    "title"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_update`

Change a note title and/or replace its entire HTML body. Replacing the body can remove formatting or attachments; locked notes are rejected.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "noteId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "htmlBody": {
      "type": "string",
      "maxLength": 200000
    }
  },
  "required": [
    "noteId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_delete`

Delete an unlocked note using Notes deletion behavior. May sync deletion to other devices.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "noteId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "noteId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_notes_create_folder`

Create a top-level Notes folder in an explicit account.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "accountId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "accountId",
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## contacts

### `apple_contacts_search`

Read-only: find contacts by name or organization substring. Returns summaries, not all contact details.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_get`

Read-only: get one contact with names, organization, emails, phones, and bounded notes.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "maxChars": {
      "default": 20000,
      "type": "integer",
      "minimum": 1,
      "maximum": 200000
    }
  },
  "required": [
    "contactId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_list_groups`

Read-only: list Contacts groups.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_list_group_members`

Read-only: list summaries of people in one Contacts group.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "groupId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "groupId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_create`

Create and save a contact, optionally with labeled emails and phone numbers. Refuses to run while Contacts has unsaved edits.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "lastName": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "organization": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "jobTitle": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "note": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "emails": {
      "default": [],
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "default": "home",
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "value": {
            "type": "string",
            "maxLength": 320,
            "format": "email",
            "pattern": "^(?:[A-Za-z0-9_'+\\-]+\\.)*[A-Za-z0-9_'+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
          }
        },
        "required": [
          "value"
        ],
        "additionalProperties": false
      }
    },
    "phones": {
      "default": [],
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label": {
            "default": "mobile",
            "type": "string",
            "minLength": 1,
            "maxLength": 500
          },
          "value": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          }
        },
        "required": [
          "value"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "firstName"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_update`

Update and save selected name, organization, job title, or note fields. Leaves phone and email collections unchanged. Refuses pending unsaved Contacts edits.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "firstName": {
      "type": "string",
      "maxLength": 10000
    },
    "lastName": {
      "type": "string",
      "maxLength": 10000
    },
    "organization": {
      "type": "string",
      "maxLength": 10000
    },
    "jobTitle": {
      "type": "string",
      "maxLength": 10000
    },
    "note": {
      "type": "string",
      "maxLength": 10000
    }
  },
  "required": [
    "contactId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_create_group`

Create and save a Contacts group. Refuses pending unsaved Contacts edits.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_add_to_group`

Add an existing contact to a group and save Contacts changes.

Read-only: **false** · Destructive: **false** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "groupId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "contactId",
    "groupId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_contacts_remove_from_group`

Remove a contact from a group without deleting the contact; saves Contacts changes.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "contactId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "groupId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "contactId",
    "groupId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## safari

### `apple_safari_list_tabs`

Read-only: list Safari tab titles, URLs, window IDs, and one-based tab indices. Tab indices change when tabs close.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_safari_get_tab`

Read-only: read one Safari tab title and URL, with optional bounded page text using Safari scripting. Does not execute page JavaScript.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "windowId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "tabIndex": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10000
    },
    "includeText": {
      "default": false,
      "type": "boolean"
    },
    "maxChars": {
      "default": 20000,
      "type": "integer",
      "minimum": 1,
      "maximum": 200000
    }
  },
  "required": [
    "windowId",
    "tabIndex"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_safari_open_tab`

Open an HTTP(S) URL in a new Safari tab. This loads the URL and can contact a remote website.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "maxLength": 10000,
      "format": "uri"
    },
    "windowId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "activate": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "url"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_safari_navigate_tab`

Navigate one Safari tab to an HTTP(S) URL. Requires its previously observed URL to avoid modifying a different tab after indices shift.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "windowId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "tabIndex": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10000
    },
    "expectedUrl": {
      "type": "string",
      "maxLength": 10000
    },
    "url": {
      "type": "string",
      "maxLength": 10000,
      "format": "uri"
    }
  },
  "required": [
    "windowId",
    "tabIndex",
    "expectedUrl",
    "url"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_safari_close_tab`

Close a Safari tab; unsaved page input may be lost. Requires its previously observed URL.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "windowId": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "tabIndex": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10000
    },
    "expectedUrl": {
      "type": "string",
      "maxLength": 10000
    }
  },
  "required": [
    "windowId",
    "tabIndex",
    "expectedUrl"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_safari_add_reading_list`

Add an HTTP(S) URL, optional title, and preview to Safari Reading List; may sync through iCloud.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "url": {
      "type": "string",
      "maxLength": 10000,
      "format": "uri"
    },
    "title": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    },
    "preview": {
      "default": "",
      "type": "string",
      "maxLength": 10000
    }
  },
  "required": [
    "url"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## music

### `apple_music_list_playlists`

Read-only: list Music playlist persistent IDs, names, and kinds.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_list_tracks`

Read-only: list Music library or playlist track metadata; IDs are persistent hexadecimal IDs.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "playlistId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_search`

Read-only: search an explicit Music playlist. Use list_playlists to identify the library playlist.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "playlistId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "only": {
      "default": "all",
      "type": "string",
      "enum": [
        "all",
        "artists",
        "albums",
        "composers",
        "names"
      ]
    }
  },
  "required": [
    "playlistId",
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_get_track`

Read-only: get one Music library track by persistent ID.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "trackId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "trackId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_get_playback_state`

Read-only: get Music playback state, volume, position, and current track when playing or paused.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_playback`

Control Music playback: play/resume, pause, stop, next, or previous. Play optionally targets one track or playlist. Playback can stream audio.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": [
        "play",
        "pause",
        "stop",
        "next",
        "previous"
      ]
    },
    "trackId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "playlistId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "action"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_set_volume`

Set Music playback volume from 0 to 100.

Read-only: **false** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "volume": {
      "type": "integer",
      "minimum": 0,
      "maximum": 100
    }
  },
  "required": [
    "volume"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_create_playlist`

Create a new user playlist in Music. May sync through the music library.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_music_add_tracks_to_playlist`

Copy existing library tracks into a regular user playlist. Rejects smart and special playlists. Repeating may add duplicates.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "playlistId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "trackIds": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    }
  },
  "required": [
    "playlistId",
    "trackIds"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## photos

### `apple_photos_list_albums`

Read-only: list Photos album IDs and names.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_list`

Read-only: list Photos library or album media metadata without exporting image data.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "albumId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_search`

Read-only: search Photos using its native search command; returns bounded metadata results.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_get`

Read-only: get one Photos media item with metadata, keywords, and bounded description.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "mediaId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "maxChars": {
      "default": 20000,
      "type": "integer",
      "minimum": 1,
      "maximum": 200000
    }
  },
  "required": [
    "mediaId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_create_album`

Create a new top-level Photos album.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_add_to_album`

Add existing Photos media items to an album. Does not import or delete files.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "albumId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "mediaIds": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    }
  },
  "required": [
    "albumId",
    "mediaIds"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_import`

Import existing local files into Photos, optionally into an album. Duplicate checking remains enabled; imported media may upload to iCloud Photos.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "paths": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 2,
        "maxLength": 4096
      }
    },
    "albumId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "required": [
    "paths"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_export`

Export selected Photos media into an existing empty local directory. Requires an empty directory to reduce overwrite risk; originals can trigger iCloud downloads. Exports originals or rendered JPEGs.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "mediaIds": {
      "minItems": 1,
      "maxItems": 20,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "directory": {
      "type": "string",
      "minLength": 2,
      "maxLength": 4096
    },
    "originals": {
      "default": true,
      "type": "boolean"
    }
  },
  "required": [
    "mediaIds",
    "directory"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_photos_update`

Update a Photos media title, description, favorite flag, and/or replace its keyword list. May sync through iCloud Photos.

Read-only: **false** · Destructive: **true** · Idempotent: **true** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "mediaId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "name": {
      "type": "string",
      "maxLength": 10000
    },
    "description": {
      "type": "string",
      "maxLength": 10000
    },
    "favorite": {
      "type": "boolean"
    },
    "keywords": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      }
    }
  },
  "required": [
    "mediaId"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## messages

### `apple_messages_list_accounts`

Read-only: list Messages accounts (also called services), IDs, service types, and connection states. serviceType is null if macOS does not expose it.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_messages_list_chats`

Read-only: list Messages chat metadata and participant handles. Apple scripting does not expose message history.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 20,
      "type": "integer",
      "minimum": 1,
      "maximum": 100
    },
    "offset": {
      "default": 0,
      "type": "integer",
      "minimum": 0,
      "maximum": 100000
    },
    "accountId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_messages_send`

Immediately send text to one explicit phone number or email through a selected connected Messages account. This is a real outgoing message; success means submitted, not delivered.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "accountId": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "recipient": {
      "type": "string",
      "maxLength": 320
    },
    "text": {
      "type": "string",
      "minLength": 1,
      "maxLength": 20000
    }
  },
  "required": [
    "accountId",
    "recipient",
    "text"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## system

### `apple_system_capabilities`

Read-only: discover installed Apple apps, platform, file roots, and allowed Shortcuts. Does not test Automation permission.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_system_open_app`

Launch or activate a supported Apple app.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "app": {
      "type": "string",
      "enum": [
        "Mail",
        "Calendar",
        "Reminders",
        "Notes",
        "Contacts",
        "Safari",
        "Pages",
        "Numbers",
        "Keynote",
        "TextEdit",
        "Music",
        "Photos",
        "Messages",
        "Shortcuts",
        "Finder",
        "Preview",
        "Maps",
        "Books",
        "Home",
        "Freeform",
        "TV",
        "Podcasts",
        "QuickTime"
      ]
    }
  },
  "required": [
    "app"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## files

### `apple_files_list`

Read-only: list one allowed folder. Bounded, non-recursive; hidden entries excluded by default.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    },
    "limit": {
      "default": 100,
      "type": "integer",
      "minimum": 1,
      "maximum": 500
    },
    "includeHidden": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_info`

Read-only: file/folder metadata within allowed roots.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_read_text`

Read-only: read bounded UTF-8 text from an allowed regular file. Does not parse Pages, PDF, or other binary formats.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    },
    "maxBytes": {
      "default": 65536,
      "type": "integer",
      "minimum": 1,
      "maximum": 1048576
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_write_text`

Create a UTF-8 file in an allowed folder. Existing files require overwrite=true.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    },
    "text": {
      "type": "string",
      "maxLength": 1048576
    },
    "overwrite": {
      "default": false,
      "type": "boolean"
    }
  },
  "required": [
    "path",
    "text"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_create_folder`

Create one new folder under an existing allowed folder.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_copy`

Copy one regular file within allowed roots. Never overwrites a destination.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    },
    "destination": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "source",
    "destination"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_search`

Read-only: Spotlight filename search within one allowed folder. Results depend on local Spotlight indexing.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    },
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    },
    "limit": {
      "default": 100,
      "type": "integer",
      "minimum": 1,
      "maximum": 500
    }
  },
  "required": [
    "path",
    "query"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_files_trash`

Move an allowed file or folder to Finder Trash. Symbolic links are refused to avoid deleting their targets. May sync deletions through iCloud. Never empties Trash.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## finder

### `apple_finder_reveal`

Reveal an allowed file or folder in Finder.

Read-only: **false** · Destructive: **false** · Idempotent: **false** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "path"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_finder_selection`

Read-only: get selected Finder items (names and URLs). Does not read contents.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "limit": {
      "default": 100,
      "type": "integer",
      "minimum": 1,
      "maximum": 500
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## shortcuts

### `apple_shortcuts_list`

Read-only: list installed Shortcuts, optionally in one folder.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {
    "folder": {
      "type": "string",
      "minLength": 1,
      "maxLength": 256
    }
  },
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_shortcuts_list_folders`

Read-only: list Shortcuts folders.

Read-only: **true** · Destructive: **false** · Idempotent: **true** · Open-world: **false**

```json
{
  "type": "object",
  "properties": {},
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

### `apple_shortcuts_run`

Run an explicitly allowlisted shortcut. It can modify files, send messages, or control other apps; inspect the shortcut before allowing it. Timeout does not guarantee its effects stop.

Read-only: **false** · Destructive: **true** · Idempotent: **false** · Open-world: **true**

```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "enum": [
        "Example allowlisted shortcut"
      ]
    },
    "inputPath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 4096
    }
  },
  "required": [
    "name"
  ],
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

