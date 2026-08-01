// western.js — real sun-sign calculation from birth date (standard
// tropical zodiac date ranges). Full chart placements (moon, rising,
// houses) require ephemeris-grade astronomical calculation that isn't
// implemented in v1 — see README. Pure functions — no DOM.

const SIGNS = [
  { name: 'Capricorn', start: [12, 22], end: [1, 19], element: 'Earth', modality: 'Cardinal', temperament: 'disciplined, patient, and quietly ambitious', tendency: 'builds relationships and work slowly but for the long term' },
  { name: 'Aquarius', start: [1, 20], end: [2, 18], element: 'Air', modality: 'Fixed', temperament: 'independent, idea-driven, and community-minded', tendency: 'values freedom and original thinking in work and connection' },
  { name: 'Pisces', start: [2, 19], end: [3, 20], element: 'Water', modality: 'Mutable', temperament: 'intuitive, empathetic, and imaginative', tendency: 'absorbs the emotional tone of relationships and settings easily' },
  { name: 'Aries', start: [3, 21], end: [4, 19], element: 'Fire', modality: 'Cardinal', temperament: 'direct, energetic, and quick to act', tendency: 'leads with initiative in both work and relationships' },
  { name: 'Taurus', start: [4, 20], end: [5, 20], element: 'Earth', modality: 'Fixed', temperament: 'steady, sensory, and resistant to being rushed', tendency: 'builds trust slowly and values consistency' },
  { name: 'Gemini', start: [5, 21], end: [6, 20], element: 'Air', modality: 'Mutable', temperament: 'curious, communicative, and adaptable', tendency: 'thrives on variety and exchange of ideas' },
  { name: 'Cancer', start: [6, 21], end: [7, 22], element: 'Water', modality: 'Cardinal', temperament: 'protective, sensitive, and loyal', tendency: 'anchors relationships and work in a sense of home' },
  { name: 'Leo', start: [7, 23], end: [8, 22], element: 'Fire', modality: 'Fixed', temperament: 'warm, expressive, and confident', tendency: 'takes visible ownership of work and relationships' },
  { name: 'Virgo', start: [8, 23], end: [9, 22], element: 'Earth', modality: 'Mutable', temperament: 'precise, service-oriented, and observant', tendency: 'improves what it pays attention to' },
  { name: 'Libra', start: [9, 23], end: [10, 22], element: 'Air', modality: 'Cardinal', temperament: 'diplomatic, aesthetic, and fairness-minded', tendency: 'seeks balance and partnership in most decisions' },
  { name: 'Scorpio', start: [10, 23], end: [11, 21], element: 'Water', modality: 'Fixed', temperament: 'intense, private, and strategic', tendency: 'commits deeply once trust is established' },
  { name: 'Sagittarius', start: [11, 22], end: [12, 21], element: 'Fire', modality: 'Mutable', temperament: 'exploratory, direct, and optimistic', tendency: 'needs room to grow and roam, in work and relationships alike' },
];

function inRange(month, day, [sm, sd], [em, ed]) {
  if (sm === em) return month === sm && day >= sd && day <= ed;
  if (sm < em) return (month === sm && day >= sd) || (month > sm && month < em) || (month === em && day <= ed);
  // wraps across year boundary (Capricorn)
  return (month === sm && day >= sd) || month > sm || month < em || (month === em && day <= ed);
}

/**
 * @param {string} dob 'YYYY-MM-DD'
 */
export function sunSign(dob) {
  const [, m, d] = dob.split('-').map(Number);
  return SIGNS.find((s) => inRange(m, d, s.start, s.end)) || SIGNS[0];
}

const FOCUS_LINES = {
  general: (s) => `Broadly, ${s.name} tendencies show up as ${s.temperament}.`,
  career: (s) => `At work, ${s.name} ${s.tendency}.`,
  wealth: (s) => `With resources, ${s.name} tends to make decisions in line with being ${s.temperament}.`,
  relationships: (s) => `In relationships, ${s.name} ${s.tendency}.`,
  family: (s) => `Within family roles, ${s.name} tends to be ${s.temperament}.`,
  health: (s) => `For personal rhythm and health, ${s.name} benefits from routines that respect being ${s.temperament}.`,
  timing: (s) => `Through change and timing, ${s.name} tends to move at its own pace — ${s.tendency}.`,
};

/**
 * Builds the full structured Western astrology result for the results view.
 * @param {{ dob: string, timeKnown: boolean, focus: string }} inputs
 */
export function buildWesternReading(inputs) {
  const sign = sunSign(inputs.dob);
  const focusLine = (FOCUS_LINES[inputs.focus] || FOCUS_LINES.general)(sign);

  return {
    system: 'western',
    inputsUsed: {
      'Birth date': inputs.dob,
      'Birth time': inputs.timeKnown ? (inputs.birthTime || 'provided') : 'not provided',
      'Birth place': inputs.birthPlace || 'not provided',
    },
    snapshot: `Sun in ${sign.name} — ${sign.element}, ${sign.modality}`,
    strengths: `${sign.name} is typically ${sign.temperament}.`,
    watchOuts: `The same traits that make ${sign.name} effective can tip into rigidity or excess under pressure.`,
    focusInterpretation: focusLine,
    confidenceNote: inputs.timeKnown
      ? 'This v1 reading is Sun-sign based. Moon sign, rising sign, and house placements require full ephemeris-grade chart computation, planned for a future version.'
      : 'Sun sign is calculated from birth date alone and is unaffected by birth time. A full chart (moon, rising, houses) would need an exact birth time and is not yet computed in this version.',
  };
}
