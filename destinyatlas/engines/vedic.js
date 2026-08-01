// vedic.js — structured intake + rules-based placeholder framework.
//
// A real Vedic (Jyotish) chart requires the sidereal ascendant (lagna),
// precise planetary longitudes with ayanamsa correction, and dasha
// (planetary period) timing — all ephemeris-grade astronomical
// calculation not implemented in this version. See README.
//
// What this module does deterministically: maps the selected focus
// area to its corresponding traditional aim of life (the four
// purusharthas), a real conceptual structure from the tradition that
// doesn't require chart computation to state honestly.

const PURUSHARTHAS = {
  Dharma: { meaning: 'right action and life purpose', note: 'a broad orientation toward purpose and alignment' },
  Artha: { meaning: 'means, work, and material stability', note: 'how effort translates into stability and standing' },
  Kama: { meaning: 'desire, connection, and fulfillment', note: 'how closeness and desire are pursued and balanced' },
  Moksha: { meaning: 'balance and release', note: 'the discipline needed to stay steady over time' },
};

const PURUSHARTHA_BY_FOCUS = {
  general: 'Dharma',
  career: 'Artha',
  wealth: 'Artha',
  relationships: 'Kama',
  family: 'Dharma',
  health: 'Moksha',
  timing: 'Moksha',
};

// Vara (weekday) and its classical planetary ruler — a real, exactly
// computable piece of the tradition (the day of the week a birth date
// falls on is not in question), independent of the sidereal chart work
// this framework doesn't yet do.
const WEEKDAY_RULERS = [
  { day: 'Sunday', ruler: 'Surya (Sun)', quality: 'vitality, leadership, and visibility' },
  { day: 'Monday', ruler: 'Chandra (Moon)', quality: 'mind, emotion, and adaptability' },
  { day: 'Tuesday', ruler: 'Mangala (Mars)', quality: 'drive, courage, and assertion' },
  { day: 'Wednesday', ruler: 'Budha (Mercury)', quality: 'communication and intellect' },
  { day: 'Thursday', ruler: 'Guru (Jupiter)', quality: 'wisdom, growth, and expansion' },
  { day: 'Friday', ruler: 'Shukra (Venus)', quality: 'harmony, relationship, and refinement' },
  { day: 'Saturday', ruler: 'Shani (Saturn)', quality: 'discipline, endurance, and structure' },
];

function weekdayRulerForDate(dob) {
  const [y, m, d] = dob.split('-').map(Number);
  return WEEKDAY_RULERS[new Date(y, m - 1, d).getDay()];
}

/**
 * Builds the structured Vedic placeholder result for the results view.
 * @param {{ dob: string, birthTime?: string, timeKnown: boolean, birthPlace: string, focus: string, depth?: string }} inputs
 */
export function buildVedicReading(inputs) {
  const aim = PURUSHARTHA_BY_FOCUS[inputs.focus] || 'Dharma';
  const p = PURUSHARTHAS[aim];
  const vara = weekdayRulerForDate(inputs.dob);

  const extraBlocks = [
    {
      label: `Vara (weekday) — ${vara.day}`,
      value: `Born on a ${vara.day}, traditionally ruled by ${vara.ruler} — associated with ${vara.quality}. Vara is one of the five limbs of the Panchang (Vedic almanac) and, unlike the lagna, needs no ephemeris calculation — it follows directly from the birth date.`,
    },
    {
      label: 'The four aims of life',
      value: Object.entries(PURUSHARTHAS)
        .map(([name, def]) => `${name === aim ? `<strong>${name}</strong>` : name} (${def.meaning})`)
        .join(', ') + `. This reading is framed through ${aim}, but a full life picture in the tradition holds all four in balance rather than emphasizing one.`,
    },
  ];

  return {
    system: 'vedic',
    isFramework: true,
    inputsUsed: {
      'Birth date': inputs.dob,
      'Birth time': inputs.timeKnown ? (inputs.birthTime || 'provided') : 'not provided',
      'Birth place': inputs.birthPlace || 'not provided',
    },
    snapshot: `Focus area maps to ${aim} — ${p.meaning}`,
    strengths: `Framing this area through ${aim} points toward ${p.note}.`,
    watchOuts: 'Without a computed lagna (ascendant) and house structure, this cannot yet speak to specific planetary influences.',
    focusInterpretation: `In the Vedic tradition, ${aim} (${p.meaning}) is the aim most closely tied to this focus area — ${p.note}.`,
    extraBlocks,
    confidenceNote: 'This is a structured framework, not a full Vedic chart. Ascendant (lagna), house placements, and dasha timing periods require sidereal ephemeris calculation not yet implemented in this version. The weekday ruler above is exact; the aim-of-life mapping is conceptual, not chart-derived.',
  };
}
