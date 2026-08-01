// app.js — UI layer: state, DOM wiring, chart rendering, URL state.
// All math lives in calc.js. This file never computes a balance or an
// interest figure itself — it only calls into the engine and renders
// whatever comes back.

import { calculateGrowth, normalizeBands, summarize } from './calc.js';

// ---------------------------------------------------------------- defaults

const DEFAULTS = {
  principal: 10000,
  monthly: 500,
  rate: 7,
  years: 20,
  compounding: 'monthly',
  advancedMode: false,
  bands: [
    { fromYear: 1, toYear: 10, ratePercent: 6 },
    { fromYear: 11, toYear: 20, ratePercent: 8 },
  ],
  inflationAdjust: false,
  inflationRate: 3,
  viewReal: false,
};

// ------------------------------------------------------------------ utils

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function num(v, fallback) { const n = parseFloat(v); return Number.isFinite(n) ? n : fallback; }

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const currencyFmt = new Intl.NumberFormat('en-SG', {
  style: 'currency', currency: 'SGD', maximumFractionDigits: 0,
});
function fmtCurrency(v) { return currencyFmt.format(Number.isFinite(v) ? v : 0); }
function fmtPercent(v) { return `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`; }
function fmtCompact(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
}

function deepCloneDefaults() {
  return {
    ...DEFAULTS,
    bands: DEFAULTS.bands.map((b) => ({ ...b })),
  };
}

// -------------------------------------------------------- URL <-> state

function parseBandsParam(str) {
  try {
    return str.split(',').map((part) => {
      const [range, rate] = part.split(':');
      const [from, to] = range.split('-').map(Number);
      return { fromYear: from, toYear: to, ratePercent: parseFloat(rate) };
    }).filter((b) => Number.isFinite(b.fromYear) && Number.isFinite(b.toYear) && Number.isFinite(b.ratePercent));
  } catch {
    return [];
  }
}

function encodeBandsParam(bands) {
  return bands.map((b) => `${b.fromYear}-${b.toYear}:${b.ratePercent}`).join(',');
}

function readStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const s = deepCloneDefaults();

  if (params.has('principal')) s.principal = clamp(num(params.get('principal'), s.principal), 0, 1000000);
  if (params.has('monthly')) s.monthly = clamp(num(params.get('monthly'), s.monthly), 0, 20000);
  if (params.has('rate')) s.rate = clamp(num(params.get('rate'), s.rate), 0, 20);
  if (params.has('years')) s.years = clamp(Math.round(num(params.get('years'), s.years)), 1, 40);
  if (params.has('compounding') && ['monthly', 'quarterly', 'annually'].includes(params.get('compounding'))) {
    s.compounding = params.get('compounding');
  }
  if (params.has('adv')) s.advancedMode = params.get('adv') === '1';
  if (params.has('bands')) {
    const parsed = parseBandsParam(params.get('bands'));
    if (parsed.length) s.bands = parsed;
  }
  if (params.has('inflation')) s.inflationAdjust = params.get('inflation') === '1';
  if (params.has('inflrate')) s.inflationRate = clamp(num(params.get('inflrate'), s.inflationRate), 0, 10);
  if (params.has('view')) s.viewReal = params.get('view') === 'real' && s.inflationAdjust;

  s.bands = normalizeBands(s.bands, s.years);
  return s;
}

function syncURL() {
  const params = new URLSearchParams();
  params.set('principal', state.principal);
  params.set('monthly', state.monthly);
  params.set('years', state.years);
  params.set('compounding', state.compounding);
  if (state.advancedMode) {
    params.set('adv', '1');
    params.set('bands', encodeBandsParam(state.bands));
  } else {
    params.set('rate', state.rate);
  }
  if (state.inflationAdjust) {
    params.set('inflation', '1');
    params.set('inflrate', state.inflationRate);
    params.set('view', state.viewReal ? 'real' : 'nominal');
  }
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}
const debouncedSyncURL = debounce(syncURL, 400);

// ------------------------------------------------------------------ state

const state = readStateFromURL();

// -------------------------------------------------------------- DOM refs

const el = (id) => document.getElementById(id);

