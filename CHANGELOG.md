# Changelog

## 3.0.0

- Expand from 18 tools to 133 default tools, plus allowlisted Shortcut execution.
- Add Notes, Contacts, Safari, Music, Photos, Messages, Pages, Numbers, Keynote, TextEdit, Finder, files, Shortcuts, and installed-app discovery.
- Add Reminders account/list management, search, detail, flags, alarm dates, and reopening completed reminders.
- Add Calendar details, calendar management, display alarms, recurrence, and event URLs.
- Add Mail subject/sender search, visible drafts, mailbox creation, and attachment listing/saving.
- Add opt-in file roots, app-group filtering, and a read-only mode. Existing 18 tool names and argument shapes remain available.
- Fix Calendar's JXA all-day property and derive the MCP handshake version from package metadata.
- Avoid reading a nonexistent outgoing-message property after sending Mail; report app acceptance separately from delivery verification.
- Keep user data out of process-error command echoes; pass inputs separately from fixed automation scripts.
- Upgrade the MCP SDK to 1.32.1 and refresh patched dependencies.
- Add executable script fixtures, filesystem boundary tests, MCP configuration tests, generated tool schemas, source references, and distribution documentation.

This is a major release because the default tool catalog expands substantially. Use `APPLE_MCP_ENABLED_GROUPS=mail,calendar,reminders` to retain the original app scope, or pin `@2.1.1` while reviewing the new release. Review [verification limits](docs/VERIFICATION.md) before relying on untested app versions.
