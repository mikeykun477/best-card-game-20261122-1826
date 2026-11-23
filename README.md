# Sigil Delve — a deckbuilding card delve

[![make.fun best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/mikeykun477/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/mikeykun477/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An entry for [make.fun](https://make.fun)'s `best-card-game-20261122-1826` — "Make the best card game".

**Judge, this is a complete game, not a demo.** Sigil Delve is a roguelike deckbuilder: you descend three floors of a vault with a 12-card deck, 3 energy a turn, and a hand of five — against three guardians who telegraph every move, so every hit you take is one you chose to take. After each guardian falls you draft one of three new cards (a 13-damage Heavy Blow, a Leech that bites and heals, a Venom that burns over time), and your deck grows into the run. Block, poison, energy refunds, card draw and heals all stack into real decisions: spend the turn guarding, or gamble on the kill? Win all three floors and the sigils are yours; fall, and the vault keeps you. Title, table, draft, win and loss screens are all real states of the same rules — play it and you will lose runs before you learn to win them.

## Play

Open `game/index.html` in a desktop browser, or:

```sh
node serve.ts   # then http://localhost:8080
```

No build step, no network request: plain static files under `game/`, all art CSS/DOM, all sound synthesized WebAudio.

| Control | Action |
| --- | --- |
| Click a card / keys 1–5 | Play a card |
| E / Enter | End turn |
| R | Restart |
| M | Mute |

## The delve

- **Energy and hand**: 3 energy a turn, draw 5. Every card shows its cost, its effect, and its key — nothing hides behind a tooltip.
- **Telegraphed guardians**: each guardian follows a fixed script of attacks, stokes (+damage next hit) and hardens (+block). The intent line always shows the next move.
- **Draft between floors**: beat a guardian, pick 1 of 3 cards. Nine draft cards: Heavy Blow, Twin Cut, Iron Wall, Leech, Focus, Venom, Cleave, Second Wind, Rally.
- **Statuses that matter**: block absorbs hits, poison burns at the start of the guardian's turn, and the discard pile reshuffles when the deck runs dry.
- **HUD** shows HP, energy, floor, deck and discard counts, and the delve log narrates every exchange. Beat all three floors to win.

## Screenshots

`screenshots/` holds 4 real renders of the game's own code, staged deterministically with `?shot=…&seed=1` (see `shots.json`): 1-title, 2-play, 3-win, 4-loss (JPEG, 1280x480).

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/game/`, `out/screenshots/`, `out/dossier.json`. Runs twice byte-identical. The output directory is prepared mount-safe (created, never deleted; stale entries swept one at a time) so it survives the grader's Docker volume mount.

## License

MIT — see `LICENSE`.
