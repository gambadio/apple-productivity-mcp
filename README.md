# Apple Productivity Local MCP

A local Model Context Protocol (MCP) server for Claude Code on macOS. It connects Claude Code to Apple Mail, Calendar, and Reminders through macOS automation APIs.

## Privacy and architecture

- The server uses stdio: it is started by Claude Code only when a tool call is needed and stops when the Claude Code session releases it.
- It does not expose an HTTP port or background daemon.
- It does not include credentials, API keys, or user data in this repository.
- Data is read from the local Apple apps via `osascript`. Any data returned to Claude Code is then available to the active Claude Code session, so use it only with a trusted local Claude Code installation.
- Mail, Calendar, and Reminders changes may sync through iCloud, CalDAV, Exchange, or another account provider; "local" describes where the MCP runs, not where Apple stores or synchronizes the resulting data.

## Tools

### Mail

- `apple_mail_list` - list message metadata
- `apple_mail_get` - read one message, including its body
- `apple_mail_send` - send a message
- `apple_mail_update_status` - mark read/unread or flag/unflag
- `apple_mail_move` - move a message
- `apple_mail_delete` - delete a message

### Calendar

- `apple_calendar_list_events` - list events in a time range
- `apple_calendar_create_event` - create an event
- `apple_calendar_update_event` - update an event
- `apple_calendar_delete_event` - delete an event

### Reminders

- `apple_reminders_list` - list reminders
- `apple_reminders_create` - create a reminder
- `apple_reminders_update` - update a reminder
- `apple_reminders_complete` - complete a reminder
- `apple_reminders_delete` - delete a reminder

Destructive and external actions are intentionally named and described explicitly so Claude Code can ask for confirmation according to its permission settings.

## Requirements

- macOS with Apple Mail, Calendar, and Reminders
- Node.js 20+
- Claude Code

Grant macOS Automation access to the application that launches Claude Code (for example, Terminal, iTerm, or Claude Code) under **System Settings > Privacy & Security > Automation**. Enable Mail, Calendar, and Reminders when prompted.

## Install in Claude Code

```bash
claude mcp add --scope user apple-productivity-local -- \
  /usr/local/bin/node /absolute/path/to/apple-productivity-mcp/src/index.js
```

Verify the connection:

```bash
claude mcp get apple-productivity-local
```

Remove it again:

```bash
claude mcp remove apple-productivity-local -s user
```

## Development

```bash
npm install
npm test
```

Run macOS integration tests after granting Automation permissions:

```bash
npm run test:integration
```

The default test run skips those integration tests because they access the user's live Apple applications.

## License

MIT. See [LICENSE](LICENSE).
