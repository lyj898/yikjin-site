// app.js — UI layer: state machine, rendering, event wiring. All game
// logic lives in engine.js; all persistence lives in progress.js. This
// file never computes a trail or a score itself — it calls into those
// modules and renders whatever comes back.

import { generateTrail, buildRecallSequence, buildChoices, adaptDifficulty, TIERS } from './engine.js';
import { loadProgress, getTierIndex, setTierIndex, recordTrailCompletion, lastSevenDays } from './progress.js';

const STUDY_STEP_MS = 2600;
const FEEDBACK_PAUSE_MS = 1300;

const el = (id) => document.getElementById(id);

const startBtn = el('start-btn');
const statStreak = el('stat-streak');
const statTotal = el('stat-total');
const stampRow = el('stamp-row');
const phaseLabel = el('phase-label');
const gameIdle = el('game-idle');
const trailEl = el('trail');
const studyContinue = el('study-continue');
const continueBtn = el('continue-btn');
const recallPanel = el('recall-panel');
const recallPrompt = el('recall-prompt');
const choiceGrid = el('choice-grid');
const feedbackLine = el('feedback-line');
const completeSummary = el('complete-summary');
const completeScore = el('complete-score');
const completeNote = el('complete-note');
const replayBtn = el('replay-btn');
const doneBtn = el('done-btn');
const liveRegion = el('live-region');

// ------------------------------------------------------------------ state

const game = {
  phase: 'idle', // idle | studying | recalling | complete
  trail: [],
  studyPos: 0,
  studyTimer: null,
  recallSequence: [],
  recallPos: 0,
  results: [],
  choicesLocked: false,
};

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// -------------------------------------------------------------- progress

function renderProgress() {
  const progress = loadProgress();
  statStreak.textContent = progress.streak;
  statTotal.textContent = progress.totalTrails;

  stampRow.innerHTML = '';
  lastSevenDays(progress).forEach((day) => {
    const dot = document.createElement('span');
    dot.className = `stamp${day.played ? ' is-played' : ''}${day.isToday ? ' is-today' : ''}`;
    stampRow.appendChild(dot);
  });
}

// ------------------------------------------------------------------ trail

function renderTrailStructure(trail) {
  trailEl.innerHTML = '';
  trail.forEach((stop, i) => {
    const li = document.createElement('li');
    li.className = 'trail-stop';
    li.dataset.index = String(i);
    li.innerHTML = `
      <span class="trail-marker" aria-hidden="true">${i + 1}</span>
      <div class="trail-content">
        <p class="trail-place">${stop.place}</p>
        <p class="trail-object-slot" id="slot-${i}"></p>
      </div>
    `;
    li.addEventListener('click', () => {
      if (game.phase === 'studying' && i === game.studyPos) advanceStudy();
    });
    trailEl.appendChild(li);
  });
  trailEl.hidden = false;
}

function setStopState(index, stateClass) {
  const li = trailEl.querySelector(`[data-index="${index}"]`);
  if (!li) return;
  li.classList.remove('is-active', 'is-correct', 'is-incorrect');
  if (stateClass) li.classList.add(stateClass);
}

function setSlotText(index, text, muted) {
  const slot = el(`slot-${index}`);
  if (!slot) return;
  slot.textContent = text || '';
  slot.classList.toggle('is-muted', !!muted);
}

// ----------------------------------------------------------------- study

function beginStudy() {
  game.phase = 'studying';
  game.studyPos = 0;
  phaseLabel.hidden = false;
  phaseLabel.textContent = 'Studying the route';
  studyContinue.hidden = false;
  gameIdle.hidden = true;
  runStudyStep();
}

function runStudyStep() {
  clearTimeout(game.studyTimer);
  const { studyPos, trail } = game;

  setStopState(studyPos, 'is-active');
  setSlotText(studyPos, trail[studyPos].object, false);
  liveRegion.textContent = `${trail[studyPos].place}: ${trail[studyPos].object}.`;

  if (!reduceMotion()) {
    game.studyTimer = setTimeout(advanceStudy, STUDY_STEP_MS);
  }
}

function advanceStudy() {
  clearTimeout(game.studyTimer);
  setSlotText(game.studyPos, '', true);
  setStopState(game.studyPos, null);
  game.studyPos += 1;

  if (game.studyPos < game.trail.length) {
    runStudyStep();
  } else {
    studyContinue.hidden = true;
    beginRecall();
  }
}

