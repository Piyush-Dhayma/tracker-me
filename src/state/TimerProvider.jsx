import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { fmtClock, today } from '../lib/util'
import { nextChapter } from '../lib/model'
import { BASE_TITLE, useAlerts } from './AlertsProvider'
import { useTracker } from './TrackerProvider'

const Ctx = createContext(null)
export const useTimer = () => useContext(Ctx)

/** Pomodoro timer. Lives above the lock screen, so a running session survives an idle auto-lock. */
export function TimerProvider({ children }) {
  const { S, update, logMin } = useTracker()
  const { notify, isFlashing } = useAlerts()
  const sRef = useRef(S); sRef.current = S

  const [t, setTState] = useState({ mode: 'foc', dur: 25 * 60, left: 25 * 60, run: false })
  const tRef = useRef(t)
  const setT = useCallback((patch) => { tRef.current = { ...tRef.current, ...patch }; setTState(tRef.current) }, [])
  const endRef = useRef(0)
  const chapRef = useRef(null)
  const hRef = useRef(null)
  const wlRef = useRef(null)

  const releaseWL = () => { if (wlRef.current) { try { wlRef.current.release() } catch { /* ignore */ } wlRef.current = null } }
  const stop = useCallback(() => { clearInterval(hRef.current); releaseWL() }, [])

  const setMode = useCallback((mode) => {
    stop()
    const s = sRef.current
    const dur = (mode === 'foc' ? (s ? s.foc : 25) : s ? s.brk : 5) * 60
    setT({ mode, dur, left: dur, run: false })
  }, [setT, stop])

  const finish = useCallback(() => {
    stop()
    const { mode, dur } = tRef.current, mins = Math.round(dur / 60)
    if (mode === 'foc') {
      logMin(mins, chapRef.current)
      if (sRef.current) { const d = today(); update((x) => { x.sess[d] = (x.sess[d] || 0) + 1 }) }
      notify('Focus session complete', mins + ' minutes logged. Take a break.')
      setMode('brk')
    } else {
      notify('Break over', 'Ready for the next focus session?')
      setMode('foc')
    }
  }, [stop, logMin, update, notify, setMode])

  const step = useCallback(() => {
    const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
    setT({ left })
    if (left <= 0) finish()
  }, [setT, finish])

  const toggle = useCallback(() => {
    if (tRef.current.run) {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))
      stop(); setT({ left, run: false })
    } else {
      const s = sRef.current
      chapRef.current = s ? (nextChapter(s) || {}).id || null : null
      endRef.current = Date.now() + tRef.current.left * 1000
      setT({ run: true })
      hRef.current = setInterval(step, 250)
      try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { wlRef.current = w }).catch(() => {}) } catch { /* ignore */ }
    }
  }, [setT, stop, step])

  const reset = useCallback(() => setMode(tRef.current.mode), [setMode])
  const preset = useCallback((m) => {
    if (tRef.current.mode === 'foc') update((d) => { d.foc = m })
    stop()
    setT({ dur: m * 60, left: m * 60, run: false })
  }, [update, stop, setT])

  // follow Settings changes while idle
  const foc = S && S.foc, brk = S && S.brk
  useEffect(() => { if (!tRef.current.run) setMode(tRef.current.mode) }, [foc, brk, setMode])

  useEffect(() => {
    const vis = () => { if (!document.hidden && tRef.current.run) step() }
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); stop() }
  }, [step, stop])

  useEffect(() => {
    if (t.run) document.title = fmtClock(t.left) + ' · ' + BASE_TITLE
    else if (!isFlashing()) document.title = BASE_TITLE
  }, [t.run, t.left, isFlashing])

  const value = useMemo(() => ({ ...t, toggle, reset, preset, setMode }), [t, toggle, reset, preset, setMode])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
