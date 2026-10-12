# iWork and TextEdit tools

The module provides 35 bounded tools. They use a static JavaScript for Automation program with JSON arguments, not caller-supplied script execution. Each handler validates its input even when invoked outside the MCP transport.

## Catalog

| App | Tool suffixes (prepend `apple_<app>_`) | Count |
| --- | --- | ---: |
| `pages` | `list_documents`, `open`, `create`, `read_text`, `set_text`, `save`, `export`, `close` | 8 |
| `numbers` | `list_documents`, `open`, `create`, `list_sheets`, `list_tables`, `create_table`, `read_range`, `write_range`, `save`, `export`, `close` | 11 |
| `keynote` | `list_documents`, `open`, `create`, `list_slides`, `add_slide`, `update_slide`, `save`, `export`, `close` | 9 |
| `textedit` | `list_documents`, `open`, `create`, `read_text`, `set_text`, `save`, `close` | 7 |

`list_documents` returns exact `documentName` selectors. Duplicate names are rejected rather than selecting a document arbitrarily. Names may change when saving: use the name in the save result, or list documents again if `rediscoverDocuments` is true. Document names are not durable IDs.

Read tools do not launch a stopped app. Opening and creating documents may launch an app, open a window, or show an import dialog. Documents can autosave and sync through iCloud; an edit is a real mutation even before an explicit save.

## Data and file behavior

- Pages reads and writes the main body of word-processing documents. Page-layout documents without a body are rejected. Images, text boxes, comments, styles, tracked changes, and document layout are outside these tools. Replacing or appending plain text can remove rich formatting.
- Numbers reads at most 200 cells per call and writes at most 500. Row and column indexes start at 1; grid dimensions must be rectangular and within the existing table. New tables have no header/footer rows. Formula strings require `allowFormulas: true`; `null` clears a cell. Formula evaluation uses Numbers. App failures during a write can leave partial changes; errors report how many cells were written. Reads include values, formatted strings and formulas; each string is bounded to 500 characters.
- Keynote works with default title/body placeholders, presenter notes, and skipped status. It does not extract arbitrary text boxes or media. Slide indexes start at 1 and can change after user edits. List slides immediately before modifying them. Title/body/note strings in listing results are bounded and reported with their limits. Template/theme/layout names are exact, app-version- and language-dependent names; discovery of those catalogs is outside this module.
- Saves require an absolute path ending in `.pages`, `.numbers`, `.key`, or, for TextEdit, `.rtf`. TextEdit explicitly requests Apple's `public.rtf` document type. Export formats are Pages PDF/DOCX, Numbers PDF/XLSX, and Keynote PDF/PPTX. This module does not claim support for every format available through each app's graphical interface.
- Parent directories must already exist. Parent paths are canonicalized; final symlinks, NULs, parent traversal, unsupported file types, and unsupported directory targets are rejected. An existing destination requires `overwrite: true`, including saving over the currently open file. Default no-overwrite checks run in Node and again immediately before the Apple event. These checks are not an atomic filesystem lock against another process racing to create the same path. Existing targets are never deleted by the tool to force a replacement; the app may reject incompatible existing targets.
- Closing refuses modified documents and documents without a saved path unless `discardChanges: true` is explicit. This also protects untitled drafts when Cocoa autosave clears the modified flag. Save separately before closing to retain changes. Operations are not transactions; inspect the app after an error before retrying a creation or mutation. Save retries only metadata discovery when Cocoa is updating a document's name/path; it never retries the save itself.
- Text reads return paginated plain text, at most 50,000 characters per call. Very large structured results fail with a request to reduce the range or limit. Large imports/exports may exceed the common automation timeout.

## Documentation and evidence

Apple's [Mac Automation Scripting Guide](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/) and [JavaScript for Automation release notes](https://developer.apple.com/library/archive/releasenotes/InterapplicationCommunication/RN-JavaScriptForAutomation/) are the primary references for the Apple-event scripting bridge. Application dictionaries remain the authoritative reference for the installed app version.

The local TextEdit dictionary sources inspected were:

```text
/System/Applications/TextEdit.app/Contents/Resources/TextEdit.scriptSuite
/System/Applications/TextEdit.app/Contents/Resources/TextEdit.scriptTerminology
/System/Library/Frameworks/Foundation.framework/Versions/C/Resources/NSCoreSuite.scriptSuite
/System/Library/Frameworks/Foundation.framework/Versions/C/Resources/NSCoreSuite.scriptTerminology
```

TextEdit extends Cocoa's document class with a text property. The inherited document properties include name, path and modified status; the save command accepts a destination and file type. The explicit RTF type and the need to reacquire document identity after a save were confirmed with the actual app.

Published Apple scripting-dictionary excerpts were consulted for [Pages documents and body text](https://iworkautomation.com/pages/document.html), [Numbers tables](https://iworkautomation.com/numbers/table.html), [Keynote default text items](https://iworkautomation.com/keynote/slide-default-text.html), and [Keynote export](https://iworkautomation.com/keynote/document-export.html). These archived dictionary excerpts are hosted by a third party, not Apple; they are useful historical references, not proof of behavior in the current installed iWork release.

## Validation status (2026-10-12)

- 17 unit tests execute the actual static dispatcher in a VM with a simulated Apple application object model. They check targeting, mutation results, formula opt-in, rectangular bounds, invalid inputs, partial failures, save guards, output errors, and annotations. They cannot prove an application's Apple-event implementation.
- One opt-in integration test passed with TextEdit 1.21. It creates a uniquely marked temporary document, reads and appends text, rejects an unsaved close, saves RTF, rejects an unapproved overwrite, closes, reopens, verifies content, and closes again. Temporary files were removed. TextEdit automation required normal host access rather than the restricted execution sandbox.
- A concurrent live run failed because the test document was renamed and saved during execution; the user confirmed that interaction. The isolated lifecycle was rerun successfully afterward. Cleanup identifies only the current test marker and preserves the original failure. No externally saved document was removed. Exact document names are not durable IDs, so user renames require rediscovery.
- Pages, Numbers, and Keynote were not installed on the validation host. Their tools are implemented and tested against the dispatch harness, but have **not been verified against live iWork apps**. Installation, permission prompts, app-version differences, templates, Numbers formula behavior, and iWork export behavior still require real-app validation.
- A stopped TextEdit process was detected successfully through its system app path. An absolute system-path fallback is used if Launch Services cannot resolve TextEdit's bundle identifier. This does not bypass macOS Automation permissions.

Run isolated tests:

```sh
node --test test/iwork-tools.test.js
```

Run the TextEdit integration test only in an interactive macOS session where temporary document creation and normal Automation permission prompts are acceptable:

```sh
RUN_IWORK_INTEGRATION=1 node --test test/iwork-tools.test.js
```