// ---------------------------------------------------------------- recall

function beginRecall() {
  game.phase = 'recalling';
  game.recallSequence = buildRecallSequence(game.trail.length);
  game.recallPos = 0;
  game.results = [];
  phaseLabel.textContent = 'Retracing the trail';
  recallPanel.hidden = false;
  renderRecallPrompt();
}

function currentTier() {
  return TIERS[Math.min(getTierIndex(), TIERS.length - 1)];
}

function renderRecallPrompt() {
  const item = game.recallSequence[game.recallPos];
  const stop = game.trail[item.stopIndex];
  game.choicesLocked = false;

  setStopState(item.stopIndex, 'is-active');
  feedbackLine.textContent = '';

  recallPrompt.innerHTML = item.isRepeat
    ? `Once more — which object was at <strong>${stop.place}</strong>?`
    : `Which object was at <strong>${stop.place}</strong>?`;

  const choices = buildChoices(game.trail, item.stopIndex, currentTier().choices);
  choiceGrid.innerHTML = '';
  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = choice;
    btn.addEventListener('click', () => onChoiceSelected(choice, stop.object, item));
    choiceGrid.appendChild(btn);
  });

  liveRegion.textContent = `Question ${game.recallPos + 1} of ${game.recallSequence.length}. Which object was at ${stop.place}?`;
}

function onChoiceSelected(choice, correctObject, item) {
  if (game.choicesLocked) return;
  game.choicesLocked = true;

  const isCorrect = choice === correctObject;
  game.results.push({ stopIndex: item.stopIndex, isCorrect });

  Array.from(choiceGrid.children).forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === choice) btn.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');
    else if (btn.textContent === correctObject && !isCorrect) btn.classList.add('is-reveal');
  });

  setStopState(item.stopIndex, isCorrect ? 'is-correct' : 'is-incorrect');
  feedbackLine.textContent = isCorrect
    ? `Correct — that stop held the ${correctObject}.`
    : `Not quite — that stop held the ${correctObject}.`;
  liveRegion.textContent = feedbackLine.textContent;

  const delay = reduceMotion() ? 150 : FEEDBACK_PAUSE_MS;
  setTimeout(() => {
    game.recallPos += 1;
    if (game.recallPos < game.recallSequence.length) {
      renderRecallPrompt();
    } else {
      finishTrail();
    }
  }, delay);
}

// -------------------------------------------------------------- complete

function finishTrail() {
  game.phase = 'complete';
  recallPanel.hidden = true;
  phaseLabel.textContent = 'Trail complete';

  const correctCount = game.results.filter((r) => r.isCorrect).length;
  const total = game.results.length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const tierIndex = getTierIndex();
  const newTier = adaptDifficulty(tierIndex, accuracy);
  setTierIndex(newTier);
  recordTrailCompletion(accuracy);
  renderProgress();

  completeScore.textContent = `${correctCount} of ${total} correct`;
  let direction = 'the same number of stops';
  if (newTier > tierIndex) direction = 'a few more stops';
  else if (newTier < tierIndex) direction = 'a few fewer stops';
  completeNote.textContent = `${accuracy}% accuracy. Next trail will have ${direction}.`;

  completeSummary.hidden = false;
  liveRegion.textContent = `Trail complete. ${correctCount} of ${total} correct.`;
}

// --------------------------------------------------------------- control

function startNewTrail() {
  gameIdle.hidden = true;
  completeSummary.hidden = true;
  feedbackLine.textContent = '';
  game.trail = generateTrail(getTierIndex());
  renderTrailStructure(game.trail);
  beginStudy();
}

function returnToIdle() {
  clearTimeout(game.studyTimer);
  game.phase = 'idle';
  trailEl.hidden = true;
  trailEl.innerHTML = '';
  studyContinue.hidden = true;
  recallPanel.hidden = true;
  completeSummary.hidden = true;
  phaseLabel.hidden = true;
  gameIdle.hidden = false;
}

// ------------------------------------------------------------------ init

startBtn.addEventListener('click', startNewTrail);
continueBtn.addEventListener('click', advanceStudy);
replayBtn.addEventListener('click', startNewTrail);
doneBtn.addEventListener('click', returnToIdle);

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && game.phase === 'studying' && document.activeElement === document.body) {
    e.preventDefault();
    advanceStudy();
  }
});

renderProgress();
