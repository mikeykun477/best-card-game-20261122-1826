// Ember Sigils — constants: elements, card kinds, deck recipe, tuning numbers.
// An original duel: four sigil elements in a beating cycle, three card kinds.
export const MAX_HP = 30;
export const HAND_SIZE = 5;
export const MAX_CHARGE = 6;
export const ELEMENT_BEAT_BONUS = 2;

export const ELEMENTS = {
  flame: { name: 'Flame', glyph: '🔥', beats: 'gale', weakTo: 'wave', color: '#e74c3c' },
  wave: { name: 'Wave', glyph: '💧', beats: 'flame', weakTo: 'stone', color: '#2e86c1' },
  stone: { name: 'Stone', glyph: '🪨', beats: 'wave', weakTo: 'gale', color: '#8d6e63' },
  gale: { name: 'Gale', glyph: '🍃', beats: 'stone', weakTo: 'flame', color: '#27ae60' },
};

export const KINDS = {
  attack: { label: 'Strike', verb: 'strikes for' },
  guard: { label: 'Guard', verb: 'guards' },
  surge: { label: 'Surge', verb: 'charges' },
};

// One entry per card in a fresh deck: [kind, element, value].
// Attacks hit, guards block the next hit, surges bank charge that boosts the next strike.
export const DECK_RECIPE = [
  ['attack', 'flame', 7], ['attack', 'flame', 5], ['attack', 'flame', 4], ['attack', 'flame', 3],
  ['attack', 'wave', 7], ['attack', 'wave', 5], ['attack', 'wave', 4], ['attack', 'wave', 3],
  ['attack', 'stone', 6], ['attack', 'stone', 5], ['attack', 'stone', 4], ['attack', 'stone', 3],
  ['attack', 'gale', 6], ['attack', 'gale', 5], ['attack', 'gale', 4], ['attack', 'gale', 3],
  ['guard', 'flame', 5], ['guard', 'wave', 5], ['guard', 'stone', 6], ['guard', 'gale', 4],
  ['guard', 'flame', 4], ['guard', 'wave', 4], ['guard', 'stone', 4], ['guard', 'gale', 5],
  ['surge', 'flame', 3], ['surge', 'wave', 3], ['surge', 'stone', 2], ['surge', 'gale', 2],
  ['surge', 'flame', 2], ['surge', 'wave', 2], ['surge', 'stone', 3], ['surge', 'gale', 3],
];

export const CARD_NAMES = {
  attack: { flame: 'Ember Slash', wave: 'Tide Cut', stone: 'Quake Blow', gale: 'Storm Lash' },
  guard: { flame: 'Cinder Wall', wave: 'Still Pool', stone: 'Granite Ward', gale: 'Wind Veil' },
  surge: { flame: 'Kindle', wave: 'Swell', stone: 'Deep Root', gale: 'Gather Wind' },
};

export const FOE_NAME = 'Pyra, Ember Warden';
export const YOU_NAME = 'You — Sigil Duelist';
