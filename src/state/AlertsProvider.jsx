import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { jget } from '../lib/storage'
import { dkey } from '../lib/util'
import { beep } from '../lib/audio'
import { routineDone } from '../lib/model'
import { useFx } from './FxProvider'
import { useTracker } from './TrackerProvider'

const Ctx = createContext(null)
export const useAlerts = () => useContext(Ctx)
export const BASE_TITLE = 'Cohort 3.0 Tracker'

/** Routine alarms. Runs even while the tracker is locked, using the plaintext alarm list in lt_pub. */
export function AlertsProvider({ children }) {
  const { toast } = useFx()
  const { S } = useTracker()
  const sRef = useRef(S); sRef.current = S
  const fired = useRef(new Set())
  const flashT = useRef(null)

  const flash = useCallback((msg) => {
    clearTimeout(flashT.current)
    document.title = msg
    flashT.current = setTimeout(() => { flashT.current = null; document.title = BASE_TITLE }, 12000)
  }, [])
  const isFlashing = useCallback(() => !!flashT.current, [])

  const notify = useCallback((title, body) => {
    const s = sRef.current
    const snd = s ? s.sound : jget('lt_pub', {}).s !== false
    toast(title, body, true, true)
    if (snd) beep()
    flash('⏰ ' + title)
    try {
      if (window.Notification && Notification.permission === 'granted') {
        const n = new Notification(title, { body: body || '' })
        n.onclick = () => { try { window.focus() } catch { /* ignore */ } }
      }
    } catch { /* ignore */ }
  }, [toast, flash])

  const tick = useCallback(() => {
    const s = sRef.current, now = new Date()
    const mod = now.getHours() * 60 + now.getMinutes(), day = dkey(now), dow = now.getDay()
    const pub = jget('lt_pub', {})
    const on = s ? s.notify : pub.n !== false
    const items = (s ? s.routine.filter((r) => r.on) : pub.items || []).filter((r) => !r.days || r.days.includes(dow))
    if (on) {
      items.forEach((r) => {
        const p = r.time.split(':').map(Number), d = mod - (p[0] * 60 + p[1]), k = day + r.id
        if (d >= 0 && d <= 1 && !fired.current.has(k)) {
          fired.current.add(k)
          if (s && routineDone(s, day, r.id)) return
          notify('Now: ' + r.label, r.time + (s ? '' : ' (tracker is locked)'))
        }
      })
    }
    if (fired.current.size > 300) fired.current.clear()
  }, [notify])

  useEffect(() => {
    const iv = setInterval(tick, 15000)
    const vis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis) }
  }, [tick])

  // check straight away when the tracker opens or unlocks
  const hasS = !!S
  useEffect(() => { if (hasS) tick() }, [hasS, tick])

  const value = useMemo(() => ({ notify, flash, isFlashing }), [notify, flash, isFlashing])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
