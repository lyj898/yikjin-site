// engine.js — pure session logic for Kata Kita. No DOM access, no
// storage access. Given a category's words, returns plain data for
// the learn pass and the quiz pass — mirrors the data/engine/progress/app
// split used by /mindtrail.

function shuffled(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Order for the learn pass: every word once, shuffled so a repeat
 * visit to the same category doesn't always start the same way.
 */
export function buildLearnOrder(words, rng = Math.random) {
  return shuffled(words, rng);
}

/**
 * Quiz order: every word once, plus 1-2 earlier words re-inserted
 * later — the spaced-retrieval pass. Each entry also carries a
 * direction: 'id-en' asks for the English meaning of the Indonesian
 * word, 'en-id' asks for the Indonesian word given the English
 * meaning. Direction is assigned per appearance, not per word, so a
 * repeat can test the other direction.
 */
export function buildQuizSequence(words, rng = Math.random) {
  const order = shuffled(words, rng);
  const seq = order.map((word) => ({
    word,
    direction: rng() < 0.5 ? 'id-en' : 'en-id',
    isRepeat: false,
  }));

  if (words.length < 4) return seq;

  const repeatCount = words.length >= 6 ? 2 : 1;
  const repeatCandidates = shuffled(order, rng).slice(0, repeatCount);

  const firstPos = Math.floor(seq.length * 0.6);
  seq.splice(firstPos, 0, {
    word: repeatCandidates[0],
    direction: rng() < 0.5 ? 'id-en' : 'en-id',
    isRepeat: true,
  });

  if (repeatCount === 2) {
    seq.push({
      word: repeatCandidates[1],
      direction: rng() < 0.5 ? 'id-en' : 'en-id',
      isRepeat: true,
    });
  }

  return seq;
}

/**
 * Answer choices for one quiz question: the correct answer plus
 * distractors drawn from the same category (never the full pool, so
 * wrong answers stay plausible within context), shuffled.
 * @param {object[]} categoryWords all words in the current category
 * @param {object} correctWord the word being asked about
 * @param {'id-en'|'en-id'} direction
 * @param {number} choiceCount
 */
export function buildChoices(categoryWords, correctWord, direction, choiceCount, rng = Math.random) {
  const field = direction === 'id-en' ? 'en' : 'indo';
  const correct = correctWord[field];
  const others = categoryWords.filter((w) => w.id !== correctWord.id).map((w) => w[field]);
  const distractors = shuffled(others, rng).slice(0, choiceCount - 1);
  return shuffled([correct, ...distractors], rng);
}

export function promptText(word, direction) {
  return direction === 'id-en'
    ? { label: 'What does this mean?', prompt: word.indo }
    : { label: 'How do you say this?', prompt: word.en };
}

export function correctAnswer(word, direction) {
  return direction === 'id-en' ? word.en : word.indo;
}

/**
 * Deterministic "word of the day" — same word all day for everyone
 * on the same calendar date, cycling through the full vocabulary.
 * @param {object[]} allWords flattened word list
 * @param {string} dateKey e.g. '2026-08-07'
 */
export function wordOfTheDay(allWords, dateKey) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return allWords[hash % allWords.length];
}
