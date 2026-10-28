// Alarm beep and generated ambient noise (all in WebAudio, works offline).
let AC = null
export function ensureAC() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)()
    if (AC.state === 'suspended') AC.resume()
  } catch { /* unsupported */ }
  return AC
}
export const audioSuspended = () => !!AC && AC.state === 'suspended'

export function beep() {
  try {
    const ac = ensureAC(); if (!ac) return
    const t = ac.currentTime
    ;[660, 880, 660].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.type = 'sine'; o.frequency.value = f
      const s = t + i * 0.24
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(0.2, s + 0.03)
      g.gain.linearRampToValueAtTime(0, s + 0.22)
      o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + 0.23)
    })
  } catch { /* ignore */ }
}

const NZ = { kind: 'off', src: null, gain: null }
export const noiseKind = () => NZ.kind
export function setNoiseVolume(v) { if (NZ.gain) NZ.gain.gain.value = v }
export function noise(kind, vol = 0.3) {
  try {
    if (NZ.src) { NZ.src.stop(); NZ.src.disconnect(); NZ.src = null }
    NZ.kind = kind
    if (kind === 'off') return
    const ac = ensureAC(); if (!ac) { NZ.kind = 'off'; return }
    const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 } else d[i] = w * 0.5
    }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true
    let node = src
    if (kind === 'rain') {
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000
      src.connect(hp); hp.connect(lp); node = lp
    }
    NZ.gain = ac.createGain(); NZ.gain.gain.value = vol
    node.connect(NZ.gain); NZ.gain.connect(ac.destination); src.start(); NZ.src = src
  } catch { NZ.kind = 'off' }
}
