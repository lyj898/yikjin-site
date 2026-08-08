// app.js — UI layer: view switching, rendering, event wiring. All
// session logic lives in engine.js; all persistence lives in
// progress.js. This file never invents a quiz question or a score
// itself — it calls into those modules and renders whatever comes
// back. Mirrors the structure of /mindtrail/app.js.

import { CATEGORIES, ALL_WORDS, getCategory } from './data.js';
import { buildLearnOrder, buildQuizSequence, buildChoices, promptText, correctAnswer, wordOfTheDay } from './engine.js';
import { loadProgress, markWordResult, countKnown, recordSessionCompletion, lastSevenDays } from './progress.js';

const FEEDBACK_PAUSE_MS = 1300;

const el = (id) => document.getElementById(id);

// home view
const homeView = el('home-view');
const statStreak = el('stat-streak');
const statKnown = el('stat-known');
const statSessions = el('stat-sessions');
const stampRow = el('stamp-row');
const wotdIndo = el('wotd-indo');
const wotdEn = el('wotd-en');
const wotdSpeak = el('wotd-speak');
const categoryGrid = el('category-grid');

// practice view
const practiceView = el('practice-view');
const backBtn = el('back-btn');
const practiceTitle = el('practice-title');
const phaseLabel = el('phase-label');
const progressDots = el('progress-dots');

const learnPhase = el('learn-phase');
const flashcard = el('flashcard');
const flashcardHint = el('flashcard-hint');
const flashcardFront = el('flashcard-front');
const flashcardBack = el('flashcard-back');
const flashcardEn = el('flashcard-en');
const flashcardExample = el('flashcard-example');
const flashcardExampleEn = el('flashcard-example-en');
const learnSpeak = el('learn-speak');
const learnNextBtn = el('learn-next-btn');

const quizPhase = el('quiz-phase');
const quizLabel = el('quiz-label');
const quizPrompt = el('quiz-prompt');
const choiceGrid = el('choice-grid');
const feedbackLine = el('feedback-line');

const completeSummary = el('complete-summary');
const completeScore = el('complete-score');
const completeNote = el('complete-note');
const replayBtn = el('replay-btn');
const doneBtn = el('done-btn');

const liveRegion = el('live-region');

// ------------------------------------------------------------------ speech

const speechSupported = 'speechSynthesis' in window;
if (!speechSupported) {
  wotdSpeak.hidden = true;
  learnSpeak.hidden = true;
}

function speak(text) {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'id-ID';
  utter.rate = 0.92;
  window.speechSynthesis.speak(utter);
}

// ------------------------------------------------------------------ state

const game = {
  categoryId: null,
  phase: 'learn', // learn | quiz | complete
  learnOrder: [],
  learnPos: 0,
  flipped: false,
  quizSeq: [],
  quizPos: 0,
  results: [],
  choicesLocked: false,
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// -------------------------------------------------------------- home view

function renderProgressStrip() {
  const progress = loadProgress();
  statStreak.textContent = progress.streak;
  statKnown.textContent = countKnown(progress, ALL_WORDS.map((w) => w.id));
  statSessions.textContent = progress.totalSessions;

  stampRow.innerHTML = '';
  lastSevenDays(progress).forEach((day) => {
    const dot = document.createElement('span');
    dot.className = `stamp${day.played ? ' is-played' : ''}${day.isToday ? ' is-today' : ''}`;
    stampRow.appendChild(dot);
  });
}

function renderWordOfDay() {
  const word = wordOfTheDay(ALL_WORDS, todayKey());
  wotdIndo.textContent = word.indo;
  wotdEn.textContent = word.en;
  wotdSpeak.onclick = () => speak(word.indo);
}

function renderCategoryGrid() {
  const progress = loadProgress();
  categoryGrid.innerHTML = '';
  CATEGORIES.forEach((cat) => {
    const known = countKnown(progress, cat.words.map((w) => w.id));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-card';
    btn.innerHTML = `
      <span class="category-native">${cat.native}</span>
      <span class="category-name">${cat.name}</span>
      <span class="category-blurb">${cat.blurb}</span>
      <span class="category-mastery">${known} of ${cat.words.length} known</span>
    `;
    btn.addEventListener('click', () => startCategory(cat.id));
    categoryGrid.appendChild(btn);
  });
}

function renderHome() {
  renderProgressStrip();
  renderWordOfDay();
  renderCategoryGrid();
}

function showHome() {
  window.speechSynthesis && window.speechSynthesis.cancel();
  practiceView.hidden = true;
  homeView.hidden = false;
  renderHome();
}

// ----------------------------------------------------------------- learn

function renderDots(total, currentIndex) {
  progressDots.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    if (i < currentIndex) dot.classList.add('is-done');
    else if (i === currentIndex) dot.classList.add('is-current');
    progressDots.appendChild(dot);
  }
}

function beginLearn() {
  game.phase = 'learn';
  const category = getCategory(game.categoryId);
  game.learnOrder = buildLearnOrder(category.words);
  game.learnPos = 0;

  phaseLabel.textContent = 'Learning';
  learnPhase.hidden = false;
  quizPhase.hidden = true;
  completeSummary.hidden = true;
  renderLearnCard();
}

