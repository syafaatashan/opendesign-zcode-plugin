---
description: "Get design-direction from OpenDesign: 1 primary + 2 alternate real references for a brief."
argument-hint: "[design brief]"
skills: opendesign-director
---

Use the `opendesign-director` skill as a design director: diagnose the need, route the brief
to real references, and decompose the chosen system into grounded tokens.

$ARGUMENTS

1. Diagnose the brief (domain, mood, density, era).
2. Call `mcp__opendesign__recommend_references(query="$ARGUMENTS")` → 1 primary + 2
   alternates from different aesthetic families.
3. Present the picks with a one-line "why this fits" each; let the user choose.
4. On the chosen slug, call `mcp__opendesign__get_design_system(slug)` to get the real
   tokens, then decompose them into the user's project (color, typography, spacing, layout,
   motion, voice, donts). State which reference you grounded in.

`critique` variant: if the argument is `critique`, run
`mcp__opendesign__get_critique_rubric()` and score the design in front of you (5
dimensions, 0–10 each) with Keep / Fix / Quick-wins.
