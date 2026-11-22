// Ember Sigils — every pixel on the table is DOM: hands, HP bars, the clash
// log, and the title / win / loss overlays. Cards are plain HTML, so they stay
// legible even when the screenshot is shrunk to a thumbnail.
import { FOE_NAME, KINDS, MAX_HP } from './config.js';
import { describeCard } from './deck.js';
import { PHASE_LOSS, PHASE_PLAY, PHASE_TITLE, PHASE_WIN, deckCounts } from './state.js';

const $ = (id) => document.getElementById(id);

/** Build one face-up card element. `key` is the 1–5 keyboard hint. */
export function cardElement(card, key) {
  const el = document.createElement('div');
  el.className = `card el-${card.element} ${card.kind}-card`;
  el.dataset.cardId = String(card.id);
  const kindWord = card.kind === 'attack' ? 'Strike' : card.kind === 'guard' ? 'Guard' : 'Surge';
  const valueWord = card.kind === 'attack' ? 'damage' : card.kind === 'guard' ? 'ward' : 'charge';
  el.innerHTML =
    `<span class="cost">${card.value}</span>` +
    `<span class="glyph">${card.glyph}</span>` +
    `<span class="cname">${card.name}</span>` +
    `<span class="cvalue">${card.value} <small>${valueWord}</small></span>` +
    (key ? `<span class="ckey">${key}</span>` : '') +
    `<span class="element-band"></span>`;
  el.title = `${describeCard(card)} — ${card.elementName} ${kindWord}`;
  return el;
}

/** One face-down card back for Pyra's hand. */
function backElement() {
  const el = document.createElement('div');
  el.className = 'card back';
  el.innerHTML = '<span class="back-glyph">✦</span>';
  el.title = 'Pyra’s hidden card';
  return el;
}

/** Fill one played-card slot, or leave its dashed outline empty. */
function fillSlot(slotId, card) {
  const slot = $(slotId);
  slot.querySelectorAll('.card').forEach((n) => n.remove());
  if (card) slot.appendChild(cardElement(card, null));
}

/** Paint the whole table from the state. */
export function render(state, onPlay) {
  // HP bars and charge lines.
  $('youHpFill').style.width = `${(state.you.hp / MAX_HP) * 100}%`;
  $('foeHpFill').style.width = `${(state.foe.hp / MAX_HP) * 100}%`;
  $('youHpText').textContent = `${state.you.hp} / ${MAX_HP} HP`;
  $('foeHpText').textContent = `${state.foe.hp} / ${MAX_HP} HP`;
  $('youCharge').textContent = String(state.you.charge);
  $('foeCharge').textContent = String(state.foe.charge);
  $('youGuard').textContent = String(state.you.guard);
  $('foeGuard').textContent = String(state.foe.guard);
  $('roundLabel').textContent = state.phase === PHASE_PLAY ? `ROUND ${state.round}` : 'EMBER SIGILS';
  $('turnLabel').textContent =
    state.phase === PHASE_PLAY
      ? 'Your move — play a card'
      : state.phase === PHASE_TITLE
        ? 'A duel of elemental sigils'
        : state.phase === PHASE_WIN
          ? 'Victory is yours'
          : 'The ember fades…';

  // Hands: Pyra's face down, yours face up and clickable.
  const foeRow = $('foeRow');
  foeRow.replaceChildren();
  for (let i = 0; i < state.foe.hand.length; i += 1) foeRow.appendChild(backElement());
  const youRow = $('youRow');
  youRow.replaceChildren();
  state.you.hand.forEach((card, i) => {
    const el = cardElement(card, String(i + 1));
    if (state.phase === PHASE_PLAY) {
      el.classList.add('playable');
      el.addEventListener('click', () => onPlay(i));
    }
    youRow.appendChild(el);
  });

  // The last cards played, and the clash log.
  fillSlot('playedYou', state.lastPlayed.you);
  fillSlot('playedFoe', state.lastPlayed.foe);
  const log = $('clashLog');
  log.innerHTML = state.log
    .slice(-3)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('');

  const counts = deckCounts(state);
  $('deckLine').textContent =
    state.phase === PHASE_PLAY ? `Deck — you ${counts.you} · Pyra ${counts.foe}` : '';

  renderOverlay(state);
}

