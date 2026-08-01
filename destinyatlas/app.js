// app.js — UI layer: card selection, dynamic form composition,
// requirements summary, and results rendering. All actual reading
// logic lives in engines/*.js and is imported, never reimplemented
// here.

import { READINGS, ALWAYS_ON_FIELDS, FIELD_DEFS, SYSTEM_LABELS } from './readings-config.js';
import { buildNumerologyReading } from './engines/numerology.js';
import { buildIChingReading } from './engines/iching.js';
import { buildWesternReading } from './engines/western.js';
import { buildBaziReading } from './engines/bazi.js';
import { buildVedicReading } from './engines/vedic.js';

const FIELD_ORDER = [
  'fullName', 'displayName', 'dob', 'birthTime', 'timeKnown',
  'birthPlace', 'birthCountry', 'gender',
  'question', 'ichingMode',
  'focus', 'depth',
];

const el = (id) => document.getElementById(id);

const cardsContainer = el('reading-cards');
const formEmptyState = el('form-empty-state');
const dynamicFields = el('dynamic-fields');
const requirementsSection = el('requirements-section');
const requirementsList = el('requirements-list');
const requirementsLimitation = el('requirements-limitation');
const generateBtn = el('generate-btn');
const resetBtn = el('reset-btn');
const formError = el('form-error');
const resultsSection = el('results');
const resultsList = el('results-list');
const editInputsBtn = el('edit-inputs-btn');
const resetResultsBtn = el('reset-results-btn');
const liveRegion = el('live-region');

// ------------------------------------------------------------------ state

const state = {
  selected: new Set(),
  values: { focus: 'general', depth: 'standard', ichingMode: 'cast', timeKnown: false },
  manualLines: ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'],
};

function selectedReadings() {
  return READINGS.filter((r) => state.selected.has(r.id));
}

function activeFieldIds() {
  const ids = new Set(state.selected.size ? ALWAYS_ON_FIELDS : []);
  selectedReadings().forEach((r) => r.fields.forEach((f) => ids.add(f)));
  return ids;
}

// -------------------------------------------------------------- card grid

function renderCards() {
  cardsContainer.innerHTML = '';
  READINGS.forEach((reading) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'reading-card';
    card.setAttribute('aria-pressed', 'false');
    card.dataset.id = reading.id;

    card.innerHTML = `
      <div class="reading-card-top">
        <div>
          <span class="culture-tag">${reading.culturalLabel}</span>
        </div>
        <span class="select-indicator" aria-hidden="true"></span>
      </div>
      <h3>${reading.name}</h3>
      <p class="desc">${reading.description}</p>
      <p class="best-for"><strong>Best for —</strong> ${reading.bestFor}</p>
      <p class="required-preview">Needs: ${reading.requiredPreview}</p>
    `;

    card.addEventListener('click', () => toggleReading(reading.id));
    cardsContainer.appendChild(card);
  });
}

