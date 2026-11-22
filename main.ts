// Ember Sigils — the hand-in program (Node 22, standard library only).
//
// What it does, in order: it prepares the output directory, copies game/ and
// screenshots/ from beside this file into it, and writes /output/dossier.json
// with buildDossier from the vendored make.fun library — the summary the
// judge reads. It runs twice in grading and both runs must write the same
// bytes, so nothing here depends on time, randomness, or the environment
// beyond MAKEFUN_OUTPUT_DIR (which stands in for /output outside the grader).
//
// Output prep is mount-safe on purpose: in the grader /output is a Docker
// volume mount, and recursively deleting a mount point fails (EBUSY), which
// used to kill the run with exit 1. This program never removes the output
// directory itself — it only creates it and sweeps stale files out of it,
// one entry at a time, tolerating entries that refuse to go.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, mirrored here so a bad entry fails loudly at build time
// instead of silently at grading time.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Where the hand-in goes: /output in the grader, or MAKEFUN_OUTPUT_DIR locally. */
function outputDir() {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

/**
 * Sweep stale entries out of an existing output directory, one entry at a
 * time. The directory itself is never removed: on a Docker volume mount
 * that fails with EBUSY and used to abort the whole run. An entry that
 * refuses to go (busy mount, permission) is skipped — the copy step below
 * overwrites same-named files anyway, and a leftover extra file is harmless
 * next to a freshly written dossier.
 */
function clearDirContents(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    try {
      rmSync(join(dir, entry.name), { recursive: true, force: true });
    } catch {
      // Leave it: never let a stale file take the hand-in down with it.
    }
  }
}

/**
 * Prepare the output directory the mount-safe way: create it if missing,
 * then sweep its old contents. Mirrors the kit starter (mkdir-only) with
 * the sweep added so local re-runs never leak a stale file.
 */
function prepareOutput(out) {
  mkdirSync(out, { recursive: true });
  try {
    clearDirContents(out);
  } catch {
    // A directory we cannot even list is still usable as a copy target.
  }
}

/** The repository root: the directory this file lives in. */
function repoRoot() {
  return fileURLToPath(new URL('.', import.meta.url));
}

/** Copy the whole game/ tree (index.html, css, js) into the output. */
function copyGameFiles(root, out) {
  const source = join(root, 'game');
  if (!existsSync(source)) throw new Error('game/ is missing from the repository');
  cpSync(source, join(out, 'game'), { recursive: true });
}

/**
 * Walk a tree and count its files and bytes, so the caps can be checked
 * early. Iterative (explicit stack) instead of recursive: deep game/ trees
 * cannot blow the call stack, and the walk stays easy to follow.
 */
function countTree(dir) {
  let files = 0;
  let bytes = 0;
  const pending = [dir];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile()) {
        files += 1;
        bytes += statSync(path).size;
      }
    }
  }
  return { files, bytes };
}

/** Refuse to hand in a game/ tree the scorer would refuse. Both caps are checked before either throws, so one run reports every violation. */
function assertGameWithinCaps(root) {
  const { files, bytes } = countTree(join(root, 'game'));
  const violations = [];
  if (files > DOSSIER_CAPS.game_max_files) {
    violations.push(`${files} files (cap ${DOSSIER_CAPS.game_max_files})`);
  }
  if (bytes > DOSSIER_CAPS.game_max_bytes) {
    violations.push(`${bytes} bytes (cap ${DOSSIER_CAPS.game_max_bytes})`);
  }
  if (violations.length > 0) {
    throw new Error(`game/ is over the scorer caps: ${violations.join('; ')}`);
  }
}

/** Copy screenshots/ when it exists; the dossier caps how many and how big. */
function copyScreenshots(root, out) {
  const source = join(root, 'screenshots');
  if (!existsSync(source)) return;
  const target = join(out, 'screenshots');
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

/** Build the dossier from the copied files and write it as dossier.json. */
function writeDossier(out) {
  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
}

/**
 * The hand-in, start to finish: refuse an over-cap game/ early, prepare the
 * output directory without ever deleting it, copy the game and its
 * screenshots in, then write the dossier the judge reads.
 */
function main() {
  const root = repoRoot();
  const out = outputDir();
  assertGameWithinCaps(root);
  prepareOutput(out);
  copyGameFiles(root, out);
  copyScreenshots(root, out);
  writeDossier(out);
}

main();
