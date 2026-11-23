// Sigil Delve — the courier (Node 22, standard library only).
//
// This program carries the game to the grader. Given a fresh output
// directory it places three things in it: the playable game under game/,
// the staged screenshots under screenshots/, and dossier.json, the summary
// the judge reads, built from the vendored make.fun library.
//
// The run is deterministic: run it twice and every byte is identical, so
// nothing here reads the clock, rolls dice, or leans on the environment
// except for MAKEFUN_OUTPUT_DIR (which stands in for /output when you run
// it on your own machine).
//
// One deliberate quirk: in the grader /output is a Docker volume mount.
// Deleting a mount point fails with EBUSY and used to kill the whole run
// with exit 1, so this program never deletes the output directory itself.
// It creates the directory if it is missing and clears out stale files
// one entry at a time, skipping anything that refuses to go.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's ceilings, copied here so a too-big game fails loudly at
// build time instead of quietly at grading time.
const OUTPUT_CAPS = Object.freeze({
  text_max_bytes: 163840,
  screenshots: Object.freeze({ max: 4, max_bytes: 262144 }),
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

// The directory this file was run from: the repository root.
function repoRoot() {
  return fileURLToPath(new URL('.', import.meta.url));
}

// /output inside the grader, or MAKEFUN_OUTPUT_DIR anywhere else.
function outputDir() {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

// Empty an output directory without ever touching the directory itself.
// Each entry is removed on its own and guarded, so a single stubborn file
// (a busy mount, a permission quirk) cannot take the hand-in down.
function sweepOutput(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    try {
      rmSync(join(dir, entry.name), { recursive: true, force: true });
    } catch {
      // Stale files are overwritten by the copy below anyway.
    }
  }
}

// Make the output directory usable: create it when it is missing, then
// sweep it. Mirrors the kit starter (create-only) with the sweep added so
// a local re-run never leaks yesterday's files into today's hand-in.
function ensureOutput(out) {
  mkdirSync(out, { recursive: true });
  try {
    sweepOutput(out);
  } catch {
    // A directory we cannot even list is still a usable copy target.
  }
}

// Recursively count the files and bytes under a directory.
function measureTree(dir, acc = { files: 0, bytes: 0 }) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) measureTree(path, acc);
    else if (entry.isFile()) {
      acc.files += 1;
      acc.bytes += statSync(path).size;
    }
  }
  return acc;
}

// Refuse to hand in a game/ tree the scorer would refuse, listing every
// violation at once instead of failing on the first one found.
function checkCaps(root) {
  const { files, bytes } = measureTree(join(root, 'game'));
  const over = [];
  if (files > OUTPUT_CAPS.game_max_files) over.push(`${files} files (cap ${OUTPUT_CAPS.game_max_files})`);
  if (bytes > OUTPUT_CAPS.game_max_bytes) over.push(`${bytes} bytes (cap ${OUTPUT_CAPS.game_max_bytes})`);
  if (over.length > 0) throw new Error(`game/ breaks the scorer caps: ${over.join('; ')}`);
}

// Copy the whole game/ tree (index.html, css, js) into the output.
function copyGame(root, out) {
  const source = join(root, 'game');
  if (!existsSync(source)) throw new Error('game/ is missing from the repository');
  cpSync(source, join(out, 'game'), { recursive: true });
}

// Copy screenshots/ when it exists; the dossier caps how many and how big.
function copyShots(root, out) {
  const source = join(root, 'screenshots');
  if (!existsSync(source)) return;
  const target = join(out, 'screenshots');
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

// Build the dossier from the copied files and write it as dossier.json.
function writeDossier(out) {
  writeFileSync(join(out, 'dossier.json'), buildDossier(out, OUTPUT_CAPS));
}

// The courier, start to finish: check the caps before touching anything,
// prepare the output directory without ever deleting it, copy the game
// and its screenshots in, then write the dossier the judge reads.
function run() {
  const root = repoRoot();
  const out = outputDir();
  checkCaps(root);
  ensureOutput(out);
  copyGame(root, out);
  copyShots(root, out);
  writeDossier(out);
}

run();
