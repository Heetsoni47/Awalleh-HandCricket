// Synthesised sound effects (Web Audio API, no audio files, no paid APIs).

let ctx = null;
let muted = localStorage.getItem('hc:muted') === '1';
const subs = new Set();

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  localStorage.setItem('hc:muted', v ? '1' : '0');
  subs.forEach((f) => f(v));
}
export function onMuteChange(f) {
  subs.add(f);
  return () => subs.delete(f);
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noise(c, { dur, type = 'bandpass', freq = 1000, q = 1, gain = 0.5, attack = 0.005, at = 0 }) {
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur);
  return { f, g, t };
}

function tone(c, { freq, to, dur, type = 'sine', gain = 0.3, at = 0 }) {
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
  return o;
}

const play = (fn) => () => {
  if (muted) return;
  try {
    fn(ac());
  } catch {
    /* audio not available */
  }
};

export const sfx = {
  // willow on leather: sharp click + woody body
  bat: play((c) => {
    noise(c, { dur: 0.08, type: 'highpass', freq: 2500, gain: 0.7, attack: 0.001 });
    tone(c, { freq: 420, to: 180, dur: 0.12, type: 'triangle', gain: 0.35 });
  }),
  // stumps rattling + bails
  stumps: play((c) => {
    noise(c, { dur: 0.25, type: 'bandpass', freq: 1800, q: 3, gain: 0.6, attack: 0.001 });
    [0, 0.06, 0.13].forEach((at, i) => tone(c, { freq: 900 + i * 260, to: 500, dur: 0.12, type: 'square', gain: 0.06, at }));
  }),
  // crowd swell
  crowd: play((c) => {
    const { f, g, t } = noise(c, { dur: 2.2, type: 'bandpass', freq: 700, q: 0.6, gain: 0.0001, attack: 0.01 });
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    f.frequency.linearRampToValueAtTime(1100, t + 0.6);
  }),
  // sad duck quack: two descending nasal honks
  quack: play((c) => {
    [0, 0.28].forEach((at) => {
      const o = tone(c, { freq: 620, to: 380, dur: 0.22, type: 'sawtooth', gain: 0.12, at });
      o.detune.value = -20;
    });
  }),
  tick: play((c) => tone(c, { freq: 1200, dur: 0.04, type: 'sine', gain: 0.05 })),
  lock: play((c) => tone(c, { freq: 660, to: 880, dur: 0.08, type: 'sine', gain: 0.08 })),
};
