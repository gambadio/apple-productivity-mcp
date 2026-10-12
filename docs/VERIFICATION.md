# Verification and limitations

Validation host: macOS 27, Apple Silicon, Node.js 26.8.1. Checks performed on 2026-10-12. This record distinguishes executed tests from implemented capabilities; it does not certify every Apple app operation.

## Isolated checks

The final default `npm test` run passed **66 tests**, with **15 opt-in live tests skipped** and no failures. The suite exercises the fixed JXA dispatchers against synthetic app objects, validates input schemas, tests filesystem boundaries with temporary files, and initializes the real stdio MCP server. Live app checks are skipped unless explicitly enabled. Message-send fixtures never send real email or Messages.

The production dependency audit reported **zero vulnerabilities**. Release validation also covers npm package contents, official MCP Registry metadata schema, and the MCPB manifest. The bundle builder starts both its staged and unpacked runtime and compares the advertised tool catalogs. Both the staged and unpacked MCPB exposed 133 tools. These checks do not constitute a Claude Desktop or Cline installation test.

## Live app checks

- Mail account discovery, Calendar one-day event discovery, and Reminders discovery passed through the MCP transport.
- Eleven bounded, read-only checks passed across Notes, Contacts, Safari, Music, Photos, and Messages. They retrieved at most one item and did not print personal metadata. No live sends, contact edits, media imports/exports, playback, or destructive app operations were performed.
- TextEdit validation creates a uniquely marked temporary document, reads and appends text, verifies unsaved-close and overwrite guards, saves RTF, closes, reopens, and checks content. The isolated lifecycle passed. A concurrent run failed when its document name changed; the user confirmed renaming and saving that test document during the run. The isolated lifecycle was rerun successfully afterward. The test and tools use exact document names, which are not durable identifiers. Do not rename or close the test document during a run.
- Installed-app discovery was checked with normal macOS access. The execution sandbox could not reliably resolve apps through LaunchServices; normal host access was needed for live checks.

Pages, Numbers, and Keynote were not installed on the validation host. Their **35 combined iWork/TextEdit tools** have executable fixture coverage, but Pages, Numbers, and Keynote have **no live app validation**. iWork templates, formulas, exports, app-version differences, and account-specific behavior remain unverified against those apps.

No tools were tested against every macOS version or every account provider. App permissions, locked documents, dialogs, iCloud downloads, large libraries, and concurrent user edits may cause failures. Multi-step mutations can leave partial changes; inspect the app before retrying.

## Reproduce

```sh
npm ci --ignore-scripts
npm test
npm run docs:tools
npm audit --omit=dev
npm pack --dry-run
npm run bundle
```

In an interactive macOS session with the appropriate Automation permissions, run live checks separately:

```sh
npm run test:integration
npm run test:personal-integration
RUN_IWORK_INTEGRATION=1 node --test test/iwork-tools.test.js
```

The last command creates and removes a synthetic TextEdit document and temporary file. The other live suites perform read-only discovery but may launch apps. Keep the test document untouched while the TextEdit lifecycle runs. The [macOS CI run](https://github.com/gambadio/apple-productivity-mcp/actions/runs/38246020019) passed on Node.js 20 and 24. The [release workflow](https://github.com/gambadio/apple-productivity-mcp/actions/runs/38246372801) also passed. A fresh-cache installation of the public npm 3.0.0 package returned version 3.0.0 and all 133 default tools through the MCP handshake; no app actions were invoked in that package check.

Implementation details and source references: [iWork/TextEdit](iwork-notes.md), [personal apps](personal-notes.md), [sources](SOURCES.md), and [tool reference](TOOLS.md).
