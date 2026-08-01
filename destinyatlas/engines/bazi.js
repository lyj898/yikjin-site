// bazi.js — structured intake + rules-based placeholder framework.
//
// A real Four Pillars chart requires the sexagenary (stem-branch)
// calendar: a Year, Month, Day, and Hour pillar, where month pillars
// change at solar-term boundaries (not Gregorian month boundaries) and
// day pillars follow a continuous 60-cycle count from a fixed epoch.
// That calculation isn't implemented in this version — see README.
//
// What this module *does* do deterministically: map the birth month to
// its traditional five-element season correspondence, a real (if
// simplified) piece of the tradition, clearly labeled as such rather
// than presented as a computed pillar. Pure functions — no DOM.

const SEASON_ELEMENT = [
  { months: [2, 3, 4], element: 'Wood', season: 'Spring', quality: 'growth-oriented, initiating' },
  { months: [5, 6, 7], element: 'Fire', season: 'Summer', quality: 'expressive, high-energy' },
  { months: [8, 9, 10], element: 'Metal', season: 'Autumn', quality: 'structured, discerning' },
  { months: [11, 12, 1], element: 'Water', season: 'Winter', quality: 'reflective, conserving' },
];

function seasonElementForMonth(month) {
  return SEASON_ELEMENT.find((s) => s.months.includes(month)) || SEASON_ELEMENT[0];
}

function article(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

const FOCUS_NOTES = {
  general: 'overall life pattern',
  career: 'career direction and timing',
  wealth: 'approach to resources and risk',
  relationships: 'relational dynamics',
  family: 'family role and dynamics',
  health: 'constitution and balance',
  timing: 'life-cycle timing',
};

/**
 * Builds the structured BaZi placeholder result for the results view.
 * @param {{ dob: string, birthTime?: string, timeKnown: boolean, birthPlace: string, focus: string }} inputs
 */
export function buildBaziReading(inputs) {
  const [, month] = inputs.dob.split('-').map(Number);
  const se = seasonElementForMonth(month);
  const focusNote = FOCUS_NOTES[inputs.focus] || FOCUS_NOTES.general;

  return {
    system: 'bazi',
    isFramework: true,
    inputsUsed: {
      'Birth date': inputs.dob,
      'Birth time': inputs.timeKnown ? (inputs.birthTime || 'provided') : 'not provided',
      'Birth place': inputs.birthPlace || 'not provided',
    },
    snapshot: `Born in ${se.season} — seasonal element emphasis: ${se.element}`,
    strengths: `Births in this season are traditionally associated with ${article(se.quality)} ${se.quality} quality.`,
    watchOuts: 'A full chart often shows other elements in tension or support with the season of birth — not visible from season alone.',
    focusInterpretation: `For ${focusNote}, a ${se.element}-leaning seasonal emphasis suggests paying attention to how ${se.quality} instincts show up under pressure.`,
    confidenceNote: 'This is a structured framework, not a full Four Pillars chart. It shows the traditional seasonal element for the birth month only — the Year, Month, Day, and Hour stem-branch pillars (the core of a real BaZi reading) require solar-term-accurate calculation not yet implemented in this version.',
  };
}
