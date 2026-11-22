// Ember Sigils — Pyra's brain. A readable opponent: she guards when hurt,
// spends her charge on her biggest strike, counters the player's element when
// she can, and otherwise plays her strongest card. Every choice is explainable
// from the table, so the player can read her and counter her.
import { ELEMENTS } from './config.js';

/** Score one candidate card for the foe, given the duel state. */
function scoreCard(card, foe, you, rng) {
  let score = card.value;
  // Hurt? A guard is worth more than a hit.
  if (card.kind === 'guard' && foe.hp <= 12) score += 9;
  if (card.kind === 'guard' && you.charge >= 4) score += 5;
  // A charged foe cashes in with her biggest strike.
  if (card.kind === 'attack' && foe.charge >= 3) score += 6;
  // Counter the element the player just played: beating it earns +2.
  if (card.kind === 'attack' && you.lastCard && ELEMENTS[card.element].beats === you.lastCard.element) score += 4;
  // Don't waste a surge at full charge.
  if (card.kind === 'surge' && foe.charge >= 5) score -= 8;
  // Small random jitter so she is not perfectly predictable.
  return score + rng() * 2;
}

/** Pick the foe's card for this round and remove it from her hand. */
export function chooseFoeCard(state, rng) {
  let best = null;
  let bestScore = -Infinity;
  for (const card of state.foe.hand) {
    const score = scoreCard(card, state.foe, state.you, rng);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  if (!best) return null;
  state.foe.hand = state.foe.hand.filter((c) => c !== best);
  return best;
}

/** One line explaining her mood, shown in the clash log. */
export function foeMood(state) {
  if (state.foe.hp <= 8) return 'Pyra fights with her back to the wall.';
  if (state.foe.charge >= 4) return 'Pyra’s sigil crackles — a big strike is coming.';
  if (state.you.hp <= 8) return 'Pyra smells victory and presses forward.';
  return 'Pyra studies your sigils, waiting for an opening.';
}
