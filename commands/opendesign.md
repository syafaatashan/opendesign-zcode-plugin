---
description: "Fetch a real design system's grounded tokens from OpenDesign by slug (e.g. /opendesign linear)."
argument-hint: "[slug]"
skills: opendesign
---

Use the `opendesign` skill to look up a single real design system from OpenDesign by its
slug. The slug is the catalog id (e.g. `linear`, `stripe`, `mercury`).

$ARGUMENTS

Call `mcp__opendesign__get_design_system($ARGUMENTS)` to pull the site's actual measured
tokens — colors, typography scale, spacing, surfaces, layout, motion — plus the resource
URLs (full 11-layer spec markdown, spec.json, and the screenshot+tokens pack). If the slug
is empty, fall back to `mcp__opendesign__search_designs` to find one, then fetch it.
