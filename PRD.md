# Homebrew Companion App — PRD (Draft v1)

## Purpose

A personal-use app to help plan, develop, and track homebrew recipes using current ingredient inventory, seasonal brewing patterns, and process/equipment history. Built with Claude Code. Single user (Ben). Dead simple for now — no auth, no multi-user design. May be shared publicly someday, but that's a fork-it-later problem, not a v1 requirement.

Follows another Claude Code project already in progress; this is next in line.

## Background / Brewer Profile

- 10+ years homebrewing, 129+ batches
- Brews on a Grainfather system; Grainfather app has ~6-7 years of recipe history and is treated as the authoritative record for existing recipes
- Kegs everything (no bottling)
- Ferments in a Somerville basement, stores in a keezer
- Conical + glycol chiller for ales (chiller bottoms out at 43°F); pressure fermentation in corny kegs with spunding valve for lagers
- Uses a Tilt hydrometer (reads ~6-8 points low — needs calibration)
- Soft Somerville municipal water, minimal treatment (half Campden tablet, small Calcium Chloride/Gypsum additions)
- Standard batch size: 4.6 gal keg-fermented; conical batches ~6 gal in / 5.5 gal out
- Cadence: ~2x/month average (~24 batches/year), but bursty — e.g. a July frenzy followed by a 4-5 week gap. Fermenter typically free ~2 weeks between batches, except when a beer needs extended conditioning (e.g. saison).
- Brew choice is shaped by travel/schedule: hands-off single-stage ferments (e.g. US-05, no dry hop) favored when traveling; more active recipes when home
- Buys grain/hops via 1-2 annual bulk orders, plus specialty grains as-needed. Doesn't want to reconstruct historical purchase dates — freshness tracking starts fresh from app launch going forward.

## Seasonal Rotation (current calendar)

- Year-round: IPA (always want one on tap); NZ Pils / lager (Motueka-hopped, newly added to steady rotation)
- Fall: Saison (annual, wheat/rye/oats base)
- Winter: One stout/porter/brown ale (niche — mostly just for Ben)
- Spring: Bitters and English-inflected styles (a hit with his wife)
- Summer: Lagers and easy-drinking IPAs, plus standing regulars

## Core Features

### 1. Inventory Management

- Track hops (variety, weight, form), grain (variety, weight), and yeast (strain, packet count) — see `homebrew_inventory.csv` for current baseline snapshot (Sept 2026)
- Auto-deduct inventory when a batch is logged, based on the recipe used
- Surface low-stock and "aging/underused" ingredients proactively — not just a passive count, but active suggestions: "You have 0.7oz Vic Secret and 1lb Rye Malt sitting around — here's a recipe idea that uses them up"
- Freshness tracking: no backfilling old purchase dates. Existing inventory treated as "unknown age, baseline as of launch." New purchases going forward get real freshness tracking.
- Support the actual buying pattern: bulk orders 1-2x/year + opportunistic specialty-grain buys

### 2. Recipe Development & Iteration

- Grainfather app/history treated as the primary source of truth for existing recipes; this app doesn't need to re-host that history, just reference/import key recipes as needed
- Grainfather integration note: there's no public API for pulling recipe/batch data out of the Grainfather cloud account. The realistic import path is BeerXML export/import, done manually per recipe from the Grainfather app. Batch history (actual OG/volume readings, dates, notes) may not export the same way as recipes — needs to be checked in-app. A one-time BeerXML parser is a reasonable first build task.
- Support two distinct patterns of recipe change:
  - Base template + swap-in ingredients — casual iteration where the skeleton (timings, structure) stays the same but grain/hop proportions change based on what's on hand (common in pandemic-era brews)
  - Hypothesis-driven revision — deliberately isolating a variable to solve a specific question (e.g. the NZ Pils rebrew: was the finished character driven by the Campden tablets, first-time-used in that recipe, or by the Motueka hops themselves? Needs a clean, controlled rebrew off the original planned recipe — not a panic-rewritten mid-brew variant — to actually test this.)
- Needs to gracefully handle messy real-world recipe history: an original plan, a mid-brew improvised rewrite (never executed), and the as-actually-brewed version with fixes, can all coexist for one batch. The app should help reconstruct "what did I actually brew" without treating every saved version as equally authoritative.

### 3. Process Tracking

- Predicted vs. actual is the core metric. Every batch log should compare target OG/volume against actual, and make it obvious whether the batch hit target — this is one of Ben's biggest drivers for planning the next brew.
- Track known equipment quirks over time (Grainfather is 6-7 years old; wear may affect heating/temp accuracy going forward — worth watching rather than assuming reads are still as reliable as when new)
- Log brew-day deviations (equipment failures, timing changes) distinctly from intentional recipe changes, so post-mortems can separate "the recipe" from "what went wrong on the day"
- Key process lesson already learned: boil-off is the dominant volume-loss factor; extended/interrupted boils require water volume correction

### 4. Tasting Notes — Observational, Not Scored

- Explicitly not a numeric rating system. Ben finds scoring beer reductive; tasting is qualitative and holistic.
- AI's role is observer, not translator: help notice things, not convert impressions into numbers.
- Features to support this:
  - Directed tasting sessions: a short conversational prompt flow (not a form) asking open questions — first impression, how it changes as it warms, whether it recalls a past batch — to capture Ben's own language without forcing structure
  - Keg-life check-ins: prompted re-tastes at intervals (e.g. day 3, 10, 20) to capture how a beer evolves, since this is easy to forget without a nudge
  - Cross-batch pattern-spotting: surface recurring descriptive language across batches (e.g. "a little thin" mentioned 3x across batches sharing a base malt) back to Ben in his own words — not as a chart or score
- Social feedback loop: Ben's own reactions and his wife's are the two that actually shape future brewing decisions. (Brother's feedback is rare but notable when it happens; neighbors are too polite to be useful data.)

## Explicit Non-Goals (v1)

- No multi-user support / accounts / auth
- No numeric rating or scoring system for tasting notes
- No attempt to backfill historical ingredient purchase dates
- No requirement to migrate full Grainfather recipe history into the new app — reference/import as needed, don't rebuild what already works

## Open Items / To Revisit

- Whether any old paper notebook recipes (pre-Grainfather, ~6+ years old) are worth digging up and digitizing — TBD, only if something looks like a "gem"
- Platform: phone access during brew day vs. desktop-only — not yet decided
- NZ Pils rebrew (clean, off the original recipe) is the first real test case for the app's "recipe history reconstruction" and "predicted vs. actual" features once the app exists

## Reference Data

- `homebrew_inventory.csv` — hops/grain/yeast snapshot, Sept 2026
- NZ Pils original recipe (Grainfather): 4.6 USG, OG 1.048, Premium Pilsner Malt 8.75 lb (93.1%), Flaked Maize 0.65 lb (6.9%), Motueka 1 oz/60 min boil + 2 oz/30 min @ 175°F hop stand, LalBrew NovaLager (81% attenuation), Campden 0.5 tablet, Calcium Chloride 0.09 oz, Calcium Sulphate 0.07 oz
