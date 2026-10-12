# Distribution status and submission routes

Research checked on **2026-10-12** using primary documentation, live listing pages, public APIs, TinyFish, Firecrawl, and GitHub search. This is a dated baseline, not a claim that the 3.0.0 expansion is already available on every destination. Publication, submission, review, indexing, and installation are separate states.

Project: [gambadio/apple-productivity-mcp](https://github.com/gambadio/apple-productivity-mcp). Package: [`@gambadio/apple-productivity-mcp`](https://www.npmjs.com/package/@gambadio/apple-productivity-mcp). Registry name: `io.github.gambadio/apple-productivity-mcp`. Transport: local stdio. Platform: macOS. License: MIT. Independent community project; no Apple affiliation.

## Confirmed existing listings

| Destination | State observed | Update route |
| --- | --- | --- |
| [Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.gambadio%2Fapple-productivity-mcp/versions/latest) | Active, version 2.1.1; published August 4, 2026 | Publish npm first, then the new version's `server.json` using `mcp-publisher`. |
| [Glama](https://glama.ai/mcp/servers/gambadio/apple-productivity-mcp) | Public listing, previous README and 18 tools | Refresh existing repository listing. `glama.json` identifies the GitHub maintainer; it does not prove a successful refresh or make this server cloud compatible. |
| [mcpservers.org](https://mcpservers.org/servers/gambadio/apple-productivity-mcp) | Public listing, previous three-app description and README | No edit, owner, or update control was found on the listing or submission form. The site's [contact page](https://mcpservers.org/advertise) publishes `contact@mcpservers.org` as a possible update route. Contact remains pending; no email or duplicate submission has been sent. |
| [LobeHub](https://lobehub.com/mcp/gambadio-apple-productivity-mcp) | Public listing with previous Mail/Calendar/Reminders description | Use authenticated listing management; no supported unattended update API was established during research. |
| [McpMux](https://mcpmux.com/servers/ch.datenkraft-apple-productivity-mcp-npx/) | Public listing credited to Ricardo Kupper; installation already uses npm `@latest` | Update listing description. Clients resolve the npm release independently of directory text. |
| [M8ven](https://m8ven.ai/mcp/gambadio/apple-productivity-mcp) | Public, unclaimed listing; scan of the previous source on October 1, 2026 | Optional publisher claim or rescan. Do not treat its historical scan as validation of a new release. |

[AgentStack](https://www.agentstack.live/mcp/io.github.gambadio/apple-productivity-mcp) also appeared in public search results, but direct retrieval returned HTTP 402. Its current full listing was not verified.

## Submission and review destinations

| Destination | State observed | Requirements and next action |
| --- | --- | --- |
| [mcp.so submission #3430](https://github.com/chatmcp/mcpso/issues/3430) | Existing issue is open; a public listing was not verified | Update this issue with the new release and capabilities instead of submitting again. [Website submission](https://mcp.so/submit) is an alternative route; paid placement is optional. |
| [Smithery](https://smithery.ai/docs/build/publish) | Excluded from this release at the maintainer's request | No submission or hosting deployment planned. This project remains a local macOS MCP. |
| [Cline Marketplace](https://github.com/cline/mcp-marketplace) | No matching submission found | Requires a 400×400 PNG, repository URL, rationale, and an actual successful Cline setup from the README or `llms-install.md`. Open a submission issue only when those assertions are true. |
| [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Previous [PR #11515](https://github.com/punkpeye/awesome-mcp-servers/pull/11515) closed for inactivity September 7; maintainer explicitly permits reopening or a new PR | Add one concise entry in the appropriate README category via PR; keep alphabetical ordering and existing platform/language markers. Include its required Glama badge; a current Glama quality evaluation was not verified. Follow the [contribution guide](https://github.com/punkpeye/awesome-mcp-servers/blob/main/CONTRIBUTING.md). Review/merge is controlled by maintainers. |
| [Claude Desktop extension directory](https://clau.de/desktop-extention-submission) | No submission performed in research | Submit a tested local MCPB using the desktop-extension form, not the remote-connector portal. The [official guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) distinguishes these routes. |
| [Cursor Directory](https://cursor.directory) | Sign-in required to submit plugins | Inspect its authenticated plugin flow. `/submit` returned 404; no GitHub PR route was verified. A plugin wrapper may be required. |
| [MCP Market](https://mcpmarket.com/submit) | Submission URL exists; the form itself was not exposed by page extraction | Inspect the interactive form and check for a duplicate before submitting. No successful submission is claimed. |
| [GitHub MCP Registry](https://github.com/mcp) | Curated public directory; this project's inclusion was not verified | Maintain official Registry metadata. No separate official submission form or guaranteed inclusion was established. |

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
