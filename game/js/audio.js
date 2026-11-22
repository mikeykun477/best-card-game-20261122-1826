// Ember Sigils — WebAudio bleeps only. No audio files, no network.
// The context is created on the first user gesture, so autoplay rules never bite.
let ctx = null;
let muted = false;

export function unlockAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

/** One short oscillator note: frequency, seconds, wave shape, volume. */
function blip(freq, seconds, type, volume, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds + 0.02);
}

export const sfx = {
  play() { blip(520, 0.09, 'triangle', 0.16); blip(780, 0.07, 'triangle', 0.1, 0.05); },
  hit() { blip(150, 0.18, 'sawtooth', 0.2); blip(90, 0.22, 'square', 0.12, 0.03); },
  guard() { blip(340, 0.12, 'sine', 0.14); blip(440, 0.1, 'sine', 0.1, 0.06); },
  surge() { blip(660, 0.08, 'sine', 0.12); blip(880, 0.08, 'sine', 0.12, 0.07); blip(1100, 0.1, 'sine', 0.1, 0.14); },
  win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.16, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.26, 'sine', 0.14, i * 0.14)); },
  draw() { blip(600, 0.05, 'triangle', 0.07); },
};
