// Sigil Delve — card and guardian data.
//
// Every card is a plain record: what it costs, what it does, and the words
// the table shows. Nothing here is executable logic; the engine in
// engine.js reads these records and applies them. Keeping data apart from
// rules means a new card is one object, not a code change.

export const ENERGY_PER_TURN = 3;
export const CARDS_PER_HAND = 5;
export const START_HP = 40;
export const HEAL_BETWEEN_FLOORS = 5;

// A card effect is a small bag of numbers. `damage` hits the guardian,
// `block` shields you, `heal` restores you, `poison` stacks a damage-over-
// time on the guardian, `energy` refunds energy right away, `draw` pulls
// fresh cards from the deck.
export const CARDS = {
  strike:   { id: 'strike',   name: 'Strike',    glyph: '⚔', cost: 1, damage: 6,  text: 'Deal 6 damage.' },
  ward:     { id: 'ward',     name: 'Ward',      glyph: '🛡', cost: 1, block: 6,   text: 'Gain 6 block.' },
  spark:    { id: 'spark',    name: 'Spark',     glyph: '✦', cost: 0, damage: 3,  text: 'Deal 3 damage.' },
  mend:     { id: 'mend',     name: 'Mend',      glyph: '❤', cost: 2, heal: 7,    text: 'Restore 7 HP.' },
  heavy:    { id: 'heavy',    name: 'Heavy Blow',glyph: '🔨', cost: 2, damage: 13, text: 'Deal 13 damage.' },
  twin:     { id: 'twin',     name: 'Twin Cut',  glyph: '⚔', cost: 1, damage: 4,  hits: 2, text: 'Deal 4 damage, twice.' },
  ironwall: { id: 'ironwall', name: 'Iron Wall', glyph: '🛡', cost: 1, block: 13,  text: 'Gain 13 block.' },
  leech:    { id: 'leech',    name: 'Leech',     glyph: '🩸', cost: 1, damage: 5,  heal: 5, text: 'Deal 5 damage. Heal 5.' },
  focus:    { id: 'focus',    name: 'Focus',     glyph: '☀', cost: 0, energy: 2,  text: 'Gain 2 energy.' },
  venom:    { id: 'venom',    name: 'Venom',     glyph: '☠', cost: 1, poison: 4,  text: 'Apply 4 poison.' },
  cleave:   { id: 'cleave',   name: 'Cleave',    glyph: '🪓', cost: 2, damage: 9,  poison: 3, text: 'Deal 9 damage. Apply 3 poison.' },
  wind:     { id: 'wind',     name: 'Second Wind',glyph: '🌬', cost: 1, draw: 2,  text: 'Draw 2 cards.' },
  rally:    { id: 'rally',    name: 'Rally',     glyph: '⚑', cost: 1, heal: 5,    block: 4, text: 'Heal 5. Gain 4 block.' },
};

// The deck you delve with. Twelve cards, no filler: six strikes, three
// wards, two sparks, one mend.
export function starterDeck() {
  return ['strike', 'strike', 'strike', 'strike', 'strike', 'strike',
    'ward', 'ward', 'ward', 'spark', 'spark', 'mend'];
}

// The draft pool. After each guardian falls, three of these are offered and
// you keep one. The pool never runs dry: offers are drawn with replacement.
export const DRAFT_POOL = ['heavy', 'twin', 'ironwall', 'leech', 'focus',
  'venom', 'cleave', 'wind', 'rally'];

// A guardian is a script of moves, one per round, looping. Each move is
// either an attack (with a telegraphed value), a stoke (its next attack
// grows), or a harden (it banks block). The intent line on the table always
// shows the next move, so no hit ever feels unfair.
export const GUARDIANS = [
  {
    name: 'Ember Warden', glyph: '🔥', hp: 22, flavor: 'First keeper of the vault.',
    moves: [
      { kind: 'attack', value: 5 },
      { kind: 'attack', value: 7 },
      { kind: 'stoke', value: 4 },
      { kind: 'attack', value: 6 },
    ],
  },
  {
    name: 'Stone Golem', glyph: '🗿', hp: 32, flavor: 'It has never once blinked.',
    moves: [
      { kind: 'attack', value: 8 },
      { kind: 'harden', value: 8 },
      { kind: 'attack', value: 10 },
      { kind: 'attack', value: 6 },
    ],
  },
  {
    name: 'Hollow Dragon', glyph: '🐉', hp: 44, flavor: 'The vault itself, with teeth.',
    moves: [
      { kind: 'attack', value: 6 },
      { kind: 'attack', value: 9 },
      { kind: 'stoke', value: 5 },
      { kind: 'attack', value: 12 },
      { kind: 'harden', value: 10 },
    ],
  },
];

export function describeMove(move) {
  if (move.kind === 'attack') return `Attacks for ${move.value}`;
  if (move.kind === 'stoke') return `Stoking +${move.value} next hit`;
  return `Hardening +${move.value} block`;
}
