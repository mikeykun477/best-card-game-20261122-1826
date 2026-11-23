// Sigil Delve — the engine: shuffling, turns, combat, and the run.
//
// The engine owns no DOM. It takes a seed, builds a run, and answers
// questions (what is in the hand, what does the guardian intend, is the run
// over). render.js reads this state and paints it; main.js feeds it input.
// That split is what makes the deterministic screenshots possible: a shot
// is just a seeded run fast-forwarded to a chosen moment.

import {
  CARDS, CARDS_PER_HAND, DRAFT_POOL, ENERGY_PER_TURN, GUARDIANS,
  HEAL_BETWEEN_FLOORS, START_HP, starterDeck,
} from './cards.js';

// A small seeded generator (mulberry32). Same seed, same shuffle, same
// draft offers — so a screenshot staged with seed=1 always looks the same.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(deck, rng) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function pickThree(pool, rng) {
  const out = [];
  const bag = pool.slice();
  while (out.length < 3 && bag.length > 0) {
    out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  }
  return out;
}

// Build a fresh run. `seed` drives shuffles and draft offers only; the
// guardians' move scripts are fixed, so the table stays readable.
export function newRun(seed) {
  const rng = makeRng(seed);
  const run = {
    seed, rng,
    hp: START_HP, maxHp: START_HP,
    floor: 0, // index into GUARDIANS
    turn: 1, energy: ENERGY_PER_TURN,
    deck: shuffle(starterDeck(), rng),
    hand: [], discard: [],
    guardian: null, guardianHp: 0, guardianBlock: 0, guardianPoison: 0,
    guardianMove: 0, guardianBonus: 0,
    block: 0, poisonDealt: 0,
    draft: null, // three card ids offered between floors, or null
    phase: 'title', // title | play | draft | win | loss
    log: ['You push open the vault door. Three guardians stand between you and the sigils.'],
    stats: { turns: 0, damageDealt: 0, cardsPlayed: 0, drafted: 0 },
  };
  return run;
}

export function startGuardian(run) {
  const g = GUARDIANS[run.floor];
  run.guardian = g;
  run.guardianHp = g.hp;
  run.guardianBlock = 0;
  run.guardianPoison = 0;
  run.guardianMove = 0;
  run.guardianBonus = 0;
  run.block = 0;
  run.log.push(`${g.name} bars the way — ${g.hp} HP. ${g.flavor}`);
}

export function startRun(run) {
  run.phase = 'play';
  run.turn = 1;
  startGuardian(run);
  beginTurn(run);
}

function drawCards(run, n) {
  for (let i = 0; i < n; i++) {
    if (run.deck.length === 0) {
      if (run.discard.length === 0) break;
      run.deck = shuffle(run.discard, run.rng);
      run.discard = [];
      run.log.push('The discard pile is shuffled back into the deck.');
    }
    run.hand.push(run.deck.pop());
  }
}

function beginTurn(run) {
  // The old hand is spent: it goes to the discard pile before fresh
  // cards are drawn, so the hand never grows past a full hand.
  run.discard.push(...run.hand);
  run.hand = [];
  run.block = 0;
  run.energy = ENERGY_PER_TURN;
  drawCards(run, CARDS_PER_HAND);
}

export function currentMove(run) {
  return run.guardian.moves[run.guardianMove % run.guardian.moves.length];
}

function hurtGuardian(run, amount) {
  let left = amount;
  if (run.guardianBlock > 0) {
    const absorbed = Math.min(run.guardianBlock, left);
    run.guardianBlock -= absorbed;
    left -= absorbed;
  }
  run.guardianHp -= left;
  run.stats.damageDealt += left;
  return left;
}

function hurtPlayer(run, amount) {
  let left = amount;
  if (run.block > 0) {
    const absorbed = Math.min(run.block, left);
    run.block -= absorbed;
    left -= absorbed;
  }
  run.hp -= left;
  return left;
}

