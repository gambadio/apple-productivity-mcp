# Publishing Apple Productivity MCP

This project has two local distribution formats: the npm package for stdio clients, and an MCP Bundle (`.mcpb`) for compatible clients such as Claude Desktop. Both run on the user's Mac. A listing in a directory does not make the server a remote endpoint.

## Release prerequisites

- Test the release on macOS with Node.js 20 and a current supported Node.js release.
- Keep the versions in `package.json`, `package-lock.json`, `manifest.json`, and `server.json` aligned. The release tag is `v` followed by that version.
- Preserve npm package `@gambadio/apple-productivity-mcp` and Registry name `io.github.gambadio/apple-productivity-mcp`; `package.json.mcpName` must equal `server.json.name`.
- Describe only implemented, verified capabilities in the README and release notes. The tool reference should come from the current server catalog.
- Keep macOS requirements, per-app Automation permissions, file-root boundaries, and write effects visible in installation instructions.
- Complete appropriate live smoke tests on a development Mac. CI runs isolated tests and MCP discovery; it cannot certify the user's Apple account configuration or grant macOS permissions.

The [official Registry guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx) requires the npm artifact to exist before its metadata is registered. The Registry description is limited to 100 characters.

## Prepare and validate locally

Run these maintainer commands from a source checkout. The npm installation contains the runtime and documentation; release scripts and CI workflows live in the repository.

```sh
npm ci --ignore-scripts
npm test
npm audit --omit=dev
npm pack --dry-run
node scripts/build-mcpb.mjs
```

The bundle builder uses the pinned official `@anthropic-ai/mcpb@2.1.2` CLI. Its first use may download that tool through npm. To use an already installed CLI, set `MCPB_BIN` to its executable path. An optional first argument sets the output file:

```sh
node scripts/build-mcpb.mjs /absolute/output/apple-productivity-mcp-3.0.0.mcpb
```

The script copies an explicit project allowlist and the installed production dependency graph into a temporary directory. It excludes repository metadata, local configuration, project tests, development dependencies, and npm caches. Symbolic links and dependency paths outside `node_modules` are rejected. It starts the staged server only for MCP initialization and tool discovery, adds the discovered catalog to the bundle manifest, and validates that manifest with the official CLI. After packing, it checks archive paths, unpacks into a separate temporary directory, and verifies that the packaged server exposes the same tool catalog. It produces a `.sha256` file beside the bundle. It does not invoke any Apple app tool or publish anything.

The manifest uses the [official MCPB specification](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md): `server.type: node`, bundled `node_modules`, a portable `${__dirname}` entry point, and `compatibility.platforms: ["darwin"]`. No developer-specific absolute paths are embedded. A compatible host supplies Node.js or needs Node.js 20+. Claude Desktop includes a Node.js runtime; npm installations require Node.js on the user's PATH.

Inspect the resulting archive and test installing it into a compatible local host before a directory submission. Manifest validation and an MCP handshake are necessary checks; they do not establish that a host has approved or installed the extension. Bundles are unsigned unless a maintainer signs them separately with an appropriate certificate. Do not label them signed or notarized without verification.

## Configuration in the bundle

| Setting | Runtime environment | Default |
| --- | --- | --- |
| Read-only checkbox | `APPLE_MCP_READ_ONLY` (`true`/`false`; CLI also accepts `1`/`0`) | `false` |
| Comma-separated app groups | `APPLE_MCP_ENABLED_GROUPS` | Empty means all groups |
| JSON array of allowed absolute folders | `APPLE_MCP_FILE_ROOTS` | `[]` |
| JSON array of exact Shortcut names | `APPLE_MCP_SHORTCUTS` | `[]` |

File-root restrictions apply to file tools and Finder operations that take a path. They do not restrict document paths passed to Apple applications such as Pages, Numbers, Keynote, or TextEdit. Shortcuts can themselves perform broader actions; only allow shortcuts whose behavior is understood. Read-only mode removes tools that the server marks as writes from discovery and invocation.

