// Sigil Delve — sound, synthesized, no files.
//
// Every sound is a short WebAudio oscillator burst. There is no audio
// asset to load, so the game stays a handful of static files and plays
// offline. M toggles it; the choice is remembered for the session only.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function tone(freq, dur, type, gain, when = 0) {
  if (muted) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // No audio device, or the browser blocked it: the game plays on silent.
  }
}

export const sfx = {
  play() { tone(520, 0.09, 'triangle', 0.12); },
  hit() { tone(180, 0.14, 'sawtooth', 0.14); tone(90, 0.18, 'square', 0.08, 0.02); },
  block() { tone(320, 0.1, 'sine', 0.12); },
  heal() { tone(660, 0.12, 'sine', 0.1); tone(880, 0.16, 'sine', 0.08, 0.08); },
  draft() { tone(440, 0.08, 'triangle', 0.1); tone(660, 0.08, 'triangle', 0.1, 0.07); tone(880, 0.12, 'triangle', 0.1, 0.14); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.12)); },
  loss() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.09, i * 0.14)); },
};
