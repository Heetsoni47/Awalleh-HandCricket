// Background music: loops public/music/bole-jo-koyal.mp3 at low volume.
// Browsers only allow audio after a tap, so the intro's Enter button starts it.

const SRC = `${import.meta.env.BASE_URL}music/bole-jo-koyal.mp3`;
const VOLUME = 0.35;

let audio = null;
let available = true;
let on = localStorage.getItem('hc:music') !== '0';
const subs = new Set();
const emit = () => subs.forEach((f) => f({ on, available, playing: !!audio && !audio.paused }));

function el() {
  if (!audio) {
    audio = new Audio(SRC);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = 'auto';
    audio.addEventListener('error', () => {
      available = false; // no music file added yet
      emit();
    });
    audio.addEventListener('play', emit);
    audio.addEventListener('pause', emit);
  }
  return audio;
}

export function startMusic() {
  if (!on || !available) return;
  el()
    .play()
    .catch(() => {});
}

export function setMusicOn(v) {
  on = v;
  localStorage.setItem('hc:music', v ? '1' : '0');
  if (v) startMusic();
  else audio?.pause();
  emit();
}

export const musicState = () => ({ on, available, playing: !!audio && !audio.paused });
export function onMusicChange(f) {
  subs.add(f);
  return () => subs.delete(f);
}

// Fallback: if the intro was skipped (e.g. it already played this session), start on the first tap anywhere
if (typeof window !== 'undefined') {
  const first = () => {
    startMusic();
    window.removeEventListener('pointerdown', first);
    window.removeEventListener('keydown', first);
  };
  window.addEventListener('pointerdown', first);
  window.addEventListener('keydown', first);
}
