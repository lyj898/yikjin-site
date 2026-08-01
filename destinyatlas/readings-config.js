// readings-config.js — shared metadata describing the five reading
// systems and the form fields they need. This is UI-facing config
// (drives the card grid and the dynamic form), kept separate from the
// engines/ modules, which stay pure calculation with no knowledge of
// the UI at all.

export const READINGS = [
  {
    id: 'bazi',
    name: 'BaZi / Four Pillars',
    culturalLabel: 'Chinese',
    description: 'A Chinese destiny system that reads your life pattern through the year, month, day, and hour of birth.',
    bestFor: 'Personality, timing, career direction, and long-term life cycles.',
    requiredPreview: 'Birth date, time, place',
    fields: ['fullName', 'dob', 'birthTime', 'timeKnown', 'birthPlace', 'birthCountry', 'gender'],
  },
  {
    id: 'western',
    name: 'Western Astrology',
    culturalLabel: 'Western',
    description: 'A natal chart reading based on your birth date, time, and place, showing planetary placements, houses, and major themes in your life.',
    bestFor: 'Personality, relationships, and life tendencies.',
    requiredPreview: 'Birth date, time, place',
    fields: ['fullName', 'dob', 'birthTime', 'timeKnown', 'birthPlace', 'birthCountry'],
  },
  {
    id: 'vedic',
    name: 'Vedic Astrology',
    culturalLabel: 'Indian',
    description: 'An Indian birth-chart tradition that studies your ascendant, planets, houses, and timing periods from your exact birth details.',
    bestFor: 'Life path, karmic patterns, and major timing phases.',
    requiredPreview: 'Birth date, time, place',
    fields: ['fullName', 'dob', 'birthTime', 'timeKnown', 'birthPlace', 'birthCountry'],
  },
  {
    id: 'numerology',
    name: 'Numerology',
    culturalLabel: 'Number-based',
    description: 'A number-based reading drawn from your name and birth date to reveal core traits, life path, and personal cycles.',
    bestFor: 'A simple, accessible overview of character and direction.',
    requiredPreview: 'Full name, birth date',
    fields: ['fullName', 'dob'],
  },
  {
    id: 'iching',
    name: 'I Ching',
    culturalLabel: 'Oracle',
    description: 'A classical Chinese oracle that answers a specific question through a hexagram made from six yin and yang lines.',
    bestFor: 'Decisions, uncertainty, and understanding the nature of a current situation.',
    requiredPreview: 'Question / topic',
    fields: ['question', 'ichingMode'],
  },
];

// Fields shown regardless of which readings are selected, whenever at
// least one reading is selected.
export const ALWAYS_ON_FIELDS = ['focus', 'depth'];

export const FIELD_DEFS = {
  fullName: { label: 'Full name', type: 'text', required: true, autocomplete: 'name' },
  displayName: { label: 'Display name (optional)', type: 'text', required: false, autocomplete: 'nickname' },
  dob: { label: 'Birth date', type: 'date', required: true },
  birthTime: { label: 'Birth time', type: 'time', required: false },
  timeKnown: { label: 'I don’t know my exact birth time', type: 'toggle' },
  birthPlace: { label: 'Birth city', type: 'text', required: true },
  birthCountry: { label: 'Birth country', type: 'text', required: true },
  gender: {
    label: 'Gender (optional — used only by BaZi interpretation)',
    type: 'select',
    options: [
      { value: '', label: 'Not specified' },
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
    ],
  },
  question: { label: 'Question or topic', type: 'textarea', required: true },
  ichingMode: {
    label: 'Casting mode',
    type: 'segmented',
    options: [
      { value: 'cast', label: 'System-generated cast' },
      { value: 'manual', label: 'Manual hexagram input' },
    ],
  },
  focus: {
    label: 'Main focus area',
    type: 'chips',
    options: [
      { value: 'general', label: 'General' },
      { value: 'career', label: 'Career' },
      { value: 'wealth', label: 'Wealth' },
      { value: 'relationships', label: 'Relationships' },
      { value: 'family', label: 'Family' },
      { value: 'health', label: 'Health' },
      { value: 'timing', label: 'Timing' },
    ],
  },
  depth: {
    label: 'Reading depth',
    type: 'segmented',
    options: [
      { value: 'quick', label: 'Quick' },
      { value: 'standard', label: 'Standard' },
      { value: 'comprehensive', label: 'Comprehensive' },
    ],
  },
};

export const SYSTEM_LABELS = {
  bazi: 'BaZi / Four Pillars',
  western: 'Western Astrology',
  vedic: 'Vedic Astrology',
  numerology: 'Numerology',
  iching: 'I Ching',
};
