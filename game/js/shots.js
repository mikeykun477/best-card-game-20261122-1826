// Ember Sigils — staged scenes for ?shot=title|play|win|loss&seed=N.
// Each scene plays the real duel rules forward from a fresh seeded game with
// a fixed autopilot, so the same seed always paints the same frame. The win
// and loss scenes play until the duel really ends; only if a duel drags past
// the step cap is the ending forced, so the frame is still a true end screen.
import { PHASE_LOSS, PHASE_PLAY, PHASE_TITLE, PHASE_WIN, newGame, playCard, startDuel } from './state.js';

const PLAY_ROUNDS = 4;
const END_ROUNDS = 120;

/** The autopilot's card pick: strike hard, charge when quiet, guard when hurt. */
function autopilotPick(state) {
  const hand = state.you.hand;
  const score = (card) => {
    if (card.kind === 'attack') return card.value + state.you.charge;
    if (card.kind === 'surge') return state.you.charge < 3 ? 3 : 0;
    return state.you.hp <= 12 ? card.value + 2 : card.value - 4;
  };
  let best = 0;
  for (let i = 1; i < hand.length; i += 1) {
    if (score(hand[i]) > score(hand[best])) best = i;
  }
  return best;
}

/** Play rounds with the autopilot until `stop` says enough, or the duel ends. */
function runRounds(state, maxRounds, stop) {
  for (let i = 0; i < maxRounds; i += 1) {
    if (state.phase !== PHASE_PLAY) break;
    if (stop && stop(state)) break;
    playCard(state, autopilotPick(state));
  }
}

/** Build the named scene and return the fresh state to render. */
export function stageShot(name, seed) {
  const state = newGame(seed);
  if (name === 'play') {
    startDuel(state);
    runRounds(state, PLAY_ROUNDS, (s) => s.round > PLAY_ROUNDS);
    return state;
  }
  if (name === 'win') {
    startDuel(state);
    runRounds(state, END_ROUNDS, null);
    if (state.phase === PHASE_PLAY) {
      // A duel that drags is ended by a final ember: Pyra falls at 0 HP.
      state.foe.hp = 0;
      state.phase = PHASE_WIN;
      state.log = [...state.log.slice(-2), 'Pyra’s sigil shatters. You win the duel!'];
    }
    return state;
  }
  if (name === 'loss') {
    startDuel(state);
    // The loss run plays badly on purpose: always the weakest card, so Pyra wins.
    for (let i = 0; i < END_ROUNDS; i += 1) {
      if (state.phase !== PHASE_PLAY) break;
      const weakest = state.you.hand.reduce((a, c, idx) => (c.value < state.you.hand[a].value ? idx : a), 0);
      playCard(state, weakest);
    }
    if (state.phase === PHASE_PLAY) {
      state.you.hp = 0;
      state.phase = PHASE_LOSS;
      state.log = [...state.log.slice(-2), 'Your sigil gutters out. Pyra wins the duel.'];
    }
    return state;
  }
  // Anything else is the title screen.
  return state;
}

export { PHASE_LOSS, PHASE_PLAY, PHASE_TITLE, PHASE_WIN };
