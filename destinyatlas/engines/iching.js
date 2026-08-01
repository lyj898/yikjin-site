// iching.js — real hexagram generation via the traditional three-coin
// method, plus manual line entry. Interpretation is composed from the
// eight trigrams (a fixed, well-established structure) rather than a
// hand-transcribed 64-entry King Wen name/number table, to avoid
// asserting precise traditional catalog data that can't be verified
// here. Pure functions — no DOM.

// Trigrams indexed bottom-to-top as a 3-character binary string,
// 1 = solid (yang), 0 = broken (yin).
const TRIGRAMS = {
  '111': { name: 'Qian', epithet: 'The Creative', element: 'Heaven', meaning: 'initiating force, clarity of direction' },
  '000': { name: 'Kun', epithet: 'The Receptive', element: 'Earth', meaning: 'yielding support, patience' },
  '100': { name: 'Zhen', epithet: 'The Arousing', element: 'Thunder', meaning: 'sudden movement, initiative' },
  '010': { name: 'Kan', epithet: 'The Abysmal', element: 'Water', meaning: 'depth, danger that must be moved through carefully' },
  '001': { name: 'Gen', epithet: 'Keeping Still', element: 'Mountain', meaning: 'stillness, boundaries, deliberate pause' },
  '011': { name: 'Xun', epithet: 'The Gentle', element: 'Wind', meaning: 'gradual influence, adaptability' },
  '101': { name: 'Li', epithet: 'The Clinging', element: 'Fire', meaning: 'clarity, illumination, attachment' },
  '110': { name: 'Dui', epithet: 'The Joyous', element: 'Lake', meaning: 'openness, exchange, encouragement' },
};

function tossLine(rng) {
  let sum = 0;
  for (let i = 0; i < 3; i++) sum += rng() < 0.5 ? 2 : 3;
  return sum; // 6, 7, 8, or 9
}

/**
 * System-generated cast: six lines via the traditional three-coin method.
 * @param {() => number} rng defaults to Math.random; injectable for testing
 */
export function castHexagram(rng = Math.random) {
  const lineValues = Array.from({ length: 6 }, () => tossLine(rng));
  return linesToHexagram(lineValues);
}

/**
 * Manual entry: an array of 6 'yang'|'yin' strings, bottom to top.
 * Manual hexagrams are treated as static (no changing lines).
 */
export function manualHexagram(lineTypes) {
  const lineValues = lineTypes.map((t) => (t === 'yang' ? 7 : 8));
  return linesToHexagram(lineValues);
}

function linesToHexagram(lineValues) {
  const original = lineValues.map((v) => (v === 6 || v === 8 ? 0 : 1));
  const changing = lineValues.map((v) => v === 6 || v === 9);
  const resulting = original.map((v, i) => (changing[i] ? (v === 1 ? 0 : 1) : v));
  return { lineValues, original, changing, resulting };
}

function trigramFor(bits) {
  return TRIGRAMS[bits.join('')];
}

function describeHexagram(bits) {
  const lower = trigramFor(bits.slice(0, 3));
  const upper = trigramFor(bits.slice(3, 6));
  return { lower, upper };
}

const CHANGE_GUIDANCE = [
  'No lines are changing — the situation is asked to be read as it stands, without an unfolding shift.',
  'One line is changing — a single, specific point of movement within an otherwise settled picture.',
  'Two lines are changing — the situation is actively in motion between two forces.',
  'Three lines are changing — a genuine turning point; the resulting hexagram matters as much as the original.',
];

/**
 * Builds the full structured I Ching result for the results view.
 * @param {{ question: string, mode: 'cast'|'manual', lineTypes?: string[] }} inputs
 */
export function buildIChingReading(inputs) {
  const hex = inputs.mode === 'manual' && inputs.lineTypes
    ? manualHexagram(inputs.lineTypes)
    : castHexagram();

  const { lower, upper } = describeHexagram(hex.original);
  const changeCount = hex.changing.filter(Boolean).length;
  const hasChanges = changeCount > 0;
  const resultTrigrams = hasChanges ? describeHexagram(hex.resulting) : null;

  const symbol = (bits) => bits.slice().reverse().map((b) => (b ? '▬▬▬' : '▬ ▬')).join('\n');

  const interpretation = `Lower trigram ${lower.name} (${lower.epithet}, ${lower.element}) brings ${lower.meaning}. `
    + `Upper trigram ${upper.name} (${upper.epithet}, ${upper.element}) brings ${upper.meaning}. `
    + `Read together, the situation combines these two qualities — the lower trigram as the inner or starting condition, the upper as the outer or emerging one.`;

  const guidance = CHANGE_GUIDANCE[Math.min(changeCount, 3)]
    + (hasChanges && resultTrigrams
      ? ` As those lines shift, the emerging hexagram leans toward ${resultTrigrams.lower.name} beneath ${resultTrigrams.upper.name} — ${resultTrigrams.upper.meaning}.`
      : '');

  return {
    system: 'iching',
    inputsUsed: {
      Question: inputs.question || '(no question provided)',
      Mode: inputs.mode === 'manual' ? 'Manual hexagram input' : 'System-generated cast',
    },
    snapshot: `${lower.name} beneath ${upper.name} — ${lower.epithet} within ${upper.epithet}`,
    hexagramSymbol: symbol(hex.original),
    strengths: `${upper.meaning[0].toUpperCase()}${upper.meaning.slice(1)}.`,
    watchOuts: `Watch the pull of ${lower.meaning} against the situation's outer expression.`,
    focusInterpretation: interpretation,
    guidance,
    confidenceNote: 'This reading is best used as situational guidance for the question asked, not as a fixed prediction.',
  };
}