/** Escape log text before it goes into the DOM. */
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Title, win and loss overlays; hidden while a duel is running. */
function renderOverlay(state) {
  const overlay = $('overlay');
  const title = $('overlayTitle');
  const kicker = $('overlayKicker');
  const text = $('overlayText');
  const stats = $('overlayStats');
  const button = $('overlayButton');
  const hint = $('overlayHint');
  title.classList.remove('win', 'loss');

  if (state.phase === PHASE_TITLE) {
    overlay.classList.remove('hidden');
    kicker.textContent = '✦ A DUEL OF ELEMENTAL SIGILS ✦';
    title.textContent = 'EMBER SIGILS';
    text.innerHTML =
      'You and Pyra, Ember Warden, duel with sigil cards. Both start at 30 HP — ' +
      'play one card each round. Strikes hit, Guards ward, Surges charge your next strike. ' +
      'Flame beats Gale, Gale beats Stone, Stone beats Wave, Wave beats Flame: a beating element deals +2.';
    stats.textContent = '';
    button.textContent = '▶  PLAY THE DUEL';
    hint.textContent = 'or press Enter — click a card or press 1–5 to play it';
    // How-to strip, built once.
    if (!document.querySelector('.howto')) {
      const strip = document.createElement('div');
      strip.className = 'howto';
      strip.innerHTML =
        '<div><b>⚔️ Strike</b><br>Deals its value in damage, boosted by your charge.</div>' +
        '<div><b>🛡️ Guard</b><br>Raises a ward that blocks the next hits.</div>' +
        '<div><b>✦ Surge</b><br>Banks charge: +2 or +3 toward your next strike.</div>' +
        '<div><b>🔥💧🪨🍃 Elements</b><br>Beating the foe’s element deals +2 damage.</div>';
      $('overlayCard').insertBefore(strip, $('overlayButton'));
    }
  } else if (state.phase === PHASE_WIN) {
    overlay.classList.remove('hidden');
    const strip = document.querySelector('.howto');
    if (strip) strip.remove();
    kicker.textContent = '✦ THE SIGIL BURNS BRIGHT ✦';
    title.textContent = 'YOU WIN!';
    title.classList.add('win');
    text.textContent =
      `Pyra's sigil shatters into embers. You dealt ${state.stats.damageDealt} damage across ` +
      `${state.stats.rounds} rounds and stand victorious, Duelist.`;
    stats.textContent = `Rounds ${state.stats.rounds} · Damage dealt ${state.stats.damageDealt} · Cards played ${state.stats.cardsPlayed}`;
    button.textContent = '↻  DUEL AGAIN';
    hint.textContent = 'or press Enter / R';
  } else if (state.phase === PHASE_LOSS) {
    overlay.classList.remove('hidden');
    const strip = document.querySelector('.howto');
    if (strip) strip.remove();
    kicker.textContent = '✦ THE EMBER FADES ✦';
    title.textContent = 'YOU LOSE';
    title.classList.add('loss');
    text.textContent =
      `Your sigil gutters out against Pyra's flame. You took ${state.stats.damageTaken} damage ` +
      `over ${state.stats.rounds} rounds — study her guards, charge your strikes, and try again.`;
    stats.textContent = `Rounds ${state.stats.rounds} · Damage taken ${state.stats.damageTaken} · Cards played ${state.stats.cardsPlayed}`;
    button.textContent = '↻  DUEL AGAIN';
    hint.textContent = 'or press Enter / R';
  } else {
    overlay.classList.add('hidden');
    const strip = document.querySelector('.howto');
    if (strip) strip.remove();
  }
}

export { FOE_NAME, KINDS };
