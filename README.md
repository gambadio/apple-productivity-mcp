# Apple Productivity MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![macOS](https://img.shields.io/badge/macOS-only-black.svg)](https://www.apple.com/macos/)
[![npm version](https://img.shields.io/npm/v/%40gambadio%2Fapple-productivity-mcp.svg)](https://www.npmjs.com/package/@gambadio/apple-productivity-mcp)

An on-demand, local [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that gives Claude Code and Codex controlled access to Apple Mail, Calendar, and Reminders on macOS.

It uses Apple's built-in automation interface through `/usr/bin/osascript`. The MCP transport is stdio: your MCP client starts the process when it connects and stops it when the session releases it. There is no listening port, background service, or cloud-hosted MCP server.

## Features

| App | Read and discover | Actions |
| --- | --- | --- |
| Mail | List accounts and mailboxes, list message metadata, read a message | Send, mark read/unread, flag/unflag, move, delete |
| Calendar | List calendars, list events in a time range | Create, update, delete |
| Reminders | List reminder lists, list reminders | Create, update, complete, delete |

The server publishes MCP tool annotations for read-only, idempotent, destructive, and open-world behavior. These annotations help compatible clients apply appropriate approval policies; they are not a substitute for reviewing a write action before approving it.

## Requirements

- macOS with Mail, Calendar, and Reminders
- Node.js 20 or newer
- Claude Code, Codex CLI/app/IDE extension, or another stdio-capable MCP client
- Permission for the client that launches the server to automate the relevant Apple apps

Check Node before installing:

```bash
node --version
```

## Install from npm

No clone or global installation is required. `npx` downloads and caches the package, and the MCP client launches it as a local stdio child process only when a session connects.

### Claude Code

```bash
claude mcp add --transport stdio --scope user apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
```

Verify the registration:

```bash
claude mcp get apple-productivity-local
claude mcp list
```

### Codex

```bash
codex mcp add apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
```

Verify the registration:

```bash
codex mcp get apple-productivity-local
codex mcp list
```

For a reproducible installation, replace `@latest` with a version such as `@2.1.1`.

## Install from source

Use a source checkout when developing the server or when you want to run a specific Git commit.

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/gambadio/apple-productivity-mcp.git
cd apple-productivity-mcp
npm ci
```

Capture the absolute paths that the MCP clients should store:

```bash
APPLE_MCP_NODE="$(command -v node)"
APPLE_MCP_SERVER="$(pwd)/src/index.js"
```

Paths containing spaces are supported. Keep the quotes in the commands below.

### Claude Code with a source checkout

Install the server for your user account:

```bash
claude mcp add --transport stdio --scope user apple-productivity-local -- \
  "$APPLE_MCP_NODE" "$APPLE_MCP_SERVER"
```

Verify the registration:

```bash
claude mcp get apple-productivity-local
claude mcp list
```

### Codex with a source checkout

Install the same local stdio server in Codex:

```bash
codex mcp add apple-productivity-local -- \
  "$APPLE_MCP_NODE" "$APPLE_MCP_SERVER"
```

Verify the registration:

```bash
codex mcp get apple-productivity-local
codex mcp list
```

Codex stores this in its user configuration, shared by the Codex app, CLI, and IDE extension on the same host. Start a new session after installation. If a desktop app or IDE extension was already open, restart it so it reloads the MCP configuration.

You do **not** need to run `npm start` or keep a terminal open. Claude Code or Codex launches the server as a child process when it establishes the MCP connection.

## Grant macOS permission

The first real tool call for each Apple app may trigger a macOS Automation prompt. Approve access for the application that launched the MCP server, such as Terminal, iTerm, Claude Code, Codex, or your IDE.

If you denied a prompt or no prompt appears:

1. Open **System Settings → Privacy & Security → Automation**.
2. Find the application that launches your MCP client.
3. Enable Mail, Calendar, and Reminders as needed.
4. Restart the MCP client and try again.

## Try it

Start with the discovery tools so the client learns the exact local names configured on your Mac:

- “List my Apple Mail accounts and mailboxes.”
- “List my writable Apple calendars.”
- “List my Apple Reminders lists.”
- “Show events from all calendars tomorrow.”
- “Show my incomplete reminders.”

Mail defaults to the account name `iCloud` and mailbox `INBOX` when a caller does not provide names. Use `apple_mail_list_accounts` first if your setup uses different names.

## Tool reference

### Mail

- `apple_mail_list_accounts` — list account names, sender addresses, and mailboxes
- `apple_mail_list` — list message metadata without reading bodies
- `apple_mail_get` — read one message, including its body
- `apple_mail_send` — send a message immediately
- `apple_mail_update_status` — mark read/unread or flag/unflag
- `apple_mail_move` — move a message to another mailbox in the same account
- `apple_mail_delete` — delete a message using Mail.app behavior

### Calendar

- `apple_calendar_list_calendars` — list calendar names and writable status
- `apple_calendar_list_events` — list overlapping events in an ISO 8601 time range
- `apple_calendar_create_event` — create an event
- `apple_calendar_update_event` — update an event by UID
- `apple_calendar_delete_event` — delete an event by UID

### Reminders

- `apple_reminders_list_lists` — list reminder-list names and IDs
- `apple_reminders_list` — list reminders, optionally including completed items
- `apple_reminders_create` — create a reminder
- `apple_reminders_update` — update a reminder by ID
- `apple_reminders_complete` — mark a reminder complete
- `apple_reminders_delete` — delete a reminder by ID

## Privacy and safety

- The MCP server itself has no network listener and stores no credentials or Apple data.
- Inputs are passed to `osascript` as JSON arguments rather than interpolated into executable JXA source.
- Mail, Calendar, and Reminders changes can sync through iCloud, CalDAV, Exchange, or another configured provider.
- “Local MCP” describes where the server runs. Content returned to Claude Code or Codex becomes part of that active model session and may be processed according to that product's data controls.
- Sending, moving, updating, completing, and deleting are real actions. Review write-tool requests before approving them.

## Update

Registrations using the npm command with `@latest` resolve the latest published version when a new MCP process starts. Start a new Claude Code or Codex session after a release. Pin an explicit version if automatic upgrades are not desirable.

For a source checkout, update in place so the stored absolute path remains valid:

```bash
cd /absolute/path/to/apple-productivity-mcp
git pull --ff-only
npm ci
npm test
```

## Remove

```bash
claude mcp remove apple-productivity-local --scope user
codex mcp remove apple-productivity-local
```

Removing the registration does not clear npm's cache, delete a cloned repository, or change Apple data.

## Development and verification

Install dependencies and run the isolated test suite:

```bash
npm ci
npm test
npm audit --omit=dev
```

Run the read-only live integration tests after granting Automation permission:

```bash
npm run test:integration
```

The default test run skips live integration tests because they access the user's installed Apple applications.

## Troubleshooting

### `Apple automation unavailable` or an authorization error

Review **System Settings → Privacy & Security → Automation**, enable the affected Apple app for the process that launches your MCP client, then restart the client.

### `Mail account not found`, `Calendar not found`, or `Reminder list not found`

Run the corresponding discovery tool and use the exact returned name. Names are local to your macOS setup and may differ by language or provider.

### `spawn ... ENOENT`

The configured Node or server path no longer exists. Remove and re-add the MCP registration using fresh values from `command -v node` and `pwd`.

### Server is registered but tools do not appear

Run the client's `mcp get`/`mcp list` commands, then start a new session. Restart an already-open desktop app or IDE extension after changing MCP configuration.

## License

[MIT](LICENSE)
