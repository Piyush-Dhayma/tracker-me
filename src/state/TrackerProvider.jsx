import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { produce } from 'immer'
import { CM, EPS } from '../data/curriculum'
import { addDays, today } from '../lib/util'
import { jget, lsDel, lsGet, lsSet, storageWorks, wipeStorage } from '../lib/storage'
import { derive, hasCrypto, newSalt, openBlob, openVault, sealWith } from '../lib/crypto'
import { BADGES, REV, defaults, epProg, normalize, stat } from '../lib/model'
import { noise } from '../lib/audio'
import { useFx } from './FxProvider'

const Ctx = createContext(null)
export const useTracker = () => useContext(Ctx)

/** Decide the first screen from what is in storage. */
function boot() {
  const meta = jget('lt_meta', null)
  if (!meta) {
    if (hasCrypto()) return { phase: 'setup', S: null, mode: null }
    const S = defaults()
    lsSet('lt_meta', JSON.stringify({ mode: 'plain' })); lsSet('lt_plain', JSON.stringify(S))
    return { phase: 'ready', S, mode: 'plain' }
  }
  if (meta.mode === 'plain') return { phase: 'ready', S: normalize(jget('lt_plain', {})), mode: 'plain' }
  if (hasCrypto() && jget('lt_vault', null)) return { phase: 'lock', S: null, mode: 'vault' }
  wipeStorage()
  return { phase: 'setup', S: null, mode: null }
}

