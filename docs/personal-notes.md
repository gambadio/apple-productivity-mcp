# Personal Apple app integrations

`src/personal-tools.js` adds 45 named operations across six apps. Tool descriptions distinguish discovery, local controls, changes that may sync, and outgoing communication. These are supported scripting operations, not a claim to automate every Apple feature.

| App | Tools | Coverage |
| --- | ---: | --- |
| Notes | 9 | Accounts, folders, metadata listing, title search, bounded text/HTML reads, create/update/delete notes, create folders |
| Contacts | 9 | Name/organization search, contact details, groups/members, contact creation, selected field updates, group creation and membership |
| Safari | 6 | List/read/open/navigate/close tabs, add Reading List items |
| Music | 9 | Playlists, tracks, playlist search, track details, playback state/control, volume, playlist creation and track addition |
| Photos | 9 | Albums, media metadata, native search, album creation/membership, local import/export, title/description/favorite/keyword updates |
| Messages | 3 | Accounts, chat/participant metadata, send text to an explicit recipient |

## Source of truth

The implementation was checked against the installed app scripting dictionaries on 2026-10-12. The dictionaries describe the supported commands, collections, property spelling, and writable fields. They can be reproduced on a development Mac without changing the global Xcode selection:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /System/Applications/Notes.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /System/Applications/Contacts.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /Applications/Safari.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /System/Applications/Music.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /System/Applications/Photos.app
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer /usr/bin/sdef /System/Applications/Messages.app
```

App locations and dictionary support can differ by macOS version. Apple's [JavaScript for Automation release notes](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/index.html) describe the underlying JXA object and command model.

## Behavioral boundaries

- Discovery lists use `limit` (1–100) and `offset`. The shared paginator creates bounded indexed object specifiers instead of resolving entire libraries. Music does not support the range Apple Event used by JXA collection `.slice()` on the tested macOS version. Native Music/Photos search can internally produce more matches than the returned page.
- Notes search matches titles. Locked notes return metadata only and cannot be modified through these tools. HTML replacement replaces the entire body and can remove attachments or rich content. HTML is passed as data; no caller-supplied script is evaluated.
- Contacts search matches names or organizations. Creation supports labeled emails and phone numbers; updates deliberately change only scalar name, organization, job-title, and note fields. Group removal does not delete a person. Mutations require Contacts to have no pre-existing unsaved changes because its save command commits every pending edit. A mid-operation app failure can still leave partial edits.
- Safari reads page text through its scripting dictionary and never calls `do JavaScript`. Opening and navigation accept only HTTP(S) URLs. Navigation and closing require the previously observed URL, helping detect a tab whose index changed. Two tabs with the same URL cannot be distinguished by that guard; list immediately before changes. Loading websites can trigger network requests and page behavior.
- Music uses persistent track and playlist IDs. Track additions target regular user playlists; special or smart playlists are refused. This is local-library automation, not Apple Music catalog search, purchase management, or a subscription API. Playback may stream audio.
- Photos returns metadata unless export is requested. Imports require existing regular files and keep duplicate checking enabled. Export requires an existing empty directory to reduce overwrite risk; the destination must remain empty until the app begins exporting. Original export can download iCloud media and may exceed the shared automation timeout. An export failure or timeout can leave partial files. Photos scripting does not support deleting media items, so no media-delete tool is claimed.
- Messages exposes accounts, chats, and participants, not message history. `serviceType` is `null` when macOS rejects the advertised property; this occurred in the live check. Sending requires an explicit account ID and one international phone number or email. The returned status means submitted to Messages, not delivery confirmed. There is no chat-history, bulk-send, account-login/logout, or attachment-send tool.

All handlers validate direct calls using strict Zod schemas, including cross-field constraints. The executed JXA is fixed source; user strings are transported separately as JSON arguments. The tools do not include arbitrary AppleScript/JXA execution, shell execution, web-page JavaScript execution, or direct access to private app databases.

## Validation evidence

`node --test test/personal-tools.test.js` passes 21 tests. The test harness executes the actual JXA source against synthetic application objects and exercises every tool, including mutation behavior. It checks bounded pagination, argument injection resistance, invalid inputs, missing IDs, locked Notes, Contacts pending edits, Safari stale targets, Music playlist restrictions, Photos filesystem preflight, and Messages account routing. All Messages sends in this suite target fake objects.

Live, read-only smoke checks passed for Notes accounts/folders/metadata, Contacts groups, Safari tabs, Music playlists/tracks, Photos albums/media metadata, and Messages accounts/chats. Each returned at most one result; the check printed only success flags and result shapes. No personal data values were printed, and no real content was created, updated, deleted, exported, imported, played, or sent during these checks.

To reproduce these checks on a Mac with the apps configured and Automation permission granted:

```sh
RUN_APPLE_PERSONAL_INTEGRATION=1 node --test test/personal-integration.test.js
```

These 11 integration tests are skipped by default. They can launch apps and trigger macOS permission prompts but do not mutate app content. Test assertions avoid printing returned personal metadata.

The terminal sandbox initially could not resolve applications; the same checks succeeded with approved normal macOS app access. Users must grant their MCP host the relevant Automation permissions. Fixture success is not live mutation certification; account state, macOS versions, app dialogs, iCloud availability, and provider behavior can still cause runtime failures.