const principalNumber = el('principal-number');
const principalRange = el('principal-range');
const monthlyNumber = el('monthly-number');
const monthlyRange = el('monthly-range');
const rateNumber = el('rate-number');
const rateRange = el('rate-range');
const yearsNumber = el('years-number');
const yearsRange = el('years-range');
const compoundingSelect = el('compounding-select');

const flatRateControl = el('flat-rate-control');
const advancedToggle = el('advanced-toggle');
const advancedPanel = el('advanced-panel');
const bandsList = el('bands-list');
const addBandBtn = el('add-band');

const inflationToggle = el('inflation-toggle');
const inflationRateRow = el('inflation-rate-row');
const inflationNumber = el('inflation-number');

const statFinal = el('stat-final');
const statContributed = el('stat-contributed');
const statInterest = el('stat-interest');
const statShare = el('stat-share');

const viewNominalBtn = el('view-nominal');
const viewRealBtn = el('view-real');
const chartLoading = el('chart-loading');
const chartCanvas = el('growthChart');

const liveRegion = el('live-region');
const tbody = el('breakdown-tbody');

// --------------------------------------------------------- initial hydrate

principalNumber.value = state.principal;
principalRange.value = state.principal;
monthlyNumber.value = state.monthly;
monthlyRange.value = state.monthly;
rateNumber.value = state.rate;
rateRange.value = state.rate;
yearsNumber.value = state.years;
yearsRange.value = state.years;
compoundingSelect.value = state.compounding;

advancedToggle.checked = state.advancedMode;
advancedPanel.hidden = !state.advancedMode;
flatRateControl.hidden = state.advancedMode;

inflationToggle.checked = state.inflationAdjust;
inflationRateRow.hidden = !state.inflationAdjust;
inflationNumber.value = state.inflationRate;

// ------------------------------------------------------- rAF-batched loop

let dirty = false;
function markDirty() { dirty = true; }

