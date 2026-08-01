// western.js — real sun-sign calculation from birth date (standard
// tropical zodiac date ranges). Full chart placements (moon, rising,
// houses) require ephemeris-grade astronomical calculation that isn't
// implemented in v1 — see README. Pure functions — no DOM.

const SIGNS = [
  { name: 'Capricorn', start: [12, 22], end: [1, 19], element: 'Earth', modality: 'Cardinal', ruler: 'Saturn', motto: 'I use', temperament: 'disciplined, patient, and quietly ambitious', tendency: 'builds relationships and work slowly but for the long term' },
  { name: 'Aquarius', start: [1, 20], end: [2, 18], element: 'Air', modality: 'Fixed', ruler: 'Saturn (traditional), Uranus (modern)', motto: 'I know', temperament: 'independent, idea-driven, and community-minded', tendency: 'values freedom and original thinking in work and connection' },
  { name: 'Pisces', start: [2, 19], end: [3, 20], element: 'Water', modality: 'Mutable', ruler: 'Jupiter (traditional), Neptune (modern)', motto: 'I believe', temperament: 'intuitive, empathetic, and imaginative', tendency: 'absorbs the emotional tone of relationships and settings easily' },
  { name: 'Aries', start: [3, 21], end: [4, 19], element: 'Fire', modality: 'Cardinal', ruler: 'Mars', motto: 'I am', temperament: 'direct, energetic, and quick to act', tendency: 'leads with initiative in both work and relationships' },
  { name: 'Taurus', start: [4, 20], end: [5, 20], element: 'Earth', modality: 'Fixed', ruler: 'Venus', motto: 'I have', temperament: 'steady, sensory, and resistant to being rushed', tendency: 'builds trust slowly and values consistency' },
  { name: 'Gemini', start: [5, 21], end: [6, 20], element: 'Air', modality: 'Mutable', ruler: 'Mercury', motto: 'I think', temperament: 'curious, communicative, and adaptable', tendency: 'thrives on variety and exchange of ideas' },
  { name: 'Cancer', start: [6, 21], end: [7, 22], element: 'Water', modality: 'Cardinal', ruler: 'Moon', motto: 'I feel', temperament: 'protective, sensitive, and loyal', tendency: 'anchors relationships and work in a sense of home' },
  { name: 'Leo', start: [7, 23], end: [8, 22], element: 'Fire', modality: 'Fixed', ruler: 'Sun', motto: 'I will', temperament: 'warm, expressive, and confident', tendency: 'takes visible ownership of work and relationships' },
  { name: 'Virgo', start: [8, 23], end: [9, 22], element: 'Earth', modality: 'Mutable', ruler: 'Mercury', motto: 'I analyze', temperament: 'precise, service-oriented, and observant', tendency: 'improves what it pays attention to' },
  { name: 'Libra', start: [9, 23], end: [10, 22], element: 'Air', modality: 'Cardinal', ruler: 'Venus', motto: 'I balance', temperament: 'diplomatic, aesthetic, and fairness-minded', tendency: 'seeks balance and partnership in most decisions' },
  { name: 'Scorpio', start: [10, 23], end: [11, 21], element: 'Water', modality: 'Fixed', ruler: 'Mars (traditional), Pluto (modern)', motto: 'I desire', temperament: 'intense, private, and strategic', tendency: 'commits deeply once trust is established' },
  { name: 'Sagittarius', start: [11, 22], end: [12, 21], element: 'Fire', modality: 'Mutable', ruler: 'Jupiter', motto: 'I see', temperament: 'exploratory, direct, and optimistic', tendency: 'needs room to grow and roam, in work and relationships alike' },
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

const ELEMENT_QUALITY = {
  Fire: 'acts first and reflects after — energy that initiates',
  Earth: 'moves through the senses and the practical — energy that builds',
  Air: 'moves through ideas and exchange — energy that connects',
  Water: 'moves through feeling and undercurrent — energy that absorbs',
};

const MODALITY_QUALITY = {
  Cardinal: 'starts things — most active at the beginning of a cycle',
  Fixed: 'sustains things — most effective in the middle, holding a course',
  Mutable: 'adapts things — most effective at the end, adjusting to what changes',
};

/**
 * Builds the full structured Western astrology result for the results view.
 * @param {{ dob: string, timeKnown: boolean, focus: string, depth?: string }} inputs
 */
export function buildWesternReading(inputs) {
  const sign = sunSign(inputs.dob);
  const focusLine = (FOCUS_LINES[inputs.focus] || FOCUS_LINES.general)(sign);

  const extraBlocks = [
    {
      label: 'Ruling planet',
      value: `${sign.name} is traditionally ruled by ${sign.ruler}, and carries the classical motto "${sign.motto}."`,
    },
    {
      label: 'Element & modality in depth',
      value: `As a ${sign.element} sign, ${sign.name} ${ELEMENT_QUALITY[sign.element]}. As a ${sign.modality} sign, it ${MODALITY_QUALITY[sign.modality]}. Together, that combination is what gives ${sign.name} its particular pace and style, distinct from other signs that share only the element or only the modality.`,
    },
  ];

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
    extraBlocks,
    confidenceNote: inputs.timeKnown
      ? 'This v1 reading is Sun-sign based. Moon sign, rising sign, and house placements require full ephemeris-grade chart computation, planned for a future version.'
      : 'Sun sign is calculated from birth date alone and is unaffected by birth time. A full chart (moon, rising, houses) would need an exact birth time and is not yet computed in this version.',
  };
}
