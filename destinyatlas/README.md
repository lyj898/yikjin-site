# Destiny Atlas — implementation notes

Version 1 of a multi-tradition reading platform at `/destinyatlas`. Static, client-side only — no backend, no API keys, no LLM calls at runtime. All output comes from deterministic logic and pre-authored copy.

## Architecture

```
destinyatlas/
  index.html            page shell + all styles (matches yikjin.com design tokens)
  app.js                UI layer: card selection, dynamic form, requirements panel, results
  readings-config.js    shared metadata: the 5 readings, their required fields, field definitions
  engines/
    numerology.js       pure calculation
    iching.js           pure calculation
    western.js          pure calculation
    bazi.js             structured placeholder framework
    vedic.js            structured placeholder framework
```

`engines/*.js` never touch the DOM — each exports a `build<System>Reading(inputs)` function that takes a plain object and returns a plain result object. `app.js` is the only file that renders anything. This mirrors the same engine/UI split used in `/growthsim`.

## Which engines are real vs. placeholder

| Reading | Status | What's actually computed |
|---|---|---|
| **Numerology** | Real | Life Path number (digit-sum of full birth date, reduced, preserving master numbers 11/22/33) and Expression number (Pythagorean letter-value sum of the full name), both calculated directly from user input — not looked up or templated. |
| **I Ching** | Real | Hexagram generation via the traditional three-coin method (or manual line entry), including changing lines and the resulting hexagram. Interpretation is composed from the eight trigrams' well-established attributes (Qian/Kun/Zhen/Kan/Gen/Xun/Li/Dui), not a hand-transcribed 64-entry King Wen name/number table — see rationale below. |
| **Western Astrology** | Real (partial) | Sun sign from the standard tropical zodiac date ranges — a real, correct calculation. Moon sign, rising sign, and house placements are **not** computed; those require ephemeris-grade planetary position calculation, which is out of scope for v1. |
| **BaZi / Four Pillars** | Structured placeholder | Collects and displays real birth data (date, time, place, gender). Computes one genuinely real-but-simplified piece: the traditional five-element season correspondence for the birth month. Does **not** calculate the actual Year/Month/Day/Hour stem-branch pillars — that requires the sexagenary calendar with solar-term-accurate month boundaries and a continuous 60-cycle day count, which isn't implemented. |
| **Vedic Astrology** | Structured placeholder | Collects and displays real birth data. Maps the selected focus area to its corresponding traditional aim of life (one of the four purusharthas — Dharma/Artha/Kama/Moksha), a real conceptual mapping that doesn't require chart computation. Does **not** calculate the ascendant (lagna), houses, or dasha timing periods — those require sidereal ephemeris calculation with ayanamsa correction, which isn't implemented. |

**Why BaZi and Vedic are placeholders rather than approximated calculations:** both are real traditions people use for genuinely personal purposes. A silently-wrong Four Pillars chart or Vedic ascendant is worse than an honest "not yet computed" — so v1 intentionally stays within what can be verified as correct, and says so plainly in each result's confidence note, rather than presenting unverified approximations as authoritative.

**Why I Ching interpretation doesn't cite King Wen catalog numbers:** the line-casting algorithm itself is fully correct and traditional (three-coin method, changing lines, resulting hexagram). But the specific King Wen sequence numbering and names for all 64 hexagrams is a large, precise, static reference table — transcribing it from memory risks small errors that would misattribute a real historical text. The trigram-level structure (which this does cite) is a much smaller, more foundational, and more confidently-known piece of the same tradition.

## Deterministic, not random-feeling

Every reading is a pure function of its inputs — the same birth date and name always produce the same numerology numbers; the same six cast lines always produce the same hexagram and interpretation. The only genuine randomness in the product is the I Ching coin-cast itself (by design — that's the point of a cast), and even that is exposed as an injectable RNG in `engines/iching.js` for testability.

## v2 upgrade path

- **BaZi**: implement the sexagenary calendar (solar-term-accurate month pillars, JDN-based day pillar, hour-branch/stem lookup) to produce real Year/Month/Day/Hour pillars.
- **Vedic**: implement sidereal planetary longitude calculation (ayanamsa-corrected) for a real lagna and house structure; dasha period timing.
- **Western**: add moon sign and rising sign via a proper ephemeris (e.g. a WASM port of an astronomical library), enabling real house placements.
- **I Ching**: source a verified King Wen sequence reference table to add canonical hexagram names/numbers alongside the trigram-based interpretation.
- Optional v2+: an opt-in AI interpretation layer that takes the deterministic structured output (not raw birth data) and produces a more narrative summary — kept strictly optional and clearly labeled, since v1's whole premise is a non-AI, deterministic baseline.
