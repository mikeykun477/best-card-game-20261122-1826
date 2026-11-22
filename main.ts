// Ember Sigils — the hand-in program (Node 22, standard library only).
//
// What it does, in order: it clears the output directory, copies game/ and
// screenshots/ from beside this file into it, and writes /output/dossier.json
// with buildDossier from the vendored make.fun library — the summary the
// judge reads. It runs twice in grading and both runs must write the same
// bytes, so nothing here depends on time, randomness, or the environment
// beyond MAKEFUN_OUTPUT_DIR (which stands in for /output outside the grader).
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

/** The repository root: the directory this file lives in. */
function repoRoot() {
  return fileURLToPath(new URL('.', import.meta.url));
}

/** Where the hand-in goes: /output in the grader, or MAKEFUN_OUTPUT_DIR locally. */
function outputDir() {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

/** Empty the output directory and recreate it, so a stale file can never leak in. */
function prepareOutput(out) {
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
}

/** Copy the whole game/ tree (index.html, css, js) into the output. */
function copyGameFiles(root, out) {
  const source = join(root, 'game');
  if (!existsSync(source)) throw new Error('game/ is missing from the repository');
  cpSync(source, join(out, 'game'), { recursive: true });
}

/** Walk a tree and count its files and bytes, so the caps can be checked early. */
function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const inner = countTree(path);
      files += inner.files;
      bytes += inner.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

/** Refuse to hand in a game/ tree the scorer would refuse. */
function assertGameWithinCaps(root) {
  const { files, bytes } = countTree(join(root, 'game'));
  if (files > DOSSIER_CAPS.game_max_files) {
    throw new Error(`game/ holds ${files} files, over the ${DOSSIER_CAPS.game_max_files} cap`);
  }
  if (bytes > DOSSIER_CAPS.game_max_bytes) {
    throw new Error(`game/ holds ${bytes} bytes, over the ${DOSSIER_CAPS.game_max_bytes} cap`);
  }
}

/** Copy screenshots/ when it exists; the dossier caps how many and how big. */
function copyScreenshots(root, out) {
  const source = join(root, 'screenshots');
  if (!existsSync(source)) return;
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  cpSync(source, join(out, 'screenshots'), { recursive: true });
}

/** Build the dossier from the copied files and write it as dossier.json. */
function writeDossier(out) {
  const dossier = buildDossier(out, DOSSIER_CAPS);
  writeFileSync(join(out, 'dossier.json'), dossier);
}

/** The hand-in, start to finish. */
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
