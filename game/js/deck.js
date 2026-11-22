// Ember Sigils — the deck: build a fresh 32-card sigil deck, deal hands,
// draw, and reshuffle the discard pile when the deck runs dry.
import { CARD_NAMES, DECK_RECIPE, ELEMENTS, HAND_SIZE } from './config.js';
import { shuffled } from './rng.js';

let nextCardId = 1;

/** Turn one recipe row into a card object with a stable id. */
export function buildCard(kind, element, value) {
  const card = {
    id: nextCardId,
    kind,
    element,
    value,
    name: CARD_NAMES[kind][element],
    glyph: ELEMENTS[element].glyph,
    elementName: ELEMENTS[element].name,
  };
  nextCardId += 1;
  return card;
}

/** A fresh shuffled deck of sigil cards. */
export function freshDeck(rng) {
  return shuffled(DECK_RECIPE.map(([kind, element, value]) => buildCard(kind, element, value)), rng);
}

/** Draw one card, reshuffling the discard pile (minus the top card) when empty. */
export function drawCard(pile) {
  if (pile.deck.length === 0) {
    if (pile.discard.length <= 1) return null;
    const keep = pile.discard[pile.discard.length - 1];
    pile.deck = shuffled(pile.discard.slice(0, -1), pile.rng);
    pile.discard = [keep];
  }
  return pile.deck.pop();
}

/** Deal an opening hand of HAND_SIZE cards from the pile. */
export function dealHand(pile) {
  const hand = [];
  for (let i = 0; i < HAND_SIZE; i += 1) {
    const card = drawCard(pile);
    if (card) hand.push(card);
  }
  return hand;
}

/** A human-readable line for a card, e.g. "Ember Slash — Flame Strike 7". */
export function describeCard(card) {
  const kindWord = card.kind === 'attack' ? 'Strike' : card.kind === 'guard' ? 'Guard' : 'Surge';
  return `${card.name} — ${card.elementName} ${kindWord} ${card.value}`;
}
