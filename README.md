# OpenDesign for ZCode

A ZCode-native plugin that brings **OpenDesign** (https://opendesign.cc) — a library of
1,400+ real design systems with grounded, machine-readable tokens — into ZCode as a
first-class MCP server, skills, and slash commands.

> Every value traces to a design real humans shipped. The tokens are **measured**, not
> remembered.

## What it provides

- **MCP server** `opendesign` → 7 tools as `mcp__opendesign__*`:
  `list_designs`, `search_designs`, `get_design_system`, `fetch_design_spec_markdown`,
  `get_director_protocol`, `recommend_references`, `get_critique_rubric`.
- **Skills:** `opendesign` (lookup) and `opendesign-director` (brief → references →
  decompose → critique).
- **Commands:** `/opendesign <slug>` and `/design "<brief>"`.
- **Hooks:** `hooks/hooks.json` (P0 skeleton; P1 auto-reference hook).
- **No account, no API key.** All data is fetched live from `opendesign.cc`.

## Install into ZCode

The plugin is a standard ZCode plugin package. To install from source:

```bash
cd E:/Z.ai/OpenDesign          # the plugin source
npm install                    # only @modelcontextprotocol/server + zod (+ dev)
npm run build                  # → dist/mcp/server.js (esbuild bundle)
```

Then make ZCode discover it (copy/symlink this directory into
`~/.zcode/cli/plugins/zcode-plugins-official/opendesign/0.1.0/`) and enable
`opendesign@zcode-plugins-official` in ZCode settings. The `.mcp.json` and
`.zcode-plugin/plugin.json` register the MCP server; ZCode maps the tools to
`mcp__opendesign__*`.

## Quick start

```
/design "fintech dashboard, trustworthy not flashy"
→ recommend_references: 1 primary + 2 alternates (safe / bold / unexpected)
→ get_design_system(slug) → real palette, type scale, motion, donts
/opendesign linear          → Linear's full token spec
```

## Development

| Command | Action |
|---|---|
| `npm run build` | Bundle `src/mcp/server.ts` → `dist/mcp/server.js` |
| `npm run typecheck` | Type-check sources with `tsc` |
| `npm test` | Smoke self-check (tools/list = 7, live search + spec fetch) |

## License

MIT — the dataset lives under CC BY 4.0 at `opendesign.cc`; this plugin is a thin,
zero-runtime-dep client over those static endpoints (same ethos as the upstream MCP server).
