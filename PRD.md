# PRD — OpenDesign for ZCode (v0.1.0)

> ZCode-native plugin that exposes OpenDesign (opendesign.cc) — a library of 1,486 real,
> machine-readable design systems with grounded tokens — to the ZCode harness as a first-
> class plugin: manifest, MCP server, skills, slash commands, and hooks.

## §1 Problem Statement

OpenDesign (github `qiuyiwu1989-star/opendesign`, https://opendesign.cc) currently ships:

- A **generic MCP server** (`mcp/opendesign-mcp.mjs`, zero-dep Node ≥ 18; plus a Python
  variant) targeting Cursor / Claude Desktop / Windsurf via `npx opendesign-mcp`.
- A **generic `skill/SKILL.md`** describing a "design director" persona and the 7 MCP tools.
- **Static HTTPS endpoints**: `catalog.json`, `packs/<slug>/spec.json`,
  `packs/<slug>/DESIGN_SPEC.en.md`, etc.

It targets **no specific agent harness** beyond "any MCP client." ZCode, however, integrates
extensions as **plugins** shaped like `@zcode/*-plugin` (see the canonical
`android-emulator` plugin in the local ZCode cache). A ZCode plugin is composed of:

1. A `package.json` manifest with a `bin`/`exports` MCP entry.
2. ZCode **skills** — `skills/<name>/SKILL.md` with `name` / `description` frontmatter.
3. Slash **commands** — `commands/<name>.md` (file name = command name, `$ARGUMENTS`
   substitution, `skills:` auto-mount).
4. An **MCP server** that ZCode's MCP host launches; tools become
   `mcp__opendesign__<tool>` (server name = `opendesign`).
5. `hooks/hooks.json` for event-driven automation.

OpenDesign provides **none** of that native surface. The generic MCP server is not
registered as a ZCode MCP provider, and the standalone `skill/SKILL.md` is not discovered
as a ZCode skill (it lacks the `name`/`description` frontmatter convention and the ZCode
`mcp__<server>__<tool>` tool-name mapping). **Therefore it is not compatible with the
current ZCode version.**

## §2 Goals & Non-Goals

### Goals
- G1. Ship a ZCode plugin `@zcode/opendesign-plugin` v0.1.0 installed into the local ZCode
  plugin cache (`~/.zcode/cli/plugins/zcode-plugins-official/opendesign/0.1.0/`), mirroring
  `android-emulator`.
- G2. Provide an MCP server (TypeScript, `@modelcontextprotocol/server`) exposing **all 7**
  OpenDesign tools under server name `opendesign` → `mcp__opendesign__<tool>`.
- G3. Provide two ZCode skills with proper frontmatter and `mcp__opendesign__*` tool mapping:
  `opendesign` (directory + token lookup) and `opendesign-director` (brief → references →
  decompose → critique rubric).
- G4. Provide slash commands `/opendesign <slug>` and `/design <brief>`.
- G5. Provide `hooks/hooks.json` (P0: empty skeleton; P1: auto-reference hook).
- G6. Preserve the zero-runtime-dep / minimal-dep ethos of the original; proxy to
  opendesign.cc rather than re-hosting data.

### Non-Goals
- Re-host the 1,486-system dataset locally.
- Build a design editor or WYSIWYG surface.
- Re-implement the Playwright extraction pipeline — tokens come from opendesign.cc at
  runtime.
- Python or non-TypeScript server variants in v0.1.0.

## §3 User Stories

1. **Reference routing.** As a ZCode user, I run `/design "fintech dashboard, trustworthy not flashy"` and receive 1 primary + 2 alternate references from different aesthetic families (safe / bold / unexpected), each with real tokens.
2. **Token lookup.** As a ZCode agent, I call `mcp__opendesign__get_design_system("linear")` and receive the system's real colors, type scale, spacing, surfaces, layout, motion, and resource URLs.
3. **Direct slug fetch.** As a ZCode user, I run `/opendesign linear` and get Linear's full 11-layer spec.
4. **Critique mode.** As a ZCode user, I run `/design critique` and receive the 5-dimension review scorecard (reference fidelity, visual hierarchy, craft, function, originality).
5. **Skill discovery.** As a ZCode user, the `opendesign` and `opendesign-director` skills appear in the `/` (Commands) menu.
6. **Hook (P1).** As a ZCode user, when I ask about "design" / "make it look premium", the plugin suggests grounding the request in a real reference.

## §4 Functional Requirements

### FR-1 — MCP server (the core)
- FR-1.1. Server name `opendesign`; stdio transport (local MCP).
- FR-1.2. Expose exactly the 7 tools, each with the same input schema and behavior as
  OpenDesign's canonical `core.mjs`:
  `list_designs(limit, offset)`, `search_designs(query, tags, limit)`,
  `get_design_system(slug)`, `fetch_design_spec_markdown(slug, lang)`,
  `get_director_protocol()`, `recommend_references(query, tags)`,
  `get_critique_rubric()`.
- FR-1.3. Honor the 20 s per-request timeout, 10 min catalog TTL, and Chinese→English
  term mapping (SYNONYMS + CN_TERMS) from the original core so ZCode sessions in
  non-English still match.
- FR-1.4. Tools/list must return all 7 tools (self-check gate).

### FR-2 — Skills
- FR-2.1. `skills/opendesign/SKILL.md` — frontmatter `name: opendesign`,
  `description:`. Body: how to use the lookup tools, the ZCode tool-name convention
  `mcp__opendesign__*`, the `opendesign.cc/` URL layout, and a worked example.
- FR-2.2. `skills/opendesign-director/SKILL.md` — frontmatter `name: opendesign-director`,
  `description:`. Body: the diagnose→restate→route→decompose workflow and the 5-dimension
  critique rubric; maps to `recommend_references`, `get_design_system`,
  `get_critique_rubric`, `get_director_protocol`.

### FR-3 — Commands
- FR-3.1. `commands/opendesign.md` — `/opendesign <slug>`: frontmatter `description`,
  `argument-hint: "[slug, e.g. linear]"`, `skills: opendesign`; body delegates to the skill
  and calls `mcp__opendesign__get_design_system($ARGUMENTS)`.
- FR-3.2. `commands/design.md` — `/design <brief>`: frontmatter `description`,
  `argument-hint: "[design brief]"`, `skills: opendesign-director`; body routes the brief
  through `recommend_references` then `get_design_system`.
- FR-3.3. Both commands auto-mount their skill and substitute `$ARGUMENTS`.

### FR-4 — Hooks
- FR-4.1. `hooks/hooks.json` with `{ "hooks": {} }` skeleton (matches `android-emulator`).
- FR-4.2 (P1). A hook on design-flavored user turns invoking `recommend_references`.

### FR-5 — Manifest
- FR-5.1. `package.json`: `name: "@zcode/opendesign-plugin"`, `version: 1.0.0`,
  `type: module`, `bin.opendesign-mcp = ./dist/mcp/server.js`,
  `main = ./dist/mcp/server.js`, `exports["./mcp"] = { import: ./dist/mcp/server.js }`.
- FR-5.2. Deps: `@modelcontextprotocol/server` (SDK) + `zod` (validation). Dev:
  `typescript`, `esbuild` (build), `vitest` (self-check).

### FR-6 — Documentation
- FR-6.1. Top-level `README.md` — install/enable in ZCode, available tools, commands,
  example session.

## §5 Technical Architecture

```
~/.zcode/cli/plugins/zcode-plugins-official/opendesign/0.1.0/
├── package.json            # @zcode manifest; bin + exports for MCP
├── README.md
├── commands/
│   ├── opendesign.md       # /opendesign <slug>
│   └── design.md           # /design <brief>
├── skills/
│   ├── opendesign/SKILL.md           # lookup skill
│   └── opendesign-director/SKILL.md  # director skill
├── hooks/
│   └── hooks.json                    # { "hooks": {} } (P0)
├── mcp/
│   └── server.ts                     # @modelcontextprotocol/server MCP server
├── lib/
│   └── core.ts                       # port of OpenDesign core.mjs (7 tools, TTL, CJK)
├── test/
│   └── server.test.ts                # self-check: tools/list + smoke tool call
└── scripts/
    └── build.mjs                     # builds src → dist/mcp/server.js
```

- **Transport:** stdio (local). Remote `https://opendesign.cc/mcp/http` documented as an
  alternative in the README (no code).
- **Build:** `tsc` (types) + `esbuild` bundle → single `dist/mcp/server.js` (mirrors
  `android-emulator`'s `scripts/build-mcp.mjs`).
- **Runtime dep surface:** `@modelcontextprotocol/server` + `zod` only. All fetching is
  `fetch` to `opendesign.cc` from the server process (sidesteps ZCode sandbox URL policy
  — same rationale as the original).
- **Server registration in ZCode:** `bin.opcode-mcp` + `exports["./mcp"]`; ZCode MCP host
  maps tools to `mcp__opendesign__<tool>`.

## §6 Non-Functional Requirements

| NFR | Requirement | Source |
|---|---|---|
| NFR-1 | MCP `tools/list` returns ≥7 tools | FR-1.4 / self-check |
| NFR-2 | Any single design-system fetch completes ≤ 15 s | FR-1.3 timeout |
| NFR-3 | Catalog cache TTL = 10 min between fetches | FR-1.3 |
| NFR-4 | CJK + synonym query expansion works (`search_designs("极简 深色")`) | FR-1.3 |
| NFR-5 | `/opendesign` and `/design` resolve in the ZCode `/` menu | FR-3.1/3.2 |
| NFR-6 | Plugin loads without blocking ZCode startup | build self-check |
| NFR-7 | MIT licensed | matches OpenDesign |
| NFR-8 | Node ≥ 18 | `fetch` global |

## §7 Success Metrics & Exit Criteria

- **M1** `tools/list` returns exactly 7 `mcp__opendesign__*` tools (self-check test passes).
- **M2** `search_designs("linear")` returns the `linear` slug as top match.
- **M3** `/opendesign linear` and `/design "landing page"` commands are present and parse.
- **M4** Both `opendesign` and `opendesign-director` skills load in the skill discovery test.
- **M5** `hooks/hooks.json` is valid JSON with a `hooks` key.
- **Exit:** `npm run build && npm test` passes with 0 failures; plugin structure matches
  the android-emulator layout.

## §8 Out of Scope

- Remote HTTP (Streamable HTTP) transport in v0.1.0 — documented only.
- Smithery / npm publish workflow.
- UI for previewing design specs in ZCode.
- Caching design packs locally on disk.
- The `/design critique` command (P1; critique rubric is reachable via
  `get_critique_rubric` and the director skill now).

## §9 Timeline & Phasing

**Phase 0 — PRD** (this doc): decisions via AskUserQuestion. ✔

**Phase 1 — Scaffold & core (P0, ~1 workflow run):**
- Plugin directory, `package.json`, build script.
- `lib/core.ts` (port of `core.mjs`: 7 tools, TTL, CJK/synonym expansion).
- `mcp/server.ts` (MCP server wiring 7 tools to ZCode `mcp__opendesign__*`).
- `commands/opendesign.md`, `commands/design.md`.
- `skills/opendesign/SKILL.md`, `skills/opendesign-director/SKILL.md`.
- `hooks/hooks.json` skeleton.
- `test/server.test.ts` self-check (tools/list + one smoke call + command/skill JSON validation).
- `README.md`.

**Phase 2 — Build, install, verify (P0):**
- `npm install` (only `@modelcontextprotocol/server`, `zod`, dev deps).
- `npm run build` → `dist/mcp/server.js`.
- Self-check: launch server, `tools/list` → 7 tools, `search_designs` smoke call.

**Phase 3 — Future (P1, separate runs):**
- `/design critique` command + `get_critique_rubric` command path.
- Auto-reference hook on design-flavored turns.
- Remote Streamable HTTP transport.
- Smithery manifest.

## §10 Open Questions (resolved for v0.1.0)

| Q | Resolution |
|---|---|
| Plugin scope | Full plugin (manifest + MCP + skills + commands + hooks) |
| Language | TypeScript via `@modelcontextprotocol/server` |
| Tool surface | All 7 OpenDesign tools |
| Skill surface | Split: `opendesign` + `opendesign-director` |
| P0 commands | `/opendesign <slug>` + `/design <brief>` |
| Packaging | Local ZCode plugin cache (mirrors `android-emulator`) |
