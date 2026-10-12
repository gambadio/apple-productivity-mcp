# Apple Productivity MCP

A local macOS MCP server for working with Apple's productivity apps, documents, files, and media from Codex, Claude Code, Claude Desktop, and other stdio MCP clients.

**133 tools across 17 groups**, plus optional execution of explicitly allowlisted Shortcuts. Runs on your Mac through Apple's automation interfaces. No hosted service, listening port, subscription, or Apple API key is required.

[Tool reference](docs/TOOLS.md) · [Machine-readable schemas](docs/tools.json) · [Verification](docs/VERIFICATION.md) · [Source documentation](docs/SOURCES.md) · [Changelog](CHANGELOG.md) · [Publishing](docs/PUBLISHING.md) · [Directory status](docs/DISTRIBUTION.md)

## What it can do

| App / group | Tools | Coverage |
| --- | ---: | --- |
| Mail | 12 | Accounts and mailboxes; message metadata/body; sender/subject search; visible drafts; send; read/flag status; move/trash; mailbox creation; attachments. |
| Calendar | 12 | Calendars and events; create/update/delete events; event notes, attendees and recurrence; calendar creation/rename/deletion; display alarms and event URLs. |
| Reminders | 15 | Accounts/lists; reminders and title search; notes, priorities and due dates; create/update/delete; list management; complete/reopen; flags and notification dates. |
| Notes | 9 | Accounts/folders; list/search/read notes; create folders and HTML notes; update and delete unlocked notes. |
| Contacts | 9 | Search and contact details; groups and members; create contacts/groups; update fields; add/remove group membership. |
| Pages | 8 | List/open/create documents; read/replace/append body text; save; export PDF/DOCX; close with unsaved-change protection. |
| Numbers | 11 | Documents, sheets, tables; create tables; read/write bounded cell ranges; save; export PDF/XLSX; close. |
| Keynote | 9 | Documents and slides; create presentations; add/update title, body and presenter notes; save; export PDF/PPTX; close. |
| TextEdit | 7 | Documents; create/open/read/replace/append text; save RTF; close. |
| Safari | 6 | Tabs and page text; open/navigate/close tabs with URL checks; Reading List. |
| Music | 9 | Playlists, tracks and search; metadata; create playlists and add tracks; playback and volume. |
| Photos | 9 | Albums/items/search; metadata; create albums; add items; import/export; update metadata. |
| Messages | 3 | Accounts/chats; send text to an explicit recipient through an explicit account. |
| Files | 8 | Bounded folder listing; metadata/text; create text files/folders; copy; Spotlight filename search; Finder Trash. |
| Finder | 2 | Selected item metadata; reveal an allowed path. |
| Shortcuts | 2 + 1 opt-in | List shortcuts/folders; run only names in the configured allowlist. |
| System | 2 | Discover installed apps/configuration; launch a known Apple app. |

The original 18 tool names remain supported. Version 3 expands the default catalog; select only the app groups you want below.

**Coverage has boundaries.** Apple does not expose every app feature through scripting. Messages history, Contacts deletion, Pages layout text boxes, full document styling, Calendar invitations, Reminders subtasks/tags/recurrence, arbitrary Safari JavaScript, and private Apple databases are not implemented. There are no dedicated Home, Health, Wallet, Find My, or Freeform editing tools. A user-created, allowlisted Shortcut can bridge supported actions in other apps. The complete input schemas describe exactly what each tool accepts.

## Requirements

- macOS and Node.js **20 or newer**.
- The Apple app you want to control must be installed and configured. Pages, Numbers, and Keynote are separate App Store installations.
- A client supporting local **stdio** MCP servers.
- macOS Automation permission for the launching client/process to control each app. Some file locations also require Files & Folders access.

The server starts when the MCP client connects. Each automation call uses a fixed script and JSON arguments with a timeout. iCloud, Exchange, or other account sync continues to follow the app's own settings.

## Install

### Codex

```sh
codex mcp add apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
codex mcp get apple-productivity-local
```

