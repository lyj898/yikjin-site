// numerology.js — real Pythagorean-method numerology calculations.
// Pure functions: date/name string in, structured result out. No DOM.

const MASTER_NUMBERS = [11, 22, 33];

function reduceNumber(n) {
  while (n > 9 && !MASTER_NUMBERS.includes(n)) {
    n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

const LETTER_VALUES = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

/**
 * Life path number — sum of every digit in the birth date (YYYY-MM-DD),
 * reduced to a single digit unless a master number (11/22/33) appears.
 */
export function lifePathNumber(dob) {
  const digits = dob.replace(/-/g, '').split('').map(Number).filter((n) => Number.isFinite(n));
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceNumber(sum);
}

/**
 * Expression (destiny) number — sum of every letter in the full birth
 * name via the Pythagorean letter-value table, reduced the same way.
 */
export function expressionNumber(fullName) {
  const letters = fullName.toLowerCase().replace(/[^a-z]/g, '');
  if (!letters) return null;
  const sum = letters.split('').reduce((a, ch) => a + (LETTER_VALUES[ch] || 0), 0);
  return reduceNumber(sum);
}

/**
 * Personal year number — a lightweight cyclical indicator combining
 * birth month + birth day with the target calendar year.
 */
export function personalYearNumber(dob, year = new Date().getFullYear()) {
  const [, m, d] = dob.split('-').map(Number);
  const digits = `${m}${d}${year}`.split('').map(Number);
  return reduceNumber(digits.reduce((a, b) => a + b, 0));
}

const LIFE_PATH_PROFILES = {
  1: { title: 'The Initiator', strengths: 'Independent, decisive, and comfortable leading from the front.', watchOuts: 'Can default to going it alone even when collaboration would help.' },
  2: { title: 'The Diplomat', strengths: 'Reads people and rooms well; brings balance to tense situations.', watchOuts: 'May avoid necessary conflict or over-defer to others.' },
  3: { title: 'The Communicator', strengths: 'Expressive, creative, and quick to find the words a moment needs.', watchOuts: 'Focus can scatter across too many ideas at once.' },
  4: { title: 'The Builder', strengths: 'Methodical and dependable; turns plans into durable structure.', watchOuts: 'Can over-value stability at the cost of needed change.' },
  5: { title: 'The Adapter', strengths: 'Curious and versatile; thrives on variety and new terrain.', watchOuts: 'Restlessness can undercut long-term follow-through.' },
  6: { title: 'The Steward', strengths: 'Responsible and caring; naturally takes on others’ wellbeing.', watchOuts: 'Risk of overcommitting or neglecting personal needs.' },
  7: { title: 'The Analyst', strengths: 'Reflective and precise; drawn to understanding the "why" beneath things.', watchOuts: 'Can retreat into overthinking or isolation.' },
  8: { title: 'The Strategist', strengths: 'Ambitious and organized; comfortable with authority and scale.', watchOuts: 'Work can crowd out rest and relationships if unchecked.' },
  9: { title: 'The Steward of Others', strengths: 'Generous and big-picture; motivated by causes larger than self.', watchOuts: 'May struggle to set boundaries or let things go.' },
  11: { title: 'The Intuitive (Master Number)', strengths: 'Highly attuned to others and to timing; often a natural counselor.', watchOuts: 'Sensitivity can tip into anxiety without grounding habits.' },
  22: { title: 'The Master Builder (Master Number)', strengths: 'Combines big vision with practical execution at scale.', watchOuts: 'The gap between ambition and current resources can feel heavy.' },
  33: { title: 'The Master Teacher (Master Number)', strengths: 'Guided by care for others’ growth; a steadying presence.', watchOuts: 'Self-care is often the last item on the list.' },
};

const FOCUS_NOTES = {
  general: 'a broad view of character and direction',
  career: 'how this number tends to show up in work and decision-making',
  wealth: 'the instincts this number brings to resources and risk',
  relationships: 'how this number relates and connects with others',
  family: 'the role this number tends to take within a family unit',
  health: 'the rhythms this number needs to stay steady',
  timing: 'how this number experiences cycles and change over time',
};

const PERSONAL_YEAR_THEMES = {
  1: 'a beginning-of-cycle year — new starts, new initiative',
  2: 'a year for patience and partnership rather than solo pushes',
  3: 'a year favoring expression, visibility, and social momentum',
  4: 'a year for consolidation — building foundations, not shortcuts',
  5: 'a year of change and movement; plans may shift more than usual',
  6: 'a year centered on responsibility — home, family, or care',
  7: 'a year suited to reflection, study, and stepping back',
  8: 'a year where effort and ambition tend to compound visibly',
  9: 'a closing-of-cycle year — completion, release, and review',
};

// Personal year cycles conventionally reduce to a single digit (1-9)
// rather than preserving master numbers.
function personalYearTheme(year) {
  const single = year > 9 ? reduceNumber(String(year).split('').reduce((a, d) => a + Number(d), 0)) : year;
  return PERSONAL_YEAR_THEMES[single] || PERSONAL_YEAR_THEMES[1];
}

const BIRTHDAY_TRAITS = {
  1: 'self-starting', 2: 'cooperative', 3: 'expressive', 4: 'methodical',
  5: 'adaptable', 6: 'caretaking', 7: 'analytical', 8: 'driven', 9: 'idealistic',
  11: 'perceptive', 22: 'systematic', 33: 'nurturing',
};

/**
 * Birthday number — the day-of-month reduced on its own, a secondary,
 * faster-moving indicator layered on top of the Life Path.
 */
export function birthdayNumber(dob) {
  const [, , d] = dob.split('-').map(Number);
  return reduceNumber(d);
}

/**
 * Builds the full structured numerology result for the results view.
 * @param {{ fullName: string, dob: string, focus: string, depth?: string }} inputs
 */
export function buildNumerologyReading(inputs) {
  const lifePath = lifePathNumber(inputs.dob);
  const expression = inputs.fullName ? expressionNumber(inputs.fullName) : null;
  const birthday = birthdayNumber(inputs.dob);
  const currentYear = new Date().getFullYear();
  const year = personalYearNumber(inputs.dob, currentYear);
  const profile = LIFE_PATH_PROFILES[lifePath];
  const focusNote = FOCUS_NOTES[inputs.focus] || FOCUS_NOTES.general;

  const extraBlocks = [];
  extraBlocks.push({
    label: 'Expression number',
    value: expression
      ? `Expression Number ${expression}, calculated from the letters of the full birth name, reflects the natural way Life Path ${lifePath} tends to be outwardly expressed — often visible in how this person communicates and works before you get to know them more closely.`
      : 'Add a full birth name to also calculate an Expression Number.',
  });
  extraBlocks.push({
    label: 'Birthday number',
    value: `Birthday Number ${birthday} (from the day of the month alone) adds a faster-moving, more surface-level layer: a tendency to come across as ${BIRTHDAY_TRAITS[birthday] || 'distinct'} in day-to-day situations, even where the Life Path runs deeper.`,
  });
  extraBlocks.push({
    label: `Personal year — ${currentYear}`,
    value: `Personal Year ${year}: ${personalYearTheme(year)}.`,
  });
  if (expression && expression !== lifePath) {
    extraBlocks.push({
      label: 'Life Path & Expression together',
      value: `Life Path ${lifePath} (${profile.title}) describes the underlying direction; Expression ${expression} describes the outward style. Where they differ, the gap itself is often informative — the inner motivation and the outward approach are pulling from two related but distinct numbers rather than one.`,
    });
  }

  return {
    system: 'numerology',
    inputsUsed: {
      'Birth date': inputs.dob,
      ...(inputs.fullName ? { 'Full name': inputs.fullName } : {}),
    },
    snapshot: `Life Path ${lifePath} — ${profile.title}`,
    strengths: profile.strengths,
    watchOuts: profile.watchOuts,
    focusInterpretation: `For ${focusNote}, Life Path ${lifePath} points toward: ${profile.strengths}`,
    extraBlocks,
    confidenceNote: 'Numerology figures here are calculated directly from the birth date and name provided — no estimation involved.',
  };
}