// Play the card at hand index `i`. Returns a short line for the log, or
// null when the card cannot be played (not enough energy, wrong phase).
export function playCard(run, i) {
  if (run.phase !== 'play' || i < 0 || i >= run.hand.length) return null;
  const card = CARDS[run.hand[i]];
  if (run.energy < card.cost) return null;
  run.energy -= card.cost;
  run.hand.splice(i, 1);
  run.discard.push(card.id);
  run.stats.cardsPlayed += 1;
  const bits = [];
  if (card.damage) {
    const hits = card.hits ?? 1;
    for (let h = 0; h < hits; h++) hurtGuardian(run, card.damage);
    bits.push(`${card.name} hits for ${card.damage * hits}`);
  }
  if (card.block) { run.block += card.block; bits.push(`+${card.block} block`); }
  if (card.heal) {
    run.hp = Math.min(run.maxHp, run.hp + card.heal);
    bits.push(`heal ${card.heal}`);
  }
  if (card.poison) {
    run.guardianPoison += card.poison;
    bits.push(`${card.poison} poison`);
  }
  if (card.energy) { run.energy += card.energy; bits.push(`+${card.energy} energy`); }
  if (card.draw) { drawCards(run, card.draw); bits.push(`draw ${card.draw}`); }
  const line = bits.join(', ');
  run.log.push(line ? `${card.name}: ${line}.` : `${card.name}.`);
  if (run.guardianHp <= 0) {
    run.guardianHp = 0;
    floorCleared(run);
  }
  return line;
}

function floorCleared(run) {
  run.log.push(`${run.guardian.name} falls. The way down opens.`);
  run.stats.drafted += 0;
  if (run.floor >= GUARDIANS.length - 1) {
    run.phase = 'win';
    run.log.push('All three guardians are down. The sigils are yours.');
    return;
  }
  run.draft = pickThree(DRAFT_POOL, run.rng);
  run.phase = 'draft';
}

export function takeDraft(run, cardId) {
  if (run.phase !== 'draft' || !run.draft.includes(cardId)) return false;
  run.deck.push(cardId);
  run.stats.drafted += 1;
  run.log.push(`You take ${CARDS[cardId].name} into the deck.`);
  run.draft = null;
  run.floor += 1;
  run.hp = Math.min(run.maxHp, run.hp + HEAL_BETWEEN_FLOORS);
  run.log.push(`You catch your breath (+${HEAL_BETWEEN_FLOORS} HP) and descend.`);
  run.phase = 'play';
  run.turn = 1;
  // The unplayed hand joins the discard pile; nothing is ever thrown
  // away between floors — the deck you built is the deck you keep.
  run.discard.push(...run.hand);
  run.hand = [];
  startGuardian(run);
  beginTurn(run);
  return true;
}

// End the turn: poison ticks, then the guardian takes its scripted move.
export function endTurn(run) {
  if (run.phase !== 'play') return;
  if (run.guardianPoison > 0) {
    const tick = run.guardianPoison;
    hurtGuardian(run, tick);
    run.guardianPoison -= 1;
    run.poisonDealt += tick;
    run.log.push(`Poison burns the ${run.guardian.name} for ${tick}.`);
    if (run.guardianHp <= 0) { run.guardianHp = 0; floorCleared(run); return; }
  }
  const move = currentMove(run);
  run.guardianMove += 1;
  if (move.kind === 'attack') {
    const total = move.value + run.guardianBonus;
    run.guardianBonus = 0;
    const got = hurtPlayer(run, total);
    run.log.push(`${run.guardian.name} strikes for ${total}${got < total ? ` (${total - got} blocked)` : ''}.`);
  } else if (move.kind === 'stoke') {
    run.guardianBonus += move.value;
    run.log.push(`${run.guardian.name} stokes its fire (+${move.value} next hit).`);
  } else {
    run.guardianBlock += move.value;
    run.log.push(`${run.guardian.name} hardens (+${move.value} block).`);
  }
  if (run.hp <= 0) {
    run.hp = 0;
    run.phase = 'loss';
    run.log.push('The vault claims you. The sigils stay in the dark.');
    return;
  }
  run.turn += 1;
  run.stats.turns += 1;
  beginTurn(run);
}
