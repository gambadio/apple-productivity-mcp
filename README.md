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

## Install from npm

This is the recommended installation method. No repository clone or global package installation is required. `npx` downloads and caches the published package, and the MCP client launches it as a local stdio child process when a session connects.

Confirm that Node.js and `npx` are available:

```bash
node --version
npx --version
```

The examples use `@latest` so new sessions resolve the newest published release. Replace it with an explicit version such as `@2.1.1` when you want a reproducible, pinned installation.

### Claude Code

Add the server to your user configuration so it is available in every project:

```bash
claude mcp add --transport stdio --scope user apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
```

Verify the registration:

```bash
claude mcp get apple-productivity-local
claude mcp list
```

Start a new Claude Code session after adding the server. If the name is already registered, remove it with `claude mcp remove apple-productivity-local --scope user` and run the add command again.

### Codex app, CLI, and IDE extension

Add the server to Codex's user configuration:

```bash
codex mcp add apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
```

Verify the registration:

```bash
codex mcp get apple-productivity-local
codex mcp list
```

The Codex app, CLI, and IDE extension share this MCP configuration on the same Mac. Start a new session after installation; restart an already-open app or IDE extension so it reloads the configuration. In the Codex CLI, `/mcp` shows the active servers.

If the name is already registered, run `codex mcp remove apple-productivity-local` and add it again.

### Other local MCP clients

Use these values in any client that can launch a local stdio MCP server:

| Setting | Value |
| --- | --- |
| Name | `apple-productivity-local` |
| Transport | `stdio` |
| Command | `npx` |
| Arguments | `-y`, `@gambadio/apple-productivity-mcp@latest` |
| Environment variables | None |
| Working directory | None required |

Clients that accept the common JSON configuration shape can use:

```json
{
  "mcpServers": {
    "apple-productivity-local": {
      "command": "npx",
      "args": [
        "-y",
        "@gambadio/apple-productivity-mcp@latest"
      ]
    }
  }
}
```

The outer configuration key and file location vary by client. In a graphical setup screen, select **STDIO** and enter the command and arguments from the table. This pattern applies to local MCP clients such as Claude Desktop, Cursor, Windsurf, Cline, and compatible editors; consult the client's documentation for where it stores MCP configuration.

If a desktop client cannot find `npx`, run this in Terminal:

```bash
command -v npx
```

Then replace `"command": "npx"` with the returned absolute path, for example `"command": "/usr/local/bin/npx"`.

Restart the client or open a new session after changing its MCP configuration. Clients that support only remote HTTP servers cannot run this MCP directly because Apple Productivity MCP intentionally uses local stdio and macOS automation.

You do **not** need to run `npm start`, install the package globally, keep a terminal open, configure an API key, or expose a network port.

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

You do **not** need to run `npm start` or keep a terminal open. The MCP client launches the source checkout as a child process when it establishes the MCP connection.

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

For an npm installation, run `command -v npx` and use the returned absolute path as the configured command. For a source checkout, remove and re-add the MCP registration using fresh values from `command -v node` and `pwd`.

### npm package cannot be downloaded

Confirm that the public package is reachable and that the client has internet access for the first installation:

```bash
npm view @gambadio/apple-productivity-mcp version
```

After the package has been downloaded, npm can reuse its local cache for that version.

### Server is registered but tools do not appear

Run the client's `mcp get`/`mcp list` commands, then start a new session. Restart an already-open desktop app or IDE extension after changing MCP configuration.

## License

[MIT](LICENSE)