export function TrackerProvider({ children }) {
  const { toast, confetti } = useFx()
  const [init] = useState(boot)
  const [phase, setPhase] = useState(init.phase)
  const [S, setS] = useState(init.S)
  const [mode, setModeState] = useState(init.mode)

  const sRef = useRef(S); sRef.current = S
  const modeRef = useRef(init.mode); modeRef.current = mode
  const keyRef = useRef(null)
  const saltRef = useRef(null)
  const lastAct = useRef(Date.now())
  const pending = useRef({ min: 0, ch: {} })
  const announced = useRef(new Set())

  const update = useCallback((recipe) => setS((s) => (s ? produce(s, recipe) : s)), [])

  /* ----- persistence ----- */
  const persist = useCallback(async (s) => {
    if (!s) return
    lsSet('lt_pub', JSON.stringify({
      theme: s.theme, n: s.notify, s: s.sound,
      items: s.routine.filter((r) => r.on).map((r) => ({ id: r.id, time: r.time, label: r.label, days: r.days })),
    }))
    try {
      if (modeRef.current === 'vault' && keyRef.current) await sealWith(keyRef.current, saltRef.current, s)
      else if (modeRef.current === 'plain') lsSet('lt_plain', JSON.stringify(s))
    } catch { toast('Could not save', 'Browser storage refused the write.') }
  }, [toast])

  useEffect(() => {
    if (!S) return undefined
    const h = setTimeout(() => persist(S), 350)
    return () => clearTimeout(h)
  }, [S, persist])

  useEffect(() => {
    const onHide = () => persist(sRef.current)
    addEventListener('pagehide', onHide)
    return () => removeEventListener('pagehide', onHide)
  }, [persist])

  /* ----- entering the app ----- */
  const enter = useCallback((s0, m) => {
    const p = pending.current
    if (p.min || Object.keys(p.ch).length) {
      s0 = produce(s0, (d) => {
        d.log[today()] = (d.log[today()] || 0) + p.min
        for (const k in p.ch) if (CM[k]) d.ctime[k] = (d.ctime[k] || 0) + p.ch[k]
      })
      pending.current = { min: 0, ch: {} }
    }
    modeRef.current = m; setModeState(m); setS(s0); setPhase('ready'); lastAct.current = Date.now()
  }, [])

  useEffect(() => {
    if (phase !== 'ready') return
    if (!announced.current.has('storage') && !storageWorks()) {
      announced.current.add('storage')
      toast('Storage is blocked', 'Progress will not persist after you close this tab.', true)
    }
    const au = jget('lt_audit', { n: 0 })
    if (au.n && modeRef.current === 'vault') {
      lsDel('lt_audit')
      toast('Security notice', au.n + ' failed unlock attempt' + (au.n > 1 ? 's' : '') + ' since your last visit.', true)
    }
  }, [phase, toast])

  /* ----- theme ----- */
  const theme = S ? S.theme : jget('lt_pub', {}).theme || 'auto'
  useEffect(() => {
    const r = document.documentElement
    if (theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme)
  }, [theme])

  /* ----- lock screen flows ----- */
  const setup = useCallback(async (pass) => {
    const s0 = defaults(), salt = newSalt(), key = await derive(pass, salt)
    keyRef.current = key; saltRef.current = salt
    lsSet('lt_meta', JSON.stringify({ mode: 'vault' }))
    await sealWith(key, salt, s0); lsDel('lt_plain')
    enter(s0, 'vault')
  }, [enter])

  const skipSetup = useCallback(() => {
    const s0 = defaults()
    lsSet('lt_meta', JSON.stringify({ mode: 'plain' })); lsSet('lt_plain', JSON.stringify(s0))
    enter(s0, 'plain')
  }, [enter])

  const unlock = useCallback(async (pass) => {
    const fl = jget('lt_fail', { n: 0, until: 0 })
    if (Date.now() < fl.until) return { ok: false, locked: true }
    try {
      const r = await openVault(pass)
      keyRef.current = r.key; saltRef.current = r.salt
      lsDel('lt_fail'); enter(normalize(r.data), 'vault')
      return { ok: true }
    } catch {
      fl.n++
      if (fl.n >= 5) fl.until = Date.now() + Math.min(15 * 60e3, 15e3 * Math.pow(2, fl.n - 5))
      lsSet('lt_fail', JSON.stringify(fl))
      const a = jget('lt_audit', { n: 0 }); a.n++; a.last = Date.now(); lsSet('lt_audit', JSON.stringify(a))
      return { ok: false }
    }
  }, [enter])

  const resetAll = useCallback(() => {
    noise('off'); wipeStorage()
    keyRef.current = null; saltRef.current = null; modeRef.current = null
    setS(null); setModeState(null); setPhase('setup')
  }, [])

  const lockNow = useCallback(async () => {
    if (modeRef.current !== 'vault' || !sRef.current) return
    await persist(sRef.current)
    noise('off')
    keyRef.current = null; saltRef.current = null
    setS(null); setPhase('lock')
  }, [persist])

  /* ----- security settings ----- */
  const verifyPass = async (p) => { try { await openVault(p); return true } catch { return false } }
  const setLock = useCallback(async (p1, p2) => {
    if (p1.length < 4) return { ok: false, msg: 'Use at least 4 characters.' }
    if (p1 !== p2) return { ok: false, msg: 'The two passcodes do not match.' }
    try {
      const salt = newSalt(), key = await derive(p1, salt)
      keyRef.current = key; saltRef.current = salt; modeRef.current = 'vault'; setModeState('vault')
      lsSet('lt_meta', JSON.stringify({ mode: 'vault' }))
      await sealWith(key, salt, sRef.current); lsDel('lt_plain')
      toast('Lock is on', 'Your progress is now encrypted.')
      return { ok: true }
    } catch (e) { return { ok: false, msg: 'Failed: ' + e.message } }
  }, [toast])
  const changePass = useCallback(async (p0, p1, p2) => {
    if (!(await verifyPass(p0))) return { ok: false, msg: 'Current passcode is wrong.' }
    if (p1.length < 4) return { ok: false, msg: 'New passcode needs 4+ characters.' }
    if (p1 !== p2) return { ok: false, msg: 'The new passcodes do not match.' }
    const salt = newSalt(), key = await derive(p1, salt)
    keyRef.current = key; saltRef.current = salt
    await sealWith(key, salt, sRef.current)
    return { ok: true, msg: 'Passcode changed.' }
  }, [])
  const removeLock = useCallback(async (p0) => {
    if (!(await verifyPass(p0))) return { ok: false, msg: 'Enter your current passcode in the first box.' }
    modeRef.current = 'plain'; setModeState('plain')
    lsSet('lt_meta', JSON.stringify({ mode: 'plain' })); lsSet('lt_plain', JSON.stringify(sRef.current)); lsDel('lt_vault')
    keyRef.current = null; saltRef.current = null
    toast('Lock removed', 'Progress is saved without encryption.')
    return { ok: true }
  }, [toast])

  const exportBackup = useCallback((kind) => (kind === 'enc' ? lsGet('lt_vault') || '' : JSON.stringify(sRef.current)), [])
  const importBackup = useCallback(async (text, pass) => {
    let o
    try { o = JSON.parse(text) } catch { return { ok: false, msg: 'That is not a valid backup.' } }
    try {
      let next
      if (o && o.s && o.i && o.d) {
        if (!hasCrypto()) throw new Error('nocrypto')
        next = normalize((await openBlob(o, pass)).data)
      } else {
        if (!o || typeof o !== 'object' || typeof o.status !== 'object') throw new Error('shape')
        next = normalize(o)
      }
      setS(next)
      return { ok: true, msg: 'Backup restored.' }
    } catch {
      return { ok: false, msg: o && o.s ? 'Could not decrypt. Check the passcode in the box above.' : 'That does not look like a backup from this tracker.' }
    }
  }, [])

  /* ----- idle lock, tab hide ----- */
  useEffect(() => {
    const act = () => { lastAct.current = Date.now() }
    const evs = ['pointerdown', 'keydown', 'touchstart', 'wheel']
    evs.forEach((e) => addEventListener(e, act, { passive: true, capture: true }))
    const iv = setInterval(() => {
      const s = sRef.current
      if (modeRef.current === 'vault' && s && s.idle > 0 && Date.now() - lastAct.current > s.idle * 60000) lockNow()
    }, 10000)
    const vis = () => { if (document.hidden && modeRef.current === 'vault' && sRef.current && sRef.current.lockHide) lockNow() }
    document.addEventListener('visibilitychange', vis)
    return () => {
      evs.forEach((e) => removeEventListener(e, act, { capture: true }))
      clearInterval(iv); document.removeEventListener('visibilitychange', vis)
    }
  }, [lockNow])

  /* ----- domain actions ----- */
  const setStatus = useCallback((id, v) => {
    const cur = sRef.current; if (!cur) return
    const c = CM[id], t = today()
    let epDone = false
    if (v === 2 && stat(cur, id) !== 2) { const p = epProg(cur, c.ep); epDone = p.d + 1 === p.t }
    update((d) => {
      if (v) d.status[id] = v; else delete d.status[id]
      if (v === 2) { d.doneAt[id] = t; d.revs[id] = { step: 0, due: addDays(t, REV[0]) }; if (d.cur === id) d.cur = null }
      else { delete d.doneAt[id]; delete d.revs[id] }
    })
    if (epDone) { toast('Episode complete', EPS[c.ep].n); confetti() }
  }, [update, toast, confetti])

  const logMin = useCallback((m, chap) => {
    if (!sRef.current) {
      pending.current.min += m
      if (chap) pending.current.ch[chap] = (pending.current.ch[chap] || 0) + m
      return
    }
    const t = today()
    update((d) => {
      d.log[t] = (d.log[t] || 0) + m
      if (chap && CM[chap]) d.ctime[chap] = (d.ctime[chap] || 0) + m
    })
  }, [update])

  /* ----- badges ----- */
  useEffect(() => {
    if (!S) return
    const fresh = BADGES.filter((b) => !S.badges[b.id] && !announced.current.has('b:' + b.id) && b.test(S))
    if (!fresh.length) return
    fresh.forEach((b) => { announced.current.add('b:' + b.id); toast('Badge earned: ' + b.n, b.d) })
    confetti()
    update((d) => { fresh.forEach((b) => { d.badges[b.id] = today() }) })
  }, [S, toast, confetti, update])

  const value = useMemo(() => ({
    phase, S, mode, update, setStatus, logMin, setup, skipSetup, unlock, resetAll, lockNow,
    setLock, changePass, removeLock, exportBackup, importBackup,
  }), [phase, S, mode, update, setStatus, logMin, setup, skipSetup, unlock, resetAll, lockNow, setLock, changePass, removeLock, exportBackup, importBackup])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