function tick() {
  if (dirty) {
    dirty = false;
    recomputeAndRender();
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// --------------------------------------------------------------- bindings

function bindPair(numberEl, rangeEl, onChange) {
  const handle = (raw) => {
    const value = Number(raw);
    numberEl.value = value;
    rangeEl.value = value;
    rangeEl.setAttribute('aria-valuetext', String(value));
    onChange(value);
    markDirty();
  };
  numberEl.addEventListener('input', () => handle(numberEl.value));
  rangeEl.addEventListener('input', () => handle(rangeEl.value));
}

bindPair(principalNumber, principalRange, (v) => { state.principal = v; });
bindPair(monthlyNumber, monthlyRange, (v) => { state.monthly = v; });
bindPair(rateNumber, rateRange, (v) => { state.rate = v; });
bindPair(yearsNumber, yearsRange, (v) => {
  state.years = Math.round(v);
  if (state.advancedMode) {
    state.bands = normalizeBands(state.bands, state.years);
    renderBandsList();
  }
});

compoundingSelect.addEventListener('change', () => {
  state.compounding = compoundingSelect.value;
  markDirty();
});

advancedToggle.addEventListener('change', () => {
  state.advancedMode = advancedToggle.checked;
  advancedPanel.hidden = !state.advancedMode;
  flatRateControl.hidden = state.advancedMode;
  if (state.advancedMode) {
    state.bands = normalizeBands(state.bands, state.years);
    renderBandsList();
  }
  markDirty();
});

inflationToggle.addEventListener('change', () => {
  state.inflationAdjust = inflationToggle.checked;
  inflationRateRow.hidden = !state.inflationAdjust;
  if (!state.inflationAdjust) setView(false);
  updateViewToggleAvailability();
  markDirty();
});

inflationNumber.addEventListener('input', () => {
  state.inflationRate = num(inflationNumber.value, state.inflationRate);
  markDirty();
});

addBandBtn.addEventListener('click', () => {
  const last = state.bands[state.bands.length - 1];
  const span = last.toYear - last.fromYear;
  if (span < 1) return; // no room left to split
  const mid = last.fromYear + Math.floor(span / 2);
  const newBand = { fromYear: last.fromYear, toYear: mid, ratePercent: last.ratePercent };
  last.fromYear = mid + 1;
  state.bands.splice(state.bands.length - 1, 0, newBand);
  renderBandsList();
  markDirty();
});

viewNominalBtn.addEventListener('click', () => setView(false));
viewRealBtn.addEventListener('click', () => setView(true));

function setView(real) {
  if (real && !state.inflationAdjust) return;
  state.viewReal = real;
  viewNominalBtn.classList.toggle('is-active', !real);
  viewNominalBtn.setAttribute('aria-pressed', String(!real));
  viewRealBtn.classList.toggle('is-active', real);
  viewRealBtn.setAttribute('aria-pressed', String(real));
  markDirty();
}

function updateViewToggleAvailability() {
  viewRealBtn.disabled = !state.inflationAdjust;
  viewRealBtn.style.opacity = state.inflationAdjust ? '1' : '0.4';
  viewRealBtn.style.cursor = state.inflationAdjust ? 'pointer' : 'not-allowed';
}

// ------------------------------------------------------- advanced bands UI

function renderBandsList() {
  bandsList.innerHTML = '';

  state.bands.forEach((band, i) => {
    const isLast = i === state.bands.length - 1;
    const row = document.createElement('div');
    row.className = 'band-row';

    const yearsSpan = document.createElement('div');
    yearsSpan.className = 'band-years';

    if (isLast) {
      const label = document.createElement('span');
      label.textContent = `Years ${band.fromYear}–${band.toYear}`;
      yearsSpan.appendChild(label);
    } else {
      const prefix = document.createElement('span');
      prefix.textContent = `Years ${band.fromYear}–`;
      yearsSpan.appendChild(prefix);

      const toInput = document.createElement('input');
      toInput.type = 'number';
      toInput.min = String(band.fromYear);
      toInput.max = String(state.years - 1);
      toInput.value = String(band.toYear);
      toInput.setAttribute('aria-label', `End year for band starting year ${band.fromYear}`);
      toInput.addEventListener('input', () => {
        band.toYear = clamp(Math.round(num(toInput.value, band.toYear)), band.fromYear, state.years - 1);
        state.bands = normalizeBands(state.bands, state.years);
        renderBandsList();
        markDirty();
      });
      yearsSpan.appendChild(toInput);
    }
    row.appendChild(yearsSpan);

    const rateLabel = document.createElement('label');
    rateLabel.className = 'band-rate-label';
    rateLabel.appendChild(document.createTextNode('Rate '));

    const rateInput = document.createElement('input');
    rateInput.type = 'number';
    rateInput.className = 'band-rate';
    rateInput.min = '0';
    rateInput.max = '20';
    rateInput.step = '0.1';
    rateInput.value = String(band.ratePercent);
    rateInput.setAttribute('aria-label', `Return rate percent for years ${band.fromYear} to ${band.toYear}`);
    rateInput.addEventListener('input', () => {
      band.ratePercent = num(rateInput.value, band.ratePercent);
      markDirty();
    });
    rateLabel.appendChild(rateInput);
    rateLabel.appendChild(document.createTextNode('%'));
    row.appendChild(rateLabel);

    if (state.bands.length > 1) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-band';
      removeBtn.setAttribute('aria-label', `Remove band for years ${band.fromYear} to ${band.toYear}`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        state.bands.splice(i, 1);
        state.bands = normalizeBands(state.bands, state.years);
        renderBandsList();
        markDirty();
      });
      row.appendChild(removeBtn);
    }

    bandsList.appendChild(row);
  });
}

// ------------------------------------------------------------ calc input

function buildCalcInputs() {
  return {
    principal: state.principal,
    monthlyContribution: state.monthly,
    years: state.years,
    compounding: state.compounding,
    annualRatePercent: state.rate,
    bands: state.advancedMode ? normalizeBands(state.bands, state.years) : [],
    inflationAdjust: state.inflationAdjust,
    inflationRatePercent: state.inflationRate,
  };
}

// ---------------------------------------------------------------- render

function renderStats(breakdown) {
  const useReal = state.inflationAdjust && state.viewReal;
  const { finalBalance, totalContributed, totalInterest, interestSharePercent } = summarize(breakdown, useReal);
  statFinal.textContent = fmtCurrency(finalBalance);
  statContributed.textContent = fmtCurrency(totalContributed);
  statInterest.textContent = fmtCurrency(totalInterest);
  statShare.textContent = fmtPercent(interestSharePercent);
}

