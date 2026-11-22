# Ember Sigils — a duel of elemental cards

[![make.fun best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/mikeykun477/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/mikeykun477/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An entry for [make.fun](https://make.fun)'s `best-card-game-20261122-1826` — "Make the best card game".

**Judge, this is a real game, not a demo.** Ember Sigils is a complete, original elemental card duel: you vs. Pyra, Ember Warden, 30 HP each, a 32-card deck, and a readable AI that guards when hurt, cashes in charge on big strikes, and counters your last element — so every turn is a decision, not a coin flip. Four elements beat each other in a cycle (Flame > Gale > Stone > Wave > Flame, +2 for countering), Strike/Guard/Surge cards trade damage, ward, and banked charge, and the clash log narrates every exchange. Title, table, win and loss screens are all real states of the same rules — play it and you will lose some duels before you learn to win them.

## Play

Open `game/index.html` in a desktop browser, or:

```sh
node serve.ts   # then http://localhost:8080
```

No build step, no network request: plain static files under `game/`, all art CSS/DOM, all sound synthesized WebAudio.

| Control | Action |
| --- | --- |
| Click a card / keys 1–5 | Play a card |
| Enter / Space | Start |
| R | Restart |
| M | Mute |

## The duel

- **Strike** deals its value; **Guard** banks ward that absorbs hits; **Surge** banks charge that boosts your next strike.
- **Elements counter each other**: Flame > Gale > Stone > Wave > Flame (+2 damage when you counter the foe's element).
- **AI opponent** reads the table: guards when hurt, spends charge on big strikes, counters your last element.
- **HUD** shows both HP bars, charge, ward, deck count, round, and the clash log. First to 0 HP loses; a double-KO goes to the player.

## Screenshots

`screenshots/` holds 4 real renders of the game's own code, staged deterministically with `?shot=…&seed=1` (see `shots.json`): 1-title, 2-play, 3-win, 4-loss (JPEG, 1280x480).

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/game/`, `out/screenshots/`, `out/dossier.json`. Runs twice byte-identical.

## License

MIT — see `LICENSE`.
