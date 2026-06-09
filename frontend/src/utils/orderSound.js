let bellTimeout = null;
let bellInterval = null;
let activeAudio = null;
let unlocked = false;

function getSoundUrl() {
  return '/sounds/notification.mp3';
}

function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  try {
    const a = new Audio(getSoundUrl());
    a.volume = 0;
    a.play().then(() => {
      a.pause();
      a.currentTime = 0;
    }).catch(() => {});
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  ['click', 'keydown', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });
}

function playMp3Once() {
  try {
    const audio = new Audio(getSoundUrl());
    activeAudio = audio;
    audio.volume = 1;
    audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => playToneOnce());
    }
    setTimeout(() => {
      try { audio.pause(); audio.currentTime = 0; } catch (_) {}
    }, 1100);
  } catch (_) {
    playToneOnce();
  }
}

function playToneOnce() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const tone = (freq, start, duration, volume = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + duration + 0.05);
    };
    tone(784, now, 0.45);
    tone(587.33, now + 0.35, 0.65);
    setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch (err) {
    console.warn('Erro ao tocar campainha:', err);
  }
}

export function stopNewOrderBell() {
  if (bellInterval) clearInterval(bellInterval);
  if (bellTimeout) clearTimeout(bellTimeout);
  bellInterval = null;
  bellTimeout = null;
  if (activeAudio) {
    try { activeAudio.pause(); activeAudio.currentTime = 0; } catch (_) {}
  }
}

export function playNewOrderBell(durationMs = 5000) {
  stopNewOrderBell();
  playMp3Once();
  bellInterval = setInterval(playMp3Once, 1200);
  bellTimeout = setTimeout(stopNewOrderBell, durationMs);
}
