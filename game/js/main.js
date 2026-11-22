// Ember Sigils — bootstrap: wire the table to the duel, keyboard and mouse,
// sounds, and the ?shot= staging hook the screenshots use.
// A plain browser load opens the title screen; ?shot=title|play|win|loss&seed=N
// jumps straight to a staged scene and sets window.__shotReady when painted.
import { sfx, unlockAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { PHASE_LOSS, PHASE_PLAY, PHASE_TITLE, PHASE_WIN, newGame, playCard, startDuel } from './state.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

let state = shotName ? stageShot(shotName, seed) : newGame(seed);

/** Paint the table and mark the frame ready for a screenshot capture. */
function paint() {
  render(state, onPlayCard);
  if (shotName) {
    // Let the HP-bar transitions settle before the capture fires.
    setTimeout(() => { window.__shotReady = true; }, 700);
  }
}

/** One card played by mouse or keyboard: sound, resolve, repaint. */
function onPlayCard(index) {
  if (state.phase !== PHASE_PLAY) return;
  unlockAudio();
  const before = { you: state.you.hp, foe: state.foe.hp };
  const lines = playCard(state, index);
  if (!lines) return;
  const played = state.lastPlayed.you;
  if (played.kind === 'surge') sfx.surge();
  else if (played.kind === 'guard') sfx.guard();
  else sfx.play();
  if (state.foe.hp < before.foe || state.you.hp < before.you) {
    setTimeout(() => sfx.hit(), 180);
  }
  if (state.phase === PHASE_WIN) setTimeout(() => sfx.win(), 350);
  if (state.phase === PHASE_LOSS) setTimeout(() => sfx.lose(), 350);
  paint();
}

/** Start (or restart) a duel from the title or an end screen. */
function beginDuel() {
  unlockAudio();
  sfx.play();
  startDuel(state);
  paint();
}

document.getElementById('overlayButton').addEventListener('click', () => {
  if (state.phase === PHASE_TITLE || state.phase === PHASE_WIN || state.phase === PHASE_LOSS) beginDuel();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (state.phase !== PHASE_PLAY) beginDuel();
    return;
  }
  if (event.key === 'r' || event.key === 'R') {
    if (state.phase !== PHASE_TITLE) beginDuel();
    return;
  }
  const slot = Number(event.key);
  if (slot >= 1 && slot <= 5) onPlayCard(slot - 1);
});

document.addEventListener('pointerdown', unlockAudio, { once: true });

paint();

// Debug handle for headless play-tests: drive the duel from CDP.
window.__ember = {
  state: () => state,
  play: onPlayCard,
  begin: beginDuel,
};
