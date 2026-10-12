# Implementation references

Documentation reviewed on October 12, 2026. Apple app features are implemented through their scripting dictionaries, rather than by guessing UI capabilities.

| Area | Primary reference | How it is used |
| --- | --- | --- |
| MCP SDK 1.x | [Official TypeScript SDK server guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/server.md) | `registerTool`, Zod schemas, stdio transport, tool annotations; retrieved using Context7's `/modelcontextprotocol/typescript-sdk/__branch__v1.x` index. |
| Apple automation | [Mac Automation Scripting Guide](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/index.html) | Apple Events, scripting terminology, JXA and application dictionaries. |
| Script dictionaries | [Apple Script Editor guide](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/GettoKnowScriptEditor.html) | Script Editor's dictionary browser provides the installed app's supported commands and classes. Located with Firecrawl. |
| JavaScript for Automation | [Apple JXA release notes](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/index.html) | `Application`, object specifiers, `Path`, command parameters, and property access. |
| Shortcuts CLI | [Apple Shortcuts command-line guide](https://support.apple.com/guide/shortcuts-mac/run-shortcuts-from-the-command-line-apd455c82f02/mac) | Local `/usr/bin/shortcuts list` and `run`; also verified with installed `shortcuts help list` and `shortcuts help run`. |
| Distribution | [Publication guide](PUBLISHING.md) and [directory status](DISTRIBUTION.md) | Current official Registry, MCPB, Smithery, and directory requirements; checked with TinyFish, Firecrawl, and primary pages. |

## Installed dictionaries

For app-specific names and property types, inspect the app on the target macOS version. For example:

```sh
sdef /System/Applications/Reminders.app
sdef /System/Applications/Calendar.app
sdef /System/Applications/Mail.app
```

If the active developer tools only contain Command Line Tools, use the full installed Xcode for that command without changing the system setting:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer sdef /System/Applications/Calendar.app
```

Local dictionaries verified include Reminders, Calendar, Mail, Notes, Contacts, Safari, Music, Photos, and Messages. TextEdit's `.scriptSuite` and Foundation's standard suite were inspected. See [iWork notes](iwork-notes.md) and [personal app notes](personal-notes.md) for exact coverage and verification limits.

Calendar's scripting property is `alldayEvent`, not `allDayEvent`; a live read-only check caught and confirmed that distinction. Calendar attendee properties are read-only, so this release does not claim invitation management. Messages exposes accounts/chats/participants and sending; it does not expose searchable message history through this dictionary.

## Scope boundaries

There is no universal API exposing every function across Apple's products. This project exposes defined operations supported by local scripting, filesystem access, and approved Shortcuts. It does not use private databases, arbitrary AppleScript/JXA execution, accessibility click scripting, or passwords/Keychain access. Home, Freeform, Find My, Health, Wallet, and other apps do not acquire dedicated control merely because they can be launched. Existing user-created Shortcuts can extend coverage when explicitly allowlisted.