### Claude Code

```sh
claude mcp add --transport stdio --scope user apple-productivity-local -- \
  npx -y @gambadio/apple-productivity-mcp@latest
claude mcp get apple-productivity-local
```

### Claude Desktop and other JSON-configured clients

Add this to the client's MCP configuration, then restart it:

```json
{
  "mcpServers": {
    "apple-productivity-local": {
      "command": "npx",
      "args": ["-y", "@gambadio/apple-productivity-mcp@latest"]
    }
  }
}
```

For a reproducible install, replace `@latest` with `@3.0.0`. A local `.mcpb` extension can also be built using the [packaging instructions](docs/PUBLISHING.md); artifact availability is recorded on the GitHub release. This package requires execution on the user's Mac and cannot access their apps from a Linux container or remote hosting service.

## Configuration

All settings are optional. Put them in your MCP client's server environment and start a new MCP process.

| Variable | Default | Behavior |
| --- | --- | --- |
| `APPLE_MCP_ENABLED_GROUPS` | All groups | Comma-separated group names from the table above, lowercase: e.g. `mail,calendar,reminders,notes`. Empty means all. Unknown groups fail startup. |
| `APPLE_MCP_READ_ONLY` | `false` | `1` or `true` registers read-only tools only. `0` or `false` enables the selected groups' write tools as well. |
| `APPLE_MCP_FILE_ROOTS` | `[]` | JSON array of existing absolute directories for Files tools, Finder reveal, Mail attachment saving, and Shortcut file input. Required when using those operations. Paths resolving outside these roots are rejected. |
| `APPLE_MCP_SHORTCUTS` | `[]` | JSON array of shortcut names/identifiers permitted to run. An empty list omits `apple_shortcuts_run` entirely. |

Example with Notes, reminders, files, and one permitted Shortcut:

```json
{
  "mcpServers": {
    "apple-productivity-local": {
      "command": "npx",
      "args": ["-y", "@gambadio/apple-productivity-mcp@3.0.0"],
      "env": {
        "APPLE_MCP_ENABLED_GROUPS": "system,notes,reminders,files,finder,shortcuts",
        "APPLE_MCP_FILE_ROOTS": "[\"/Users/YOUR_NAME/Documents\"]",
        "APPLE_MCP_SHORTCUTS": "[\"Prepare daily note\"]"
      }
    }
  }
}
```

Replace `YOUR_NAME` and the shortcut name with values that exist on your Mac. An iCloud Drive directory can be included using its real local absolute path.

File roots constrain the generic file tools listed above; they are **not a sandbox for Apple apps**. iWork/TextEdit open/save/export and Photos import/export use explicit paths under the macOS permissions of those apps. Shortcuts may perform any action already contained in the allowed shortcut, including sending messages or changing data elsewhere. Inspect a shortcut before allowlisting it. App-group filtering and read-only mode control the exposed tool surface; MCP annotations are hints for clients, not an authorization system.

## Example requests

- “Find reminders with ‘invoice’ in the title, then show their notes and due dates.”
- “Create a Notes folder in this account and put my meeting summary in it.”
- “Read this Pages document and export a PDF beside it.”
- “List the sheets and tables in my Numbers workbook, then fill cells B2:D6 with these values.”
- “Add a Keynote slide with this title, body, and presenter notes.”
- “Find Mail messages from this sender and save the selected attachment in my allowed Documents folder.”
- “List my Photos albums and export these selected items into an empty folder.”
- “Run my allowlisted ‘Prepare daily note’ shortcut.”

Start with discovery tools. Use returned IDs/names and inspect the tool schema for exact fields. `apple_system_capabilities` identifies installed apps but does not pre-authorize them or prove permissions. Write requests act on real data, so name the intended target and changes explicitly.

## Data handling and safeguards

