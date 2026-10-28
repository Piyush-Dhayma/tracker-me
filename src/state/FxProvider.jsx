import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uid } from '../lib/util'
import { Icon } from '../components/Icon'

const FxCtx = createContext(null)
export const useFx = () => useContext(FxCtx)

const COLORS = ['#ff7a4d', '#4cd39a', '#e8b252', '#6ea8ff', '#c78bff']

/** Toasts (stackable, dismissible) and a confetti canvas, available everywhere via useFx(). */
export function FxProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const cv = useRef(null)
  const raf = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((title, body, sticky, alarm) => {
    const id = uid()
    setToasts((t) => [...t, { id, title, body: body || '', alarm: !!alarm }].slice(-4))
    setTimeout(() => dismiss(id), sticky ? 90000 : 5000)
  }, [dismiss])

  const confetti = useCallback(() => {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return
    const el = cv.current
    let x
    try { x = el && el.getContext('2d') } catch { x = null }
    if (!el || !x) return
    cancelAnimationFrame(raf.current)
    el.hidden = false
    const w = (el.width = innerWidth), h = (el.height = innerHeight)
    const P = [...Array(90)].map(() => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.35, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
      s: 4 + Math.random() * 5, c: COLORS[(Math.random() * 5) | 0], r: Math.random() * 6,
    }))
    let f = 0
    const step = () => {
      x.clearRect(0, 0, w, h)
      P.forEach((p) => {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.r += 0.2
        x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); x.restore()
      })
      if (++f < 110) raf.current = requestAnimationFrame(step)
      else { x.clearRect(0, 0, w, h); el.hidden = true }
    }
    step()
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const value = useMemo(() => ({ toast, confetti }), [toast, confetti])

  return (
    <FxCtx.Provider value={value}>
      {children}
      <div id="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={'toast' + (t.alarm ? ' alarm' : '')}>
            <div><strong>{t.title}</strong><span>{t.body}</span></div>
            <button aria-label="Dismiss" onClick={() => dismiss(t.id)}>&times;</button>
          </div>
        ))}
      </div>
      <canvas id="confetti" ref={cv} hidden />
    </FxCtx.Provider>
  )
}
