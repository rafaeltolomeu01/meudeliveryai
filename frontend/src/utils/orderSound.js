
let bellTimeout = null;
let bellInterval = null;
let activeAudioContext = null;
let unlocked = false;
let audioElement = null;

const SOUND_PATHS = [
  '/sounds/notification.mp3',
  '/notification.mp3',
  '/sounds/campainha.mp3',
  '/campainha.mp3'
];

function getAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioElement) {
    audioElement = new Audio(SOUND_PATHS[0]);
    audioElement.volume = 1;
    audioElement.preload = 'auto';
  }
  return audioElement;
}

export async function unlockOrderBell() {
  try {
    const audio = getAudio();
    if (audio) {
      audio.muted = true;
      await audio.play().catch(() => null);
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext && (!activeAudioContext || activeAudioContext.state === 'closed')) activeAudioContext = new AudioContext();
    if (activeAudioContext?.state === 'suspended') await activeAudioContext.resume();
    unlocked = true;
    localStorage.setItem('mda_bell_unlocked', '1');
    return true;
  } catch (e) {
    console.warn('Não foi possível liberar a campainha:', e);
    return false;
  }
}

function ringFallback() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!activeAudioContext || activeAudioContext.state === 'closed') activeAudioContext = new AudioContext();
  const ctx = activeAudioContext;
  if (ctx.state === 'suspended') ctx.resume().catch(() => null);
  const now = ctx.currentTime;
  const playTone = (frequency, startAt, duration, volume = 0.2) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + duration + 0.05);
  };
  playTone(880, now, 0.38);
  playTone(660, now + 0.28, 0.55);
}

async function ringOnce() {
  try {
    const audio = getAudio();
    if (audio) {
      audio.currentTime = 0;
      await audio.play();
      return;
    }
  } catch (e) {
    // Se o navegador bloquear MP3, usa beep interno.
  }
  ringFallback();
}

export function stopNewOrderBell() {
  if (bellInterval) clearInterval(bellInterval);
  if (bellTimeout) clearTimeout(bellTimeout);
  bellInterval = null; bellTimeout = null;
  try { if (audioElement) { audioElement.pause(); audioElement.currentTime = 0; } } catch {}
}

export function playNewOrderBell(durationMs = 5000) {
  try {
    stopNewOrderBell();
    ringOnce();
    bellInterval = setInterval(ringOnce, 1200);
    bellTimeout = setTimeout(stopNewOrderBell, durationMs);
  } catch (error) {
    console.warn('Erro ao tocar campainha de novo pedido:', error);
    ringFallback();
  }
}

// Libera áudio após qualquer clique/toque no painel.
if (typeof window !== 'undefined') {
  ['click','touchstart','keydown'].forEach(evt => {
    window.addEventListener(evt, () => { if (!unlocked) unlockOrderBell(); }, { once: false, passive: true });
  });
}
