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

const PURUSHARTHA_BY_FOCUS = {
  general: { aim: 'Dharma', meaning: 'right action and life purpose', note: 'a broad orientation toward purpose and alignment' },
  career: { aim: 'Artha', meaning: 'means, work, and material stability', note: 'how effort translates into stability and standing' },
  wealth: { aim: 'Artha', meaning: 'means, work, and material stability', note: 'the relationship between effort, resources, and security' },
  relationships: { aim: 'Kama', meaning: 'desire, connection, and fulfillment', note: 'how closeness and desire are pursued and balanced' },
  family: { aim: 'Dharma', meaning: 'right action and life purpose', note: 'duty and role within a family structure' },
  health: { aim: 'Moksha', meaning: 'balance and release', note: 'the discipline needed to stay steady over time' },
  timing: { aim: 'Moksha', meaning: 'balance and release', note: 'how cycles are met — with resistance or acceptance' },
};

/**
 * Builds the structured Vedic placeholder result for the results view.
 * @param {{ dob: string, birthTime?: string, timeKnown: boolean, birthPlace: string, focus: string }} inputs
 */
export function buildVedicReading(inputs) {
  const p = PURUSHARTHA_BY_FOCUS[inputs.focus] || PURUSHARTHA_BY_FOCUS.general;

  return {
    system: 'vedic',
    isFramework: true,
    inputsUsed: {
      'Birth date': inputs.dob,
      'Birth time': inputs.timeKnown ? (inputs.birthTime || 'provided') : 'not provided',
      'Birth place': inputs.birthPlace || 'not provided',
    },
    snapshot: `Focus area maps to ${p.aim} — ${p.meaning}`,
    strengths: `Framing this area through ${p.aim} points toward ${p.note}.`,
    watchOuts: 'Without a computed lagna (ascendant) and house structure, this cannot yet speak to specific planetary influences.',
    focusInterpretation: `In the Vedic tradition, ${p.aim} (${p.meaning}) is the aim most closely tied to this focus area — ${p.note}.`,
    confidenceNote: 'This is a structured framework, not a full Vedic chart. Ascendant (lagna), house placements, and dasha timing periods require sidereal ephemeris calculation not yet implemented in this version.',
  };
}
