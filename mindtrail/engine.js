// engine.js — pure game logic for MindTrail. No DOM access, no
// storage access. Given inputs, returns plain data. This is the layer
// that encodes the memory-science mechanics (trail generation, spaced
// re-asks, adaptive difficulty) separately from rendering — mirrors
// the calc.js / engines/*.js pattern used by /growthsim and
// /destinyatlas.

export const PLACES = [
  'The Garden Gate', 'The Stone Bridge', 'The Old Bench', 'The Fountain Court',
  'The Willow Path', 'The Reading Nook', 'The Corner Window', 'The Herb Garden',
  'The Boathouse', 'The Clock Tower', 'The Courtyard', 'The Orchard Row',
  'The Chapel Steps', 'The Market Stall', 'The Lighthouse Path', 'The Terrace',
  'The Cellar Door', 'The Attic Landing', 'The Greenhouse', 'The Pergola',
];

export const OBJECTS = [
  'Brass Key', 'Folded Map', 'Glass Jar', 'Wool Scarf', 'Pocket Watch',
  'Ceramic Cup', 'Linen Notebook', 'Iron Lantern', 'Silver Spoon', 'Wooden Comb',
  'Paper Kite', 'Copper Bell', 'Leather Journal', 'Straw Hat', 'Clay Bowl',
  'Woven Basket', 'Velvet Pouch', 'Tin Whistle', 'Marble Chess Piece', 'Wax Candle',
  'Porcelain Teacup', 'Canvas Satchel', 'Ivory Button', 'Bronze Compass', 'Stone Paperweight',
];

// Difficulty ladder. `choices` is always <= `stops`, so recall
// distractors can always be drawn from other objects within the same
// trail (see buildRecallPrompt) rather than falling back to the full
// pool — keeps every trail self-contained.
export const TIERS = [
  { stops: 4, choices: 3 },
  { stops: 5, choices: 3 },
  { stops: 6, choices: 4 },
  { stops: 7, choices: 4 },
  { stops: 8, choices: 5 },
];

export const MIN_TIER = 0;
export const MAX_TIER = TIERS.length - 1;

function shuffled(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates a fresh trail for the given tier: a list of
 * { place, object } stops in walking order.
 * @param {number} tierIndex
 * @param {() => number} rng injectable for testing
 */
export function generateTrail(tierIndex, rng = Math.random) {
  const tier = TIERS[Math.min(Math.max(tierIndex, MIN_TIER), MAX_TIER)];
  const places = shuffled(PLACES, rng).slice(0, tier.stops);
  const objects = shuffled(OBJECTS, rng).slice(0, tier.stops);
  return places.map((place, i) => ({ place, object: objects[i] }));
}

/**
 * Builds the recall order for a trail: every stop once, in order,
 * plus 1-2 earlier stops re-inserted later on — the spaced-retrieval
 * pass. Placement is deterministic (not random), so it reads as
 * intentional rather than arbitrary.
 * @param {number} stopCount
 * @returns {{ stopIndex: number, isRepeat: boolean }[]}
 */
export function buildRecallSequence(stopCount) {
  const seq = Array.from({ length: stopCount }, (_, i) => ({ stopIndex: i, isRepeat: false }));
  if (stopCount < 4) return seq;

  const repeatCount = stopCount >= 6 ? 2 : 1;
  const repeatStops = [0, 1].slice(0, repeatCount);

  // First repeat lands a little past the midpoint; second (if any)
  // lands right near the end — both a real delay after the original
  // study, neither back-to-back with it.
  const firstPos = Math.floor(seq.length * 0.6);
  seq.splice(firstPos, 0, { stopIndex: repeatStops[0], isRepeat: true });

  if (repeatCount === 2) {
    seq.push({ stopIndex: repeatStops[1], isRepeat: true });
  }

  return seq;
}

/**
 * Picks the answer choices for a single recall prompt: the correct
 * object plus distractors drawn from the trail's other objects only
 * (never the full pool), shuffled.
 * @param {{place:string, object:string}[]} trail
 * @param {number} stopIndex
 * @param {number} choiceCount
 * @param {() => number} rng
 */
export function buildChoices(trail, stopIndex, choiceCount, rng = Math.random) {
  const correct = trail[stopIndex].object;
  const others = trail.filter((_, i) => i !== stopIndex).map((s) => s.object);
  const distractors = shuffled(others, rng).slice(0, choiceCount - 1);
  return shuffled([correct, ...distractors], rng);
}

/**
 * Adjusts the difficulty tier after a completed trail. Deterministic:
 * strong performance (>=85%) steps up one tier, weak performance
 * (<=50%) steps down one tier, anything in between holds steady.
 * @param {number} tierIndex
 * @param {number} accuracyPercent 0-100
 */
export function adaptDifficulty(tierIndex, accuracyPercent) {
  if (accuracyPercent >= 85) return Math.min(tierIndex + 1, MAX_TIER);
  if (accuracyPercent <= 50) return Math.max(tierIndex - 1, MIN_TIER);
  return tierIndex;
}