- No server-side account, telemetry service, network listener, or credential storage.
- Fixed JXA programs receive user values as JSON arguments, without interpolation into executable source. There is no arbitrary code or shell execution tool.
- New file copies refuse replacement. Text writes and document save/export require an explicit overwrite option to replace a path. Photos exports require an empty folder.
- Generic file operations require explicit roots and check resolved paths. File deletion goes through Finder Trash; there is no empty-Trash tool.
- Collection reads and text/cell ranges have limits. Locked Notes are not read or modified. Safari tab mutations compare the expected URL to guard against shifted indices.
- Read-only mode hides mutations. Every tool declares read-only, destructive, idempotent, and open-world annotations.
- Email, Messages, document changes, reminders, contacts, and media edits may sync or reach other people. A send result means submission to the app, not independently verified delivery.
- Timeouts or multi-step errors can leave partial changes. Inspect the target before retrying a write.
- Data returned to an MCP client becomes part of that client's active model session and is governed by its data controls. Local execution does not mean content stays outside the model session. JSON inputs are visible to local processes with sufficient OS privileges.

## Development and verification

```sh
npm ci
npm test
npm run docs:tools
npm audit --omit=dev
npm pack --dry-run
```

Tests execute the static automation programs against application fixtures, exercise filesystem boundaries in temporary folders, and initialize the actual stdio MCP server. They do not send messages or edit personal app data.

For the existing read-only Mail/Calendar/Reminders integration suite, after granting Automation permission:

```sh
npm run test:integration
```

**Live verification is app-specific.** Pages, Numbers, and Keynote were not installed on the release development Mac; their tools have fixture coverage but no live iWork verification. See [verification results and limitations](docs/VERIFICATION.md) and [implementation sources](docs/SOURCES.md). Do not interpret the tool count as a claim that every operation has been exercised against every app/macOS version.

## Troubleshooting

**Automation unavailable / not authorized / timeout:** open System Settings → Privacy & Security → Automation and permit the relevant Apple app for the launching client. A timeout can also reflect a busy app or slow iCloud data; do not blindly retry writes. Restart the client after permission/configuration changes.

**Application cannot be found:** install the app, launch it once, and verify `apple_system_capabilities`. OS process sandboxing can also restrict LaunchServices. Run a local client with the appropriate macOS access.

**File roots required / path outside allowed roots:** configure `APPLE_MCP_FILE_ROOTS` as a JSON array of existing absolute directories. A symlink cannot be used to escape that list. Create missing parent folders first.

**Object not found / ambiguous name:** rediscover the app's current account, list, document, or object ID. Names differ by language/provider. Close or rename duplicate documents before editing by name.

**Contacts has unsaved changes:** save or discard your pending edits in Contacts before using a mutation, because Contacts' scripting save affects all pending changes.

**Tools missing:** check app-group/read-only settings, start a new session, and verify `mcp get`/`mcp list` in your client. Shortcut execution appears only with a nonempty allowlist. Apps need not be installed for their tools to be advertised.

**`spawn ... ENOENT`:** ensure Node and `npx` are accessible to the desktop client's PATH; use the full path returned by `command -v npx` if needed.

## Update or remove

`@latest` is resolved when a new MCP process starts; restart the client after publishing a release. An existing process continues running its loaded version. To retain the original app scope on v3, set `APPLE_MCP_ENABLED_GROUPS=mail,calendar,reminders`.

```sh
codex mcp remove apple-productivity-local
claude mcp remove apple-productivity-local --scope user
```

Removing registration does not delete Apple data or clear npm's cache.

## Distribution

Canonical source: [GitHub](https://github.com/gambadio/apple-productivity-mcp). Package: [npm](https://www.npmjs.com/package/@gambadio/apple-productivity-mcp). Registry identity: `io.github.gambadio/apple-productivity-mcp`.

[Directory status](docs/DISTRIBUTION.md) distinguishes live listings, submissions awaiting review, login requirements, and incompatible or paused destinations. Third-party listing text may lag the source release. Inclusion and recommendation are controlled by those maintainers.

## License

MIT. Independent project; not affiliated with or endorsed by Apple.