function renderLearnCard() {
  const word = game.learnOrder[game.learnPos];
  game.flipped = false;

  flashcardFront.textContent = word.indo;
  flashcardBack.hidden = true;
  flashcardHint.textContent = 'Tap to reveal meaning';
  flashcardEn.textContent = word.en;
  flashcardExample.textContent = word.example;
  flashcardExampleEn.textContent = word.exampleEn;

  learnSpeak.onclick = () => speak(word.indo);
  learnNextBtn.textContent = game.learnPos === game.learnOrder.length - 1 ? 'Start quiz' : 'Next word';

  renderDots(game.learnOrder.length, game.learnPos);
  liveRegion.textContent = `Word ${game.learnPos + 1} of ${game.learnOrder.length}: ${word.indo}.`;
}

function flipFlashcard() {
  game.flipped = !game.flipped;
  flashcardBack.hidden = !game.flipped;
  flashcardHint.textContent = game.flipped ? '' : 'Tap to reveal meaning';
}

function advanceLearn() {
  game.learnPos += 1;
  if (game.learnPos < game.learnOrder.length) {
    renderLearnCard();
  } else {
    learnPhase.hidden = true;
    beginQuiz();
  }
}

// ------------------------------------------------------------------ quiz

function beginQuiz() {
  game.phase = 'quiz';
  const category = getCategory(game.categoryId);
  game.quizSeq = buildQuizSequence(category.words);
  game.quizPos = 0;
  game.results = [];

  phaseLabel.textContent = 'Quiz';
  quizPhase.hidden = false;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const category = getCategory(game.categoryId);
  const item = game.quizSeq[game.quizPos];
  game.choicesLocked = false;
  feedbackLine.textContent = '';

  const { label, prompt } = promptText(item.word, item.direction);
  quizLabel.textContent = item.isRepeat ? `${label} (once more)` : label;
  quizPrompt.textContent = prompt;

  const choiceCount = Math.min(4, category.words.length);
  const choices = buildChoices(category.words, item.word, item.direction, choiceCount);
  const correct = correctAnswer(item.word, item.direction);

  choiceGrid.innerHTML = '';
  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = choice;
    btn.addEventListener('click', () => onChoiceSelected(btn, choice, correct, item.word));
    choiceGrid.appendChild(btn);
  });

  renderDots(game.quizSeq.length, game.quizPos);
  liveRegion.textContent = `Question ${game.quizPos + 1} of ${game.quizSeq.length}. ${label} ${prompt}`;
}

function onChoiceSelected(btn, choice, correct, word) {
  if (game.choicesLocked) return;
  game.choicesLocked = true;

  const isCorrect = choice === correct;
  game.results.push(isCorrect);
  markWordResult(word.id, isCorrect);

  Array.from(choiceGrid.children).forEach((chip) => {
    chip.disabled = true;
    if (chip === btn) chip.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    else if (chip.textContent === correct && !isCorrect) chip.classList.add('is-reveal');
  });

  feedbackLine.textContent = isCorrect ? `Correct — that's "${correct}".` : `Not quite — that's "${correct}".`;
  liveRegion.textContent = feedbackLine.textContent;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    game.quizPos += 1;
    if (game.quizPos < game.quizSeq.length) {
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }, reduceMotion ? 150 : FEEDBACK_PAUSE_MS);
}

// -------------------------------------------------------------- complete

function finishQuiz() {
  game.phase = 'complete';
  quizPhase.hidden = true;
  phaseLabel.textContent = 'Complete';
  progressDots.innerHTML = '';

  const correctCount = game.results.filter(Boolean).length;
  const total = game.results.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  recordSessionCompletion();
  const progress = loadProgress();
  const category = getCategory(game.categoryId);
  const known = countKnown(progress, category.words.map((w) => w.id));

  completeScore.textContent = `${correctCount} of ${total} correct`;
  completeNote.textContent = `${accuracy}% this round. You now know ${known} of ${category.words.length} words in ${category.name}.`;

  completeSummary.hidden = false;
  liveRegion.textContent = `Session complete. ${correctCount} of ${total} correct.`;
}

// --------------------------------------------------------------- control

function startCategory(categoryId) {
  game.categoryId = categoryId;
  const category = getCategory(categoryId);
  practiceTitle.textContent = category.name;

  homeView.hidden = true;
  practiceView.hidden = false;
  completeSummary.hidden = true;
  quizPhase.hidden = true;
  feedbackLine.textContent = '';

  beginLearn();
}

flashcard.addEventListener('click', flipFlashcard);
flashcard.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipFlashcard(); }
});
flashcard.tabIndex = 0;
flashcard.setAttribute('role', 'button');
flashcard.setAttribute('aria-label', 'Flip card to reveal meaning');

learnNextBtn.addEventListener('click', advanceLearn);
replayBtn.addEventListener('click', () => beginLearn());
doneBtn.addEventListener('click', showHome);
backBtn.addEventListener('click', showHome);

// ------------------------------------------------------------------ init

renderHome();
