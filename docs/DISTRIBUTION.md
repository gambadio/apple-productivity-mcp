# Distribution status and submission routes

Status checked on **2026-10-12** using primary documentation, live listing pages and browser controls, public APIs, TinyFish, Firecrawl, and GitHub. Version **3.0.0** is published on npm, the official MCP Registry, and GitHub Releases. Third-party listing refreshes and review submissions have separate states below; publication does not guarantee immediate indexing or approval.

Project: [gambadio/apple-productivity-mcp](https://github.com/gambadio/apple-productivity-mcp). Package: [`@gambadio/apple-productivity-mcp`](https://www.npmjs.com/package/@gambadio/apple-productivity-mcp). Registry name: `io.github.gambadio/apple-productivity-mcp`. Transport: local stdio. Platform: macOS. License: MIT. Independent community project; no Apple affiliation.

## Confirmed existing listings

| Destination | State observed | Update route |
| --- | --- | --- |
| [npm](https://www.npmjs.com/package/@gambadio/apple-productivity-mcp) | Version 3.0.0 published and verified as `latest`; published integrity matches the tested package | Keep the scoped package name. |
| [Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.gambadio%2Fapple-productivity-mcp/versions/latest) | Version 3.0.0 published and verified | Published through the release workflow using GitHub OIDC. |
| [GitHub Releases](https://github.com/gambadio/apple-productivity-mcp/releases/tag/v3.0.0) | Version 3.0.0 release workflow succeeded | Release artifacts include the npm package, local MCPB, and checksum. |
| [Glama](https://glama.ai/mcp/servers/gambadio/apple-productivity-mcp) | Existing public listing; refresh remains pending | Listing administration requires GitHub authentication, which was not completed. `glama.json` identifies the maintainer; it does not prove a refresh or a current quality evaluation. |
| [mcpservers.org](https://mcpservers.org/servers/gambadio/apple-productivity-mcp) | Refresh requested October 12; the control changed from **Request update** to **Requested** | Existing public page still showed the previous three-app description. Await refresh; no email or duplicate listing submission was needed. |
| [LobeHub](https://lobehub.com/mcp/gambadio-apple-productivity-mcp) | Public listing with previous Mail/Calendar/Reminders description | Use authenticated listing management; no supported unattended update API was established during research. |
| [McpMux](https://mcpmux.com/servers/ch.datenkraft-apple-productivity-mcp-npx/) | Existing listing JSON found in [mcpmux/mcp-servers](https://github.com/mcpmux/mcp-servers); metadata update prepared and validated (307 definitions and 63 tests passed) | Contribution requires DCO sign-off and agreement to contribution licensing/trademark responsibilities. Project maintainer approval remains pending; no update PR submitted. Installation already uses npm `@latest`. |
| [MCP Market](https://mcpmarket.com/server/apple-productivity-2) | Existing public listing credited to `gambadio`, linking the exact GitHub repository and scoped npm package; previous three-app description | The **Claim this listing** control offers GitHub sign-in to verify repository ownership and edit the entry. Claim/update remains pending; no duplicate was submitted. |
| [M8ven](https://m8ven.ai/mcp/gambadio/apple-productivity-mcp) | Public, unclaimed listing; scan of the previous source on October 1, 2026 | Optional publisher claim or rescan. Do not treat its historical scan as validation of a new release. |

[AgentStack](https://www.agentstack.live/mcp/io.github.gambadio/apple-productivity-mcp) also appeared in public search results, but direct retrieval returned HTTP 402. Its current full listing was not verified.

## Submission and review destinations

| Destination | State observed | Requirements and next action |
| --- | --- | --- |
| [mcp.so submission #3430](https://github.com/chatmcp/mcpso/issues/3430) | Existing issue updated October 12; [release update comment](https://github.com/chatmcp/mcpso/issues/3430#issuecomment-6123988520) posted and read back | Await directory review/refresh. A public 3.0.0 listing was not independently verified; no duplicate issue was created. |
| [Smithery](https://smithery.ai/docs/build/publish) | Excluded from this release at the maintainer's request | No submission or hosting deployment planned. This project remains a local macOS MCP. |
| [Cline Marketplace](https://github.com/cline/marketplace) | [Catalog PR #228](https://github.com/cline/marketplace/pull/228) opened October 12; pending review | Catalog validation and generation passed locally for 204 entries. Submitted with `verified: false`; no claim of maintainer verification or merged publication. |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | [PR #16255](https://github.com/punkpeye/awesome-mcp-servers/pull/16255) opened October 12; checks succeeded; pending review | Previous [PR #11515](https://github.com/punkpeye/awesome-mcp-servers/pull/11515) was closed for inactivity and the maintainer permitted resubmission. The required Glama badge is included; a current Glama quality evaluation was not verified. |
| [Claude Desktop / Anthropic directory](https://clau.de/desktop-extention-submission) | Excluded at the maintainer's request | No submission made or planned. The local MCPB remains available from GitHub Releases for compatible clients. |
| [Cursor Directory](https://cursor.directory) | Sign-in required to submit plugins | Inspect its authenticated plugin flow. `/submit` returned 404; no GitHub PR route was verified. A plugin wrapper may be required. |
| [GitHub MCP Registry](https://github.com/mcp) | Curated public directory; this project's inclusion was not verified | Maintain official Registry metadata. No separate official submission form or guaranteed inclusion was established. |

The older [cline/mcp-marketplace](https://github.com/cline/mcp-marketplace) issue-submission instructions describe a different route. The current catalog submission above uses [cline/marketplace](https://github.com/cline/marketplace); its review remains pending.

[wong2/awesome-mcp-servers](https://github.com/wong2/awesome-mcp-servers) explicitly directs submissions to [mcpservers.org](https://mcpservers.org/submit) and does not accept PRs. Its free form requests name, category, description, source/documentation URL, optional official Registry name, and contact email. Use the free tier unless the maintainer separately chooses paid promotion. The remote-connections checkbox must remain off for this server.

## Closed or incompatible routes

| Destination | Verified limitation |
| --- | --- |
| [PulseMCP](https://www.pulsemcp.com/submit) | New submissions and listing changes are paused, according to its September 3, 2026 notice. It recommends official Registry publication for ingestion when the service resumes. |
| [appcypher/awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers) | Archived on August 1, 2026 and read-only. |
| [Docker MCP Catalog](https://docs.docker.com/ai/mcp-catalog-and-toolkit/catalog/) | Its local servers execute in containers. This server's native Apple automation cannot execute in a Linux container; its remote route is also not applicable to this stdio package. |
| Remote-only connector directories | Require a public HTTP MCP endpoint. This project does not publish one. |

## Submission copy and evidence

Use a short description grounded in the released catalog, for example:

> Local macOS MCP tools for Apple apps, iWork documents, files, and allowlisted Shortcuts.

Include the release URL, exact version, npm installation command, macOS and Node requirements, supported clients, permission instructions, configuration boundaries, license, and a link to the complete tool reference. Do not describe the project as every possible Apple API: individual apps expose different automation surfaces, and some capabilities are unavailable.

Record each completed action with its date and receipt URL in the table above. Distinguish an open submission/PR from an accepted public listing. Do not duplicate existing submissions, claim third-party endorsement, claim client installation tests that were not run, or claim propagation to an unverified destination.

See [PUBLISHING.md](PUBLISHING.md) for artifact creation, npm authentication, Registry publishing, and readback checks.
