let bellTimeout = null
let bellInterval = null
let audio = null
let activeAudioContext = null

const soundCandidates = ['/sounds/notification.mp3', '/sounds/notification.mp3.mp3']

function playUploadedSound() {
  if (typeof window === 'undefined') return false
  try {
    if (!audio) {
      audio = new Audio(soundCandidates[0])
      audio.volume = 1
      audio.onerror = () => {
        if (audio && audio.src.includes('notification.mp3') && !audio.src.includes('mp3.mp3')) {
          audio.src = soundCandidates[1]
        }
      }
    }
    audio.currentTime = 0
    const p = audio.play()
    if (p?.catch) p.catch(() => ringOnce())
    return true
  } catch {
    return false
  }
}

function ringOnce() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return
  if (!activeAudioContext || activeAudioContext.state === 'closed') activeAudioContext = new AudioContext()
  const ctx = activeAudioContext
  const now = ctx.currentTime
  const playTone = (frequency, startAt, duration, volume = 0.18) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, startAt)
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startAt)
    osc.stop(startAt + duration + 0.05)
  }
  playTone(784, now, 0.45)
  playTone(587.33, now + 0.32, 0.65)
}

export function stopNewOrderBell() {
  if (bellInterval) clearInterval(bellInterval)
  if (bellTimeout) clearTimeout(bellTimeout)
  bellInterval = null
  bellTimeout = null
  if (audio) {
    try { audio.pause(); audio.currentTime = 0 } catch {}
  }
}

export function playNewOrderBell(durationMs = 5000) {
  try {
    stopNewOrderBell()
    playUploadedSound() || ringOnce()
    bellInterval = setInterval(() => playUploadedSound() || ringOnce(), 1200)
    bellTimeout = setTimeout(stopNewOrderBell, durationMs)
  } catch (error) {
    console.warn('Erro ao tocar campainha de novo pedido:', error)
  }
}
