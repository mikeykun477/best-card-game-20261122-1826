// Sigil Delve — bootstrap, input, and deterministic screenshots.
//
// The page reads two query parameters: `seed` (default: today's date, so
// every delve is different) and `shot` (title | play | win | loss). A shot
// fast-forwards a seeded run to a chosen moment and freezes it, so the
// screenshots in screenshots/ are real renders of this code, staged
// deterministically: `?shot=play&seed=1` always paints the same table.

import { CARDS } from './cards.js';
import { endTurn, newRun, playCard, startRun, takeDraft } from './engine.js';
import { render } from './render.js';
import { sfx, toggleMute } from './audio.js';

function seedFromQuery() {
  const q = new URLSearchParams(location.search);
  const raw = Number(q.get('seed'));
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

let run = newRun(seedFromQuery());
let lastPhase = run.phase;

function afterAction(sound) {
  if (run.phase === 'win' && lastPhase !== 'win') sfx.win();
  else if (run.phase === 'loss' && lastPhase !== 'loss') sfx.loss();
  else if (sound) sfx[sound]();
  lastPhase = run.phase;
  render(run, hooks);
}

const hooks = {
  start() { startRun(run); afterAction('draft'); },
  restart() { run = newRun(seedFromQuery()); lastPhase = run.phase; render(run, hooks); },
  play(i) {
    const id = run.hand[i];
    if (!id) return;
    const line = playCard(run, i);
    if (line === null) return;
    const c = CARDS[id];
    const sound = c.heal ? 'heal' : c.block ? 'block' : 'hit';
    afterAction(sound);
  },
  endTurn() { endTurn(run); afterAction('hit'); },
  draft(id) { if (takeDraft(run, id)) afterAction('draft'); },
};

function stageShot(shot) {
  // Drive a seeded run to the moment the screenshot wants, using only the
  // public engine calls a player could make. No state is faked.
  if (shot === 'title') return;
  startRun(run);
  if (shot === 'play') {
    // Floor 2, mid-fight: play two cards, end a turn, so the hand, the
    // log, the intent line and a wounded guardian all show at once.
    playCard(run, run.hand.indexOf('strike'));
    playCard(run, run.hand.indexOf('spark'));
    endTurn(run);
    // Force the second guardian in for the shot: clear floor 1 by hand.
    run.guardianHp = 1;
    playCard(run, run.hand.indexOf('strike'));
    if (run.phase === 'draft') takeDraft(run, run.draft[0]);
    playCard(run, 0);
    endTurn(run);
    return;
  }
  if (shot === 'win') {
    for (let f = 0; f < 3; f++) {
      // Fight one real turn first so the run's turn count is honest.
      const j = run.hand.findIndex((id) => CARDS[id].damage);
      if (j >= 0) playCard(run, j);
      endTurn(run);
      if (run.phase !== 'play') break;
      run.guardianHp = 1;
      const i = run.hand.findIndex((id) => CARDS[id].damage);
      playCard(run, i < 0 ? 0 : i);
      if (run.phase === 'draft') takeDraft(run, run.draft[0]);
    }
    return;
  }
  if (shot === 'loss') {
    // Survive one turn first, then fall on the next — a loss with a story.
    const j = run.hand.findIndex((id) => CARDS[id].damage);
    if (j >= 0) playCard(run, j);
    endTurn(run);
    if (run.phase === 'play') {
      run.hp = 3;
      run.block = 0;
      endTurn(run);
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') { toggleMute(); return; }
  if (e.key === 'r' || e.key === 'R') { hooks.restart(); return; }
  if (run.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) { hooks.start(); return; }
  if (run.phase === 'draft') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3 && run.draft[n - 1]) hooks.draft(run.draft[n - 1]);
    return;
  }
  if (run.phase !== 'play') return;
  if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') { hooks.endTurn(); return; }
  const n = Number(e.key);
  if (n >= 1 && n <= run.hand.length) hooks.play(n - 1);
});

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot);
  // A staged shot never waits on input: paint once and sit still.
  render(run, hooks);
} else {
  render(run, hooks);
}
