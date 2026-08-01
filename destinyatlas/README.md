# Destiny Atlas — implementation notes

Version 1 of a multi-tradition reading platform at `/destinyatlas`. Static, client-side only — no backend, no API keys, no LLM calls at runtime. All output comes from deterministic logic and pre-authored copy.

## Architecture

```
destinyatlas/
  index.html            page shell + all styles (matches yikjin.com design tokens)
  app.js                UI layer: card selection, dynamic form, requirements panel,
                         staged "analyzing" sequence, results rendering
  readings-config.js    shared metadata: the 4 readings, their required fields, field definitions
  engines/
    numerology.js       pure calculation
    western.js          pure calculation
    bazi.js              structured placeholder framework
    vedic.js              structured placeholder framework
```

`engines/*.js` never touch the DOM — each exports a `build<System>Reading(inputs)` function that takes a plain object and returns a plain result object. `app.js` is the only file that renders anything. This mirrors the same engine/UI split used in `/growthsim`.

## Reading depth

The "Reading depth" control is wired to real content differences, not just a cosmetic label:

- **Quick** — core snapshot and headline strengths only.
- **Standard** (default) — adds watch-outs and the focus-area interpretation.
- **Comprehensive** — adds each engine's `extraBlocks`: genuinely additional computed content (see table below), not the same text padded out.

## Which engines are real vs. placeholder

| Reading | Status | What's actually computed |
|---|---|---|
| **Numerology** | Real | Life Path number (digit-sum of full birth date, reduced, preserving master numbers 11/22/33), Expression number (Pythagorean letter-value sum of the full name), Birthday number (day-of-month reduced), and a Personal Year indicator with a themed one-line meaning — all calculated directly from user input. Comprehensive depth adds a Life-Path/Expression comparison paragraph when the two differ. |
| **Western Astrology** | Real (partial) | Sun sign from the standard tropical zodiac date ranges — a real, correct calculation, plus each sign's classical ruling planet and motto. Comprehensive depth adds an element + modality elaboration. Moon sign, rising sign, and house placements are **not** computed; those require ephemeris-grade planetary position calculation, out of scope for v1. |
| **BaZi / Four Pillars** | Structured placeholder | Collects and displays real birth data. Computes two genuinely real-but-simplified pieces: the traditional five-element season correspondence for the birth month, and the 12-year Chinese zodiac animal for the birth year (both disclosed as Gregorian-calendar simplifications — see below). Does **not** calculate the actual Year/Month/Day/Hour stem-branch pillars, which requires the sexagenary calendar with solar-term-accurate month boundaries and a continuous 60-cycle day count. |
| **Vedic Astrology** | Structured placeholder | Collects and displays real birth data. Computes one exact, real value — the vara (weekday) and its classical planetary ruler, which follows directly from the calendar date and needs no ephemeris — plus maps the selected focus area to its corresponding aim of life (one of the four purusharthas: Dharma/Artha/Kama/Moksha). Comprehensive depth shows all four aims for context. Does **not** calculate the ascendant (lagna), houses, or dasha timing periods — those require sidereal ephemeris calculation with ayanamsa correction. |

**Why BaZi and Vedic stay placeholders rather than approximated charts:** both are real traditions people use for genuinely personal purposes. A silently-wrong Four Pillars chart or Vedic ascendant is worse than an honest "not yet computed" — so v1 intentionally stays within what can be verified as correct, and says so plainly in each result's confidence note, rather than presenting unverified approximations as authoritative. The zodiac-animal and season-element (BaZi) and vara (Vedic) additions were chosen specifically because they're exact or well-established enough to state confidently, unlike a full pillar or lagna calculation.

**On the Gregorian-vs-lunar boundary (BaZi):** both the season-element and zodiac-animal calculations use the Gregorian calendar year/month rather than the true solar-term or Chinese New Year boundary. A birth date in late January or early February can land a year (or season) off from the traditional boundary. This is disclosed inline in the result, not just in this README.

## Deterministic, not random-feeling

Every reading is a pure function of its inputs — the same birth date and name always produce the same numerology numbers, the same sun sign, the same zodiac animal, the same vara. There is no randomness anywhere in v1.

## Why I Ching was removed

An earlier version of v1 included I Ching (coin-cast hexagram generation with trigram-based interpretation). It was removed at the user's request to keep the v1 scope to the four birth-detail-based traditions. The engine and its dedicated question/casting-mode form fields have been fully removed, not just hidden.

## v2 upgrade path

- **BaZi**: implement the sexagenary calendar (solar-term-accurate month pillars, JDN-based day pillar, hour-branch/stem lookup) to produce real Year/Month/Day/Hour pillars.
- **Vedic**: implement sidereal planetary longitude calculation (ayanamsa-corrected) for a real lagna and house structure; dasha period timing.
- **Western**: add moon sign and rising sign via a proper ephemeris (e.g. a WASM port of an astronomical library), enabling real house placements.
- Optional v2+: an opt-in AI interpretation layer that takes the deterministic structured output (not raw birth data) and produces a more narrative summary — kept strictly optional and clearly labeled, since v1's whole premise is a non-AI, deterministic baseline.
