let bellTimeout = null;
let bellInterval = null;
let activeAudioContext = null;

function ringOnce() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  if (!activeAudioContext || activeAudioContext.state === 'closed') {
    activeAudioContext = new AudioContext();
  }

  const ctx = activeAudioContext;
  const now = ctx.currentTime;

  const playTone = (frequency, startAt, duration, volume = 0.16) => {
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

  // Campainha estilo delivery: ding-dong duas notas.
  playTone(784, now, 0.45);       // G5
  playTone(587.33, now + 0.32, 0.65); // D5
}

export function stopNewOrderBell() {
  if (bellInterval) {
    clearInterval(bellInterval);
    bellInterval = null;
  }

  if (bellTimeout) {
    clearTimeout(bellTimeout);
    bellTimeout = null;
  }
}

export function playNewOrderBell(durationMs = 5000) {
  try {
    stopNewOrderBell();

    ringOnce();
    bellInterval = setInterval(ringOnce, 1200);

    bellTimeout = setTimeout(() => {
      stopNewOrderBell();
    }, durationMs);
  } catch (error) {
    console.warn('Erro ao tocar campainha de novo pedido:', error);
  }
}
