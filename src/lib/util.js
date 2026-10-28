export const pad = (n) => String(n).padStart(2, '0')
export const dkey = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
export const pdate = (k) => new Date(k + 'T12:00:00')
export const addDays = (k, n) => { const d = pdate(k); d.setDate(d.getDate() + n); return dkey(d) }
export const diff = (a, b) => Math.round((pdate(b) - pdate(a)) / 864e5)
export const fmtD = (k) => pdate(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
export const uid = () => Math.random().toString(36).slice(2, 9)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const fmtMin = (m) => (m >= 60 ? Math.floor(m / 60) + 'h ' + pad(m % 60) + 'm' : m + 'm')
export const sum = (o) => { let s = 0; for (const k in o) s += +o[k] || 0; return s }
export const today = () => dkey()
export const fmtClock = (s) => pad(Math.floor(s / 60)) + ':' + pad(s % 60)
