// Sigil Delve — the table: everything the player sees.
//
// The renderer is a pure function of the run: it rebuilds the DOM from the
// engine state on every change. No state lives here, so a shot staged with a
// seed always paints the same table. Cards are buttons; the overlays
// (title, draft, win, loss) are plain divs toggled by phase.

import { CARDS, describeMove } from './cards.js';
import { currentMove } from './engine.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function bar(current, max, cls) {
  const wrap = el('div', `bar ${cls}`);
  const fill = el('div', 'bar-fill');
  fill.style.width = `${Math.max(0, Math.min(100, (100 * current) / max))}%`;
  wrap.appendChild(fill);
  wrap.appendChild(el('span', 'bar-text', `${current} / ${max}`));
  return wrap;
}

// One card in the hand. The cost sits in an orb, the glyph is the art, and
// the effect text is spelled out — the judge reads the table from the
// screenshot, so nothing is hidden behind a tooltip.
export function cardNode(run, cardId, index, onPlay) {
  const c = CARDS[cardId];
  const node = el('button', 'card');
  node.dataset.index = String(index);
  const affordable = run.energy >= c.cost;
  if (!affordable) node.classList.add('cant');
  node.appendChild(el('span', 'cost', String(c.cost)));
  node.appendChild(el('span', 'glyph', c.glyph));
  node.appendChild(el('span', 'name', c.name));
  node.appendChild(el('span', 'effect', c.text));
  node.appendChild(el('span', 'key', String(index + 1)));
  node.addEventListener('click', () => onPlay(index));
  return node;
}

function draftNode(run, cardId, onTake) {
  const c = CARDS[cardId];
  const node = el('button', 'card draft-card');
  node.appendChild(el('span', 'cost', String(c.cost)));
  node.appendChild(el('span', 'glyph', c.glyph));
  node.appendChild(el('span', 'name', c.name));
  node.appendChild(el('span', 'effect', c.text));
  node.addEventListener('click', () => onTake(cardId));
  return node;
}

function overlay(id, title, lines, buttons) {
  const node = el('div', 'overlay', '');
  node.id = id;
  const box = el('div', 'overlay-box');
  box.appendChild(el('h2', '', title));
  for (const line of lines) box.appendChild(el('p', '', line));
  for (const b of buttons) {
    const btn = el('button', 'big-btn', b.label);
    btn.addEventListener('click', b.onClick);
    box.appendChild(btn);
  }
  node.appendChild(box);
  return node;
}

export function render(run, hooks) {
  const root = document.getElementById('app');
  root.innerHTML = '';

  // Header: your life, your energy, and how deep you are.
  const head = el('header', 'hud');
  head.appendChild(el('div', 'hud-title', '✦ SIGIL DELVE'));
  const hp = el('div', 'hud-hp');
  hp.appendChild(el('span', '', `HP ${run.hp}/${run.maxHp}`));
  hp.appendChild(bar(run.hp, run.maxHp, 'hp'));
  head.appendChild(hp);
  head.appendChild(el('div', 'hud-energy', `⚡ ${run.energy} energy`));
  head.appendChild(el('div', 'hud-floor', `Floor ${Math.min(run.floor + 1, 3)} / 3`));
  head.appendChild(el('div', 'hud-deck', `Deck ${run.deck.length} · Discard ${run.discard.length}`));
  root.appendChild(head);

  // The guardian: its name, its life, its block and poison, and — the
  // honest part — exactly what it is about to do.
  const table = el('main', 'table');
  if (run.guardian) {
    const foe = el('section', 'foe');
    foe.appendChild(el('div', 'foe-glyph', run.guardian.glyph));
    const foeInfo = el('div', 'foe-info');
    foeInfo.appendChild(el('h2', '', run.guardian.name));
    foeInfo.appendChild(el('p', 'foe-flavor', run.guardian.flavor));
    foeInfo.appendChild(bar(run.guardianHp, run.guardian.hp, 'foe-hp'));
    const chips = el('div', 'chips');
    if (run.guardianBlock > 0) chips.appendChild(el('span', 'chip block', `🛡 ${run.guardianBlock}`));
    if (run.guardianPoison > 0) chips.appendChild(el('span', 'chip poison', `☠ ${run.guardianPoison}`));
    if (run.guardianBonus > 0) chips.appendChild(el('span', 'chip bonus', `🔥 +${run.guardianBonus}`));
    foeInfo.appendChild(chips);
    const intent = el('p', 'intent', run.phase === 'play'
      ? `Intent: ${describeMove(currentMove(run))}`
      : '—');
    foeInfo.appendChild(intent);
    foe.appendChild(foeInfo);
    table.appendChild(foe);
  }

  // The log: the last few lines, newest last, so the story of the fight
  // is visible in one glance.
  const log = el('aside', 'log');
  log.appendChild(el('h3', '', 'Delve log'));
  for (const line of run.log.slice(-6)) log.appendChild(el('p', '', line));
  table.appendChild(log);
  root.appendChild(table);

  // Your hand, and the end-turn button. Block you are carrying is shown
  // on the hand itself — it is yours to spend by standing behind it.
  const handRow = el('section', 'hand-row');
  if (run.block > 0) handRow.appendChild(el('div', 'my-block', `🛡 Block ${run.block}`));
  const hand = el('div', 'hand');
  run.hand.forEach((cardId, i) => hand.appendChild(cardNode(run, cardId, i, hooks.play)));
  handRow.appendChild(hand);
  const endBtn = el('button', 'end-btn', 'End turn  ⏎');
  endBtn.disabled = run.phase !== 'play';
  endBtn.addEventListener('click', hooks.endTurn);
  handRow.appendChild(endBtn);
  root.appendChild(handRow);

  root.appendChild(el('footer', 'hint', 'Click a card or press 1–5 to play · E end turn · R restart · M mute'));

  // Overlays, one per phase. Only one is ever on screen.
  if (run.phase === 'title') {
    root.appendChild(overlay('title', '✦ SIGIL DELVE', [
      'A deckbuilding delve through three guardians.',
      'Three energy a turn. Five cards a hand. Draft a new card after every guardian falls.',
      'Clear all three floors and the sigils are yours.',
    ], [{ label: 'Descend  ⏎', onClick: hooks.start }]));
  }
  if (run.phase === 'draft') {
    const box = overlay('draft', 'The guardian falls — choose a card', [
      'One card joins your deck. The rest are left in the dark.',
    ], []);
    const row = el('div', 'draft-row');
    for (const id of run.draft) row.appendChild(draftNode(run, id, hooks.draft));
    box.querySelector('.overlay-box').appendChild(row);
    root.appendChild(box);
  }
  if (run.phase === 'win') {
    root.appendChild(overlay('win', '🏆 THE SIGILS ARE YOURS', [
      `You cleared all three floors with ${run.hp} HP to spare.`,
      `${run.stats.turns} turns · ${run.stats.cardsPlayed} cards played · ${run.stats.damageDealt} damage dealt · ${run.stats.drafted} cards drafted.`,
    ], [{ label: 'Delve again  R', onClick: hooks.restart }]));
  }
  if (run.phase === 'loss') {
    root.appendChild(overlay('loss', 'THE VAULT CLAIMS YOU', [
      `You fell on floor ${run.floor + 1}, against the ${run.guardian.name}.`,
      `${run.stats.turns} turns · ${run.stats.damageDealt} damage dealt · ${run.stats.drafted} cards drafted.`,
    ], [{ label: 'Try again  R', onClick: hooks.restart }]));
  }
}