function toggleReading(id) {
  if (state.selected.has(id)) state.selected.delete(id);
  else state.selected.add(id);

  cardsContainer.querySelectorAll('.reading-card').forEach((card) => {
    const isSelected = state.selected.has(card.dataset.id);
    card.classList.toggle('is-selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  });

  renderForm();
  updateRequirements();
  updateGenerateState();
}

// ------------------------------------------------------------------ form

function fieldWrapper(fieldId, controlHtml, { span2 = false, extraClass = '' } = {}) {
  const def = FIELD_DEFS[fieldId];
  const wrap = document.createElement('div');
  wrap.className = `field${span2 ? ' span-2' : ''} ${extraClass}`.trim();
  wrap.dataset.field = fieldId;
  const labelHtml = def.type === 'toggle' ? '' : `<label for="f-${fieldId}">${def.label}${def.required ? '' : ''}</label>`;
  wrap.innerHTML = `${labelHtml}${controlHtml}`;
  return wrap;
}

function renderTextLike(fieldId, type) {
  const def = FIELD_DEFS[fieldId];
  // Build the control with no value in the markup, then assign .value as a
  // DOM property below — property assignment never parses HTML, so this
  // sidesteps any risk of a previously-typed value (name, question, etc.)
  // breaking out of the attribute/text context when the field is rebuilt.
  const input = type === 'textarea'
    ? `<textarea id="f-${fieldId}" ${def.required ? 'required' : ''}></textarea>`
    : `<input type="${type}" id="f-${fieldId}" ${def.autocomplete ? `autocomplete="${def.autocomplete}"` : ''} ${def.required ? 'required' : ''}>`;
  const wrap = fieldWrapper(fieldId, input, { span2: type === 'textarea' });
  const control = wrap.querySelector('input, textarea');
  control.value = state.values[fieldId] || '';
  control.addEventListener('input', () => {
    state.values[fieldId] = control.value;
    updateRequirements();
    updateGenerateState();
  });
  return wrap;
}

function renderSelect(fieldId) {
  const def = FIELD_DEFS[fieldId];
  const value = state.values[fieldId] || '';
  const options = def.options.map((o) => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('');
  const wrap = fieldWrapper(fieldId, `<select id="f-${fieldId}">${options}</select>`);
  wrap.querySelector('select').addEventListener('change', (e) => {
    state.values[fieldId] = e.target.value;
    updateRequirements();
  });
  return wrap;
}

function renderToggle(fieldId) {
  const def = FIELD_DEFS[fieldId];
  const checked = !!state.values[fieldId];
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.dataset.field = fieldId;
  wrap.innerHTML = `
    <label class="toggle-field" for="f-${fieldId}">
      <input type="checkbox" id="f-${fieldId}" ${checked ? 'checked' : ''}>
      <span>${def.label}</span>
    </label>
  `;
  wrap.querySelector('input').addEventListener('change', (e) => {
    state.values[fieldId] = e.target.checked;
    const birthTimeField = dynamicFields.querySelector('[data-field="birthTime"]');
    if (birthTimeField) birthTimeField.classList.toggle('is-suppressed', e.target.checked);
    updateRequirements();
  });
  return wrap;
}

function renderChips(fieldId) {
  const def = FIELD_DEFS[fieldId];
  const value = state.values[fieldId];
  const wrap = document.createElement('div');
  wrap.className = 'field span-2';
  wrap.dataset.field = fieldId;
  const label = document.createElement('label');
  label.textContent = def.label;
  wrap.appendChild(label);
  const group = document.createElement('div');
  group.className = 'chip-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', def.label);

  def.options.forEach((opt) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${opt.value === value ? ' is-active' : ''}`;
    chip.textContent = opt.label;
    chip.setAttribute('aria-pressed', String(opt.value === value));
    chip.addEventListener('click', () => {
      state.values[fieldId] = opt.value;
      group.querySelectorAll('.chip').forEach((c) => {
        c.classList.remove('is-active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('is-active');
      chip.setAttribute('aria-pressed', 'true');
      updateRequirements();
    });
    group.appendChild(chip);
  });

  wrap.appendChild(group);
  return wrap;
}

function renderSegmented(fieldId, onChange) {
  const def = FIELD_DEFS[fieldId];
  const value = state.values[fieldId];
  const wrap = document.createElement('div');
  wrap.className = 'field span-2';
  wrap.dataset.field = fieldId;
  const label = document.createElement('label');
  label.textContent = def.label;
  wrap.appendChild(label);
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', def.label);

  def.options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = opt.value === value ? 'is-active' : '';
    btn.textContent = opt.label;
    btn.setAttribute('aria-pressed', String(opt.value === value));
    btn.addEventListener('click', () => {
      state.values[fieldId] = opt.value;
      group.querySelectorAll('button').forEach((b) => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');
      updateRequirements();
      if (onChange) onChange(opt.value);
    });
    group.appendChild(btn);
  });

  wrap.appendChild(group);
  return wrap;
}

function renderManualLinePicker() {
  const wrap = document.createElement('div');
  wrap.className = 'field span-2';
  wrap.dataset.field = 'manualLines';
  const label = document.createElement('label');
  label.textContent = 'Hexagram lines (bottom to top)';
  wrap.appendChild(label);

  const picker = document.createElement('div');
  picker.className = 'line-picker';

  state.manualLines.forEach((val, i) => {
    const row = document.createElement('div');
    row.className = 'line-row';
    const lineLabel = document.createElement('span');
    lineLabel.className = 'line-label';
    lineLabel.textContent = `Line ${i + 1}${i === 0 ? ' (bottom)' : i === 5 ? ' (top)' : ''}`;
    row.appendChild(lineLabel);

    const seg = document.createElement('div');
    seg.className = 'segmented';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', `Line ${i + 1} type`);
    [['yang', 'Solid (Yang)'], ['yin', 'Broken (Yin)']].forEach(([v, l]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = l;
      btn.className = v === val ? 'is-active' : '';
      btn.setAttribute('aria-pressed', String(v === val));
      btn.addEventListener('click', () => {
        state.manualLines[i] = v;
        seg.querySelectorAll('button').forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
      });
      seg.appendChild(btn);
    });
    row.appendChild(seg);
    picker.appendChild(row);
  });

  wrap.appendChild(picker);
  return wrap;
}

function renderForm() {
  const active = activeFieldIds();
  dynamicFields.innerHTML = '';

  if (active.size === 0) {
    formEmptyState.hidden = false;
    dynamicFields.hidden = true;
    return;
  }
  formEmptyState.hidden = true;
  dynamicFields.hidden = false;

  FIELD_ORDER.filter((f) => active.has(f)).forEach((fieldId) => {
    const def = FIELD_DEFS[fieldId];
    let node;
    switch (def.type) {
      case 'text': node = renderTextLike(fieldId, 'text'); break;
      case 'date': node = renderTextLike(fieldId, 'date'); break;
      case 'time': node = renderTextLike(fieldId, 'time'); break;
      case 'textarea': node = renderTextLike(fieldId, 'textarea'); break;
      case 'select': node = renderSelect(fieldId); break;
      case 'toggle': node = renderToggle(fieldId); break;
      case 'chips': node = renderChips(fieldId); break;
      case 'segmented':
        node = renderSegmented(fieldId, fieldId === 'ichingMode' ? () => renderForm() : undefined);
        break;
      default: return;
    }
    if (fieldId === 'birthTime' && state.values.timeKnown) node.classList.add('is-suppressed');
    dynamicFields.appendChild(node);
  });

  if (state.selected.has('iching') && state.values.ichingMode === 'manual') {
    dynamicFields.appendChild(renderManualLinePicker());
  }
}

// ----------------------------------------------------------- requirements

function updateRequirements() {
  if (state.selected.size === 0) {
    requirementsSection.hidden = true;
    return;
  }
  requirementsSection.hidden = false;

  const active = activeFieldIds();
  const required = [];
  const optional = [];

  FIELD_ORDER.filter((f) => active.has(f)).forEach((f) => {
    const def = FIELD_DEFS[f];
    if (['toggle', 'chips', 'segmented'].includes(def.type)) return; // preferences, not "needed data"
    if (f === 'birthTime' && state.values.timeKnown) return;
    (def.required ? required : optional).push(def.label);
  });

  requirementsList.innerHTML = '';
  const names = selectedReadings().map((r) => r.name).join(', ');
  const summaryLi = document.createElement('li');
  summaryLi.textContent = `Selected: ${names}.`;
  requirementsList.appendChild(summaryLi);

  if (required.length) {
    const li = document.createElement('li');
    li.textContent = `We need: ${required.join(', ')}.`;
    requirementsList.appendChild(li);
  }
  if (optional.length) {
    const li = document.createElement('li');
    li.textContent = `Improves depth if provided: ${optional.join(', ')}.`;
    requirementsList.appendChild(li);
  }

  const chartBased = selectedReadings().some((r) => ['bazi', 'western', 'vedic'].includes(r.id));
  if (chartBased && state.values.timeKnown) {
    requirementsLimitation.hidden = false;
    requirementsLimitation.textContent = 'Without an exact birth time, chart-based readings in this selection will be more general.';
  } else {
    requirementsLimitation.hidden = true;
  }
}

// --------------------------------------------------------------- generate

function validate() {
  const active = activeFieldIds();
  const missing = [];
  FIELD_ORDER.filter((f) => active.has(f)).forEach((f) => {
    const def = FIELD_DEFS[f];
    if (!def.required) return;
    if (f === 'birthTime' && state.values.timeKnown) return;
    if (!state.values[f] || !String(state.values[f]).trim()) missing.push(def.label);
  });
  return missing;
}

function updateGenerateState() {
  generateBtn.disabled = state.selected.size === 0;
}

function combinedBirthPlace(v) {
  return [v.birthPlace, v.birthCountry].filter((s) => s && s.trim()).join(', ');
}

// state.values.timeKnown tracks the "I don't know my exact birth time"
// checkbox (true = NOT known), so it's inverted here to the timeKnown
// flag the engines expect (true = known).
const BUILDERS = {
  numerology: (v) => buildNumerologyReading({ fullName: v.fullName, dob: v.dob, focus: v.focus }),
  iching: (v) => buildIChingReading({
    question: v.question,
    mode: v.ichingMode,
    lineTypes: v.ichingMode === 'manual' ? state.manualLines : undefined,
  }),
  western: (v) => buildWesternReading({ dob: v.dob, timeKnown: !v.timeKnown, birthTime: v.birthTime, birthPlace: combinedBirthPlace(v), focus: v.focus }),
  bazi: (v) => buildBaziReading({ dob: v.dob, timeKnown: !v.timeKnown, birthTime: v.birthTime, birthPlace: combinedBirthPlace(v), focus: v.focus }),
  vedic: (v) => buildVedicReading({ dob: v.dob, timeKnown: !v.timeKnown, birthTime: v.birthTime, birthPlace: combinedBirthPlace(v), focus: v.focus }),
};

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function renderResultCard(reading, result) {
  const card = document.createElement('article');
  card.className = 'result-card';

  // inputsUsed echoes back raw user text (name, question, birthplace) —
  // escape it before it goes into innerHTML below.
  const inputsHtml = Object.entries(result.inputsUsed || {})
    .map(([k, v]) => `<span><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</span>`).join('');

  const extraBlocks = [];
  if (result.hexagramSymbol) {
    extraBlocks.push(`<div class="result-block"><div class="label">Hexagram</div><div class="hex-symbol">${result.hexagramSymbol}</div></div>`);
  }
  if (result.guidance) {
    extraBlocks.push(`<div class="result-block"><div class="label">Guidance</div><div class="value">${result.guidance}</div></div>`);
  }
  if (result.extra) {
    extraBlocks.push(`<div class="result-block"><div class="label">Additional detail</div><div class="value">${result.extra}</div></div>`);
  }
  if (result.cycleNote) {
    extraBlocks.push(`<div class="result-block"><div class="label">Cycle note</div><div class="value">${result.cycleNote}</div></div>`);
  }

  card.innerHTML = `
    <div class="result-card-head">
      <div>
        <h3>${SYSTEM_LABELS[reading.id]}${result.isFramework ? '<span class="framework-badge">Structured framework</span>' : ''}</h3>
        <span class="culture-tag">${reading.culturalLabel}</span>
      </div>
    </div>
    <div class="result-inputs">${inputsHtml}</div>
    <div class="result-block">
      <div class="label">Core snapshot</div>
      <div class="value snapshot">${result.snapshot}</div>
    </div>
    <div class="result-block">
      <div class="label">Strengths / tendencies</div>
      <div class="value">${result.strengths}</div>
    </div>
    <div class="result-block">
      <div class="label">Watch-outs</div>
      <div class="value">${result.watchOuts}</div>
    </div>
    <div class="result-block">
      <div class="label">Focus-area interpretation</div>
      <div class="value">${result.focusInterpretation}</div>
    </div>
    ${extraBlocks.join('')}
    <div class="result-block">
      <div class="label">Confidence / precision note</div>
      <div class="value muted">${result.confidenceNote}</div>
    </div>
  `;
  return card;
}

function generateReading() {
  const missing = validate();
  if (missing.length) {
    formError.textContent = `Please complete: ${missing.join(', ')}.`;
    return;
  }
  formError.textContent = '';

  resultsList.innerHTML = '';
  selectedReadings().forEach((reading) => {
    const result = BUILDERS[reading.id](state.values);
    resultsList.appendChild(renderResultCard(reading, result));
  });

  resultsSection.classList.add('has-results');
  liveRegion.textContent = `Reading generated for ${selectedReadings().length} system${selectedReadings().length === 1 ? '' : 's'}.`;
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetAll() {
  state.selected.clear();
  state.values = { focus: 'general', depth: 'standard', ichingMode: 'cast', timeKnown: false };
  state.manualLines = ['yang', 'yang', 'yang', 'yang', 'yang', 'yang'];
  renderCards();
  renderForm();
  updateRequirements();
  updateGenerateState();
  resultsSection.classList.remove('has-results');
  resultsList.innerHTML = '';
  formError.textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ------------------------------------------------------------------ init

generateBtn.addEventListener('click', generateReading);
resetBtn.addEventListener('click', resetAll);
resetResultsBtn.addEventListener('click', resetAll);
editInputsBtn.addEventListener('click', () => {
  document.getElementById('form-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

renderCards();
renderForm();
updateRequirements();
updateGenerateState();