For npm clients, the runtime alternative is:

```json
{
  "mcpServers": {
    "apple-productivity-local": {
      "command": "npx",
      "args": ["-y", "@gambadio/apple-productivity-mcp@3.0.0"],
      "env": {
        "APPLE_MCP_READ_ONLY": "1",
        "APPLE_MCP_ENABLED_GROUPS": "mail,calendar,reminders,notes",
        "APPLE_MCP_FILE_ROOTS": "[]",
        "APPLE_MCP_SHORTCUTS": "[]"
      }
    }
  }
}
```

Use the actual published version when configuring a client. This example does not assert that version 3.0.0 has already been published.

## GitHub Actions release

`.github/workflows/ci.yml` tests pull requests and main on macOS with Node.js 20 and 24, inspects the npm package, and validates/builds the MCPB on Node.js 24. Its checks do not access personal Apple data.

`.github/workflows/release.yml` runs on stable `vX.Y.Z` tags, or by manual dispatch with an existing tag. It tests, audits, builds both artifacts, publishes npm, publishes Registry metadata with GitHub OIDC, and attaches the artifacts to a GitHub release. Actions are pinned to reviewed commit IDs. The MCP Registry publisher is pinned to v1.8.1 and its platform-specific SHA-256 is verified before execution.

**Required npm account setup:** this workflow needs an npm trusted publisher configured on the package. Committing the workflow does not create that trust. In the package's npm settings, configure:

| npm field | Value |
| --- | --- |
| Organization or user | `gambadio` |
| Repository | `apple-productivity-mcp` |
| Workflow filename | `release.yml` |
| Environment | Leave empty; this workflow declares none |
| Allowed actions | Enable direct `npm publish` |

As documented by [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), Node.js must be at least 22.14.0 and npm at least 11.5.1. The release workflow selects Node.js 24. New trusted-publisher configurations default to staged publishing, so direct publishing must be explicitly enabled. Newly created configurations must complete a first publish within npm's stated two-day window. No saved npm token is required after trust is correctly configured.

The workflow can be rerun after a partial release: it skips an existing npm version only when its integrity matches the locally packed artifact, and skips an existing Registry version only when its metadata matches. It fails on conflicts, authentication errors, or network failures. If published content must change, create a new version; do not attempt to replace an immutable npm release.

The official Registry's [GitHub Actions guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx) describes `mcp-publisher login github-oidc`. This uses the workflow's short-lived identity and `id-token: write`; it does not require an MCP Registry secret.

## Manual release when CI publishing is not configured

After tests and artifact inspection, authenticate to npm interactively using the maintainer's account. Never put credentials in source, a manifest, or a release artifact.

```sh
npm login
npm publish --access public
npm view @gambadio/apple-productivity-mcp version
```

Install the official `mcp-publisher` CLI, then:

```sh
mcp-publisher validate
mcp-publisher login github
mcp-publisher publish
```

Confirm the exact published package and Registry version independently. The Registry record is available at:

```text
https://registry.modelcontextprotocol.io/v0.1/servers/io.github.gambadio%2Fapple-productivity-mcp/versions/latest
```

Upload the tested MCPB and checksum to the corresponding GitHub release. The [MCPB CLI documentation](https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md) covers optional signing and signature inspection.

## Directory publication

[DISTRIBUTION.md](DISTRIBUTION.md) records verified listing states and submission paths. Update existing entries rather than duplicating them. Only report a destination as published after reading back its public listing; a submission receipt or open PR means pending review.

Smithery and the Anthropic/Claude directory are excluded from this release at the maintainer's request. No submission to either destination or hosted deployment is planned. The downloadable local MCPB remains available as a generic release artifact.

Do not submit this package as a hosted HTTP connector or a Linux Docker server. Its Apple app actions require an interactive macOS user session and that user's permissions.