function renderTable(breakdown) {
  const useReal = state.inflationAdjust && state.viewReal;
  const rows = breakdown.map((row) => {
    const balance = useReal ? row.balanceReal : row.balanceNominal;
    return `<tr>
      <td>${row.year}</td>
      <td>${row.ratePercent.toFixed(1)}%</td>
      <td>${fmtCurrency(row.contributions)}</td>
      <td>${fmtCurrency(row.interestEarned)}</td>
      <td>${fmtCurrency(balance)}</td>
    </tr>`;
  }).join('');
  tbody.innerHTML = rows;
}

const announce = debounce((breakdown) => {
  const useReal = state.inflationAdjust && state.viewReal;
  const { finalBalance } = summarize(breakdown, useReal);
  liveRegion.textContent = `Projected balance: ${fmtCurrency(finalBalance)} after ${state.years} years.`;
}, 600);

// -------------------------------------------------------------- chart.js

let ChartCtor = null;
let chartInstance = null;
let chartFailed = false;

async function ensureChartLoaded() {
  if (ChartCtor || chartFailed) return ChartCtor;
  try {
    const mod = await import('https://esm.sh/chart.js@4.4.4/auto');
    ChartCtor = mod.Chart || mod.default;
  } catch (err) {
    chartFailed = true;
    chartLoading.textContent = 'Chart unavailable in this environment — see the summary stats and table below.';
    console.warn('GrowthSim: chart library failed to load', err);
  }
  return ChartCtor;
}

function buildChartSeries(breakdown, useReal) {
  const labels = breakdown.map((r) => r.year);
  const contributions = breakdown.map((r) => (useReal ? r.cumulativeContributionsReal : r.cumulativeContributions));
  const interest = breakdown.map((r, i) => (useReal ? r.balanceReal : r.balanceNominal) - contributions[i]);
  return { labels, contributions, interest };
}

async function renderChart(breakdown) {
  const useReal = state.inflationAdjust && state.viewReal;
  const { labels, contributions, interest } = buildChartSeries(breakdown, useReal);

  if (!chartInstance) {
    const Chart = await ensureChartLoaded();
    if (!Chart) return;

    chartLoading.hidden = true;
    chartCanvas.hidden = false;

    chartInstance = new Chart(chartCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Contributions',
            data: contributions,
            borderColor: '#57544c',
            backgroundColor: 'rgba(87, 84, 76, 0.14)',
            fill: true,
            stack: 'total',
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 1.5,
          },
          {
            label: 'Interest earned',
            data: interest,
            borderColor: '#9C8355',
            backgroundColor: 'rgba(156, 131, 85, 0.22)',
            fill: true,
            stack: 'total',
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 260, easing: 'easeOutQuad' },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#57544c', font: { family: 'Inter', size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: '#E9E7E0' },
            ticks: {
              color: '#57544c',
              font: { family: 'Inter', size: 11 },
              callback: (v) => fmtCompact(v),
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#171613', font: { family: 'Inter', size: 11 }, boxWidth: 10, boxHeight: 10 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.parsed.y)}`,
              footer: (items) => {
                const total = items.reduce((sum, i) => sum + i.parsed.y, 0);
                return `Total: ${fmtCurrency(total)}`;
              },
            },
          },
        },
      },
    });
    return;
  }

  // Mutate existing dataset arrays in place, then update — Chart.js
  // animates between the old and new shape instead of a hard redraw.
  chartInstance.data.labels = labels;
  chartInstance.data.datasets[0].data = contributions;
  chartInstance.data.datasets[1].data = interest;
  chartInstance.update();
}

// --------------------------------------------------------------- pipeline

function recomputeAndRender() {
  const inputs = buildCalcInputs();
  const breakdown = calculateGrowth(inputs);

  renderStats(breakdown);
  renderTable(breakdown);
  renderChart(breakdown);
  announce(breakdown);
  debouncedSyncURL();
}

// ------------------------------------------------------------------ init

if (state.advancedMode) renderBandsList();
else renderBandsList(); // keep rows populated even if hidden, so toggling on shows current data
updateViewToggleAvailability();
setView(state.viewReal);
markDirty();
