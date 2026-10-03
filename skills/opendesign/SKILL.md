---
name: opendesign
description: "OpenDesign directory + grounded design-token lookup for ZCode. Use to browse the 1,400+ real design systems in the OpenDesign library, search by need, and fetch a site's actual measured tokens (color, typography, spacing, surfaces, layout, motion). The design-director workflow lives in the `opendesign-director` skill."
---

# OpenDesign — grounded design systems for ZCode

This skill turns OpenDesign (https://opendesign.cc) into a first-class ZCode tool. The
library holds **1,400+ real design systems** — each with grounded, fetchable tokens read off
the live site and verified against computed styles. You never recommend colors, fonts, or
spacing "from memory"; you fetch the real system, every time.

## ZCode tool names

The MCP server is registered in ZCode as `opendesign`, so every tool is exposed as
`mcp__opendesign__<tool>`:

| Tool | Use |
|---|---|
| `mcp__opendesign__list_designs(limit, offset)` | Browse the catalog (paginated). |
| `mcp__opendesign__search_designs(query, tags, limit)` | Score-ranked search by need. Read `unmatched_terms` — it honestly tells you which query words hit *nothing*. |
| `mcp__opendesign__get_design_system(slug)` | **The core one.** A site's real tokens + resource URLs. |
| `mcp__opendesign__fetch_design_spec_markdown(slug, lang)` | The full 11-layer spec as Markdown (en/zh-CN/ja/ko/zh-TW). |
| `mcp__opendesign__get_director_protocol()` | The director protocol (diagnose → restate → route → decompose). |
| `mcp__opendesign__recommend_references(query, tags)` | Brief → 1 primary + 2 alternates from *different* aesthetic families. |
| `mcp__opendesign__get_critique_rubric()` | The 5-dimension review scorecard. |

## Library layout (your reference shelf)

Everything is static HTTPS, no auth:

```
opendesign.cc/
├── catalog.json            ← the index. { count, designs:[ { slug,title,url,tags,summary,… } ] }
├── packs/<slug>/
│   ├── spec.json           ← 6 measured token layers (colors, typography, spacing, surfaces, layout, motion)
│   ├── DESIGN_SPEC.en.md   ← full 11-layer spec, also .zh-CN .ja .ko .zh-TW
│   ├── DESIGN.md           ← Google design.md–format writeup
│   └── <slug>-design-pack.zip  ← spec + tokens + real Playwright screenshots
```

The 11 layers: `identity · color · typography · spacing · surfaces/elevation · layout ·
components · interaction · motion · voice · anti-patterns(donts)`.

## Quick loop

1. Search: `mcp__opendesign__search_designs(query="fintech dark", limit=10)`.
2. Read `unmatched_terms` — if a term matched nothing, surface it; don't pretend.
3. On the chosen `slug`: `mcp__opendesign__get_design_system(slug)` → real palette, type
   scale, spacing, motion. Build with *these* values, not from memory.

## Hand this to the director skill

When the brief is design-direction (not a slug lookup), mount the `opendesign-director`
skill (`/design "<brief>"`). This skill does the token lookup; that one gives the point of
view.
