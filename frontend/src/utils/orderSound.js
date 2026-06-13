/**
 * utilitário de áudio para campainha e notificações do MeuDeliveryAI
 */

let campainhaAudioElement = null;
let notificationAudioElement = null;
let campainhaInterval = null;
let campainhaTimeout = null;
let activeAudioContext = null;
let unlocked = false;

function getCampainhaAudio() {
  if (typeof window === 'undefined') return null;
  if (!campainhaAudioElement) {
    campainhaAudioElement = new Audio('/sounds/campainha.mp3');
    campainhaAudioElement.volume = 1.0;
    campainhaAudioElement.preload = 'auto';
  }
  return campainhaAudioElement;
}

function getNotificationAudio() {
  if (typeof window === 'undefined') return null;
  if (!notificationAudioElement) {
    notificationAudioElement = new Audio('/sounds/notification.mp3');
    notificationAudioElement.volume = 1.0;
    notificationAudioElement.preload = 'auto';
  }
  return notificationAudioElement;
}

export function isCampainhaRunning() {
  return !!campainhaInterval;
}

export async function unlockOrderBell() {
  try {
    const camp = getCampainhaAudio();
    const notif = getNotificationAudio();
    if (camp) {
      camp.muted = true;
      await camp.play().catch(() => null);
      camp.pause();
      camp.currentTime = 0;
      camp.muted = false;
    }
    if (notif) {
      notif.muted = true;
      await notif.play().catch(() => null);
      notif.pause();
      notif.currentTime = 0;
      notif.muted = false;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext && (!activeAudioContext || activeAudioContext.state === 'closed')) {
      activeAudioContext = new AudioContext();
    }
    if (activeAudioContext?.state === 'suspended') {
      await activeAudioContext.resume();
    }
    unlocked = true;
    localStorage.setItem('mda_bell_unlocked', '1');
    localStorage.setItem('orderSoundEnabled', 'true');
    return true;
  } catch (e) {
    console.warn('Não foi possível liberar os áudios:', e);
    return false;
  }
}

function ringFallback() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!activeAudioContext || activeAudioContext.state === 'closed') {
    activeAudioContext = new AudioContext();
  }
  const ctx = activeAudioContext;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => null);
  }
  const now = ctx.currentTime;
  const playTone = (frequency, startAt, duration, volume = 0.2) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  };
  // Toca um bipe duplo clássico de campainha
  playTone(880, now, 0.25, 0.25);
  playTone(880, now + 0.3, 0.25, 0.25);
}

export function startNewOrderCampainha() {
  if (typeof window === 'undefined') return;

  const audio = getCampainhaAudio();
  const localVal = localStorage.getItem('orderSoundEnabled');
  const localEnabled = localVal === null ? true : localVal === 'true';
  if (!localEnabled) return;

  if (audio) {
    if (audio.paused) {
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Erro ao tocar campainha:', e));
    }
  } else {
    if (!campainhaInterval) {
      ringFallback();
      campainhaInterval = setInterval(ringFallback, 4000);
    }
  }

  // Limpa timeout anterior
  if (campainhaTimeout) {
    clearTimeout(campainhaTimeout);
  }
  // Para automaticamente após 2 minutos (120 segundos)
  campainhaTimeout = setTimeout(() => {
    stopNewOrderCampainha();
  }, 120000);
}

export function stopNewOrderCampainha() {
  if (campainhaInterval) {
    clearInterval(campainhaInterval);
    campainhaInterval = null;
  }
  if (campainhaTimeout) {
    clearTimeout(campainhaTimeout);
    campainhaTimeout = null;
  }
  try {
    if (campainhaAudioElement) {
      campainhaAudioElement.pause();
      campainhaAudioElement.currentTime = 0;
    }
  } catch (e) {
    // Silencia erros se o áudio não puder ser pausado
  }
}

export async function playNotificationSound() {
  const localVal = localStorage.getItem('orderSoundEnabled');
  const localEnabled = localVal === null ? true : localVal === 'true';
  if (!localEnabled) return;

  try {
    const audio = getNotificationAudio();
    if (audio) {
      audio.currentTime = 0;
      await audio.play();
    }
  } catch (e) {
    console.warn('Erro ao tocar som de notificação:', e);
  }
}

// Para manter compatibilidade com importações antigas
export function playNewOrderBell(durationMs = 5000) {
  startNewOrderCampainha();
  setTimeout(stopNewOrderCampainha, durationMs);
}
export function stopNewOrderBell() {
  stopNewOrderCampainha();
}

// Auto-desbloqueio nas interações do usuário (caso já tenha clicado antes)
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    window.addEventListener(evt, () => {
      const alreadyUnlocked = localStorage.getItem('mda_bell_unlocked') === '1';
      if (!unlocked && alreadyUnlocked) {
        unlockOrderBell();
      }
    }, { once: false, passive: true });
  });
}
