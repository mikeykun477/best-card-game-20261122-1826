// Ember Sigils — the duel itself: state, setup, and one round of play.
// Both duelists play one card face up at the same time, then the round
// resolves: surges charge, guards raise a ward, strikes land with charge
// and elemental bonuses, and the first sigil to 0 HP falls.
import { ELEMENTS, ELEMENT_BEAT_BONUS, HAND_SIZE, MAX_CHARGE, MAX_HP } from './config.js';
import { chooseFoeCard } from './ai.js';
import { dealHand, describeCard, drawCard, freshDeck } from './deck.js';
import { makeRng } from './rng.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WIN = 'win';
export const PHASE_LOSS = 'loss';

/** A fresh duelist: full HP, empty charge, no ward, no cards yet. */
function freshDuelist() {
  return { hp: MAX_HP, charge: 0, guard: 0, hand: [], lastCard: null, pile: null };
}

/** A brand-new game in the title phase, waiting for Play. */
export function newGame(seed = 1) {
  return {
    seed,
    rng: makeRng(seed),
    phase: PHASE_TITLE,
    round: 1,
    you: freshDuelist(),
    foe: freshDuelist(),
    log: ['Two sigils enter the circle. One will leave burning.'],
    lastPlayed: { you: null, foe: null },
    stats: { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, rounds: 0 },
  };
}

/** Shuffle two decks, deal two opening hands, and open the duel. */
export function startDuel(state) {
  state.rng = makeRng(state.seed);
  const pileYou = { deck: freshDeck(state.rng), discard: [], rng: state.rng };
  const pileFoe = { deck: freshDeck(state.rng), discard: [], rng: state.rng };
  state.you = { ...freshDuelist(), pile: pileYou, hand: dealHand(pileYou) };
  state.foe = { ...freshDuelist(), pile: pileFoe, hand: dealHand(pileFoe) };
  state.phase = PHASE_PLAY;
  state.round = 1;
  state.stats = { damageDealt: 0, damageTaken: 0, cardsPlayed: 0, rounds: 0 };
  state.lastPlayed = { you: null, foe: null };
  state.log = ['The duel begins — play a card, duelist.'];
  return state;
}

/** The elemental bonus: +2 when the strike's element beats the foe's card element. */
export function elementBonus(attackerCard, defenderCard) {
  if (!attackerCard || !defenderCard) return 0;
  return ELEMENTS[attackerCard.element].beats === defenderCard.element ? ELEMENT_BEAT_BONUS : 0;
}

/** One strike landing on a duelist: the ward eats what it can, the rest burns HP. */
function takeHit(defender, rawDamage) {
  const blocked = Math.min(defender.guard, rawDamage);
  defender.guard -= blocked;
  const dealt = rawDamage - blocked;
  defender.hp = Math.max(0, defender.hp - dealt);
  return { blocked, dealt };
}

/** Resolve one simultaneous round and return the lines for the clash log. */
export function resolveRound(state, youCard, foeCard) {
  const lines = [];
  state.lastPlayed = { you: youCard, foe: foeCard };
  state.you.lastCard = youCard;
  state.foe.lastCard = foeCard;
  state.stats.cardsPlayed += 1;
  state.stats.rounds += 1;

  // Surges charge first, so a surge never boosts its own round's strike.
  for (const [side, card, other] of [['you', youCard, 'foe'], ['foe', foeCard, 'you']]) {
    if (card.kind === 'surge') {
      const before = state[side].charge;
      state[side].charge = Math.min(MAX_CHARGE, state[side].charge + card.value);
      lines.push(`${side === 'you' ? 'You' : 'Pyra'} ${describeCard(card)} — charge ${before} → ${state[side].charge}.`);
    }
  }
  // Guards raise wards next, so they stand ready for this round's strikes.
  for (const [side, card] of [['you', youCard], ['foe', foeCard]]) {
    if (card.kind === 'guard') {
      state[side].guard += card.value;
      lines.push(`${side === 'you' ? 'You' : 'Pyra'} raise ${describeCard(card)} — ward ${state[side].guard}.`);
    }
  }
  // Strikes land at the same time: charge is spent, elements clash, wards absorb.
  const strikes = [];
  for (const [side, card, target] of [['you', youCard, 'foe'], ['foe', foeCard, 'you']]) {
    if (card.kind !== 'attack') continue;
    const bonus = elementBonus(card, state[target].lastCard);
    const raw = card.value + state[side].charge + bonus;
    state[side].charge = 0;
    const { blocked, dealt } = takeHit(state[target], raw);
    if (side === 'you') state.stats.damageDealt += dealt;
    else state.stats.damageTaken += dealt;
    let text = `${side === 'you' ? 'You' : 'Pyra'} strike ${describeCard(card)} for ${raw}`;
    if (bonus > 0) text += ` (element beats ${state[target].lastCard.elementName} +${bonus})`;
    if (state[side].charge > 0) text += '';
    if (blocked > 0) text += ` — ward blocks ${blocked}`;
    text += dealt > 0 ? `, ${dealt} damage lands.` : ', fully blocked!';
    strikes.push(text);
  }
  lines.push(...strikes);
  if (strikes.length === 0) lines.push('No strikes this round — the sigils circle each other.');

  // End of round: played cards are discarded, each duelist draws one.
  state.you.pile.discard.push(youCard);
  state.foe.pile.discard.push(foeCard);
  const drewYou = drawCard(state.you.pile);
  const drewFoe = drawCard(state.foe.pile);
  if (drewYou) state.you.hand.push(drewYou);
  if (drewFoe) state.foe.hand.push(drewFoe);

  // The fall: whoever hits 0 HP first loses; a double fall goes to the player.
  if (state.foe.hp <= 0 && state.you.hp <= 0) {
    state.phase = PHASE_WIN;
    lines.push('Both sigils gutter out — but yours burns last. You win!');
  } else if (state.foe.hp <= 0) {
    state.phase = PHASE_WIN;
    lines.push('Pyra’s sigil shatters. You win the duel!');
  } else if (state.you.hp <= 0) {
    state.phase = PHASE_LOSS;
    lines.push('Your sigil gutters out. Pyra wins the duel.');
  } else {
    state.round += 1;
  }
  state.log = [...state.log.slice(-2), ...lines].slice(-4);
  return lines;
}

/** Play the card at hand index `i`: Pyra answers, the round resolves. */
export function playCard(state, i) {
  if (state.phase !== PHASE_PLAY) return null;
  if (i < 0 || i >= state.you.hand.length) return null;
  const youCard = state.you.hand[i];
  state.you.hand.splice(i, 1);
  const foeCard = chooseFoeCard(state, state.rng);
  if (!foeCard) return null;
  return resolveRound(state, youCard, foeCard);
}

/** How many cards are left in each deck, for the footer line. */
export function deckCounts(state) {
  return {
    you: state.you.pile ? state.you.pile.deck.length : 0,
    foe: state.foe.pile ? state.foe.pile.deck.length : 0,
  };
}

export { HAND_SIZE };
