import { useEffect, useState } from 'react'
import { jget } from '../lib/storage'
import { Icon } from './Icon'
import { useTracker } from '../state/TrackerProvider'

/** Setup (choose a passcode or skip) and lock screen (unlock with back-off after 5 failures). */
export default function Gate() {
  const { phase, setup, skipSetup, unlock, resetAll } = useTracker()
  const isSetup = phase === 'setup'
  const [p1, setP1] = useState(''), [p2, setP2] = useState('')
  const [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [erase, setErase] = useState(false)
  const [left, setLeft] = useState(0)
  const audit = isSetup ? 0 : jget('lt_audit', { n: 0 }).n

  useEffect(() => {
    if (isSetup) return undefined
    const run = () => setLeft(Math.max(0, Math.ceil((jget('lt_fail', { n: 0, until: 0 }).until - Date.now()) / 1000)))
    run()
    const h = setInterval(run, 1000)
    return () => clearInterval(h)
  }, [isSetup, busy])

  const submit = async (e) => {
    e.preventDefault()
    if (isSetup) {
      if (p1.length < 4) return setMsg('Use at least 4 characters.')
      if (p1 !== p2) return setMsg('The two passcodes do not match.')
      setBusy(true); setMsg('Encrypting...')
      try { await setup(p1) } catch (err) { setMsg('Could not set the passcode: ' + err.message); setBusy(false) }
    } else {
      if (left > 0) return
      setBusy(true); setMsg('Checking...')
      const r = await unlock(p1)
      if (!r.ok) { setMsg('That passcode did not work.'); setP1(''); setBusy(false) }
    }
  }

  return (
    <div id="gate">
      <form className="card gatecard" onSubmit={submit} autoComplete="off">
        <div className="mark"><Icon n="lock" s={24} /></div>
        <div><span className="lbl">Cohort 3.0 Tracker</span><h1>{isSetup ? 'Protect your tracker' : 'Enter your passcode'}</h1></div>
        {isSetup
          ? <p className="muted small">Your progress stays in this browser. A passcode encrypts it, and the page locks itself when you step away. You can also skip this and add it later in Settings.</p>
          : audit > 0 && <div className="warnbox">{audit} failed attempt{audit > 1 ? 's' : ''} since your last successful unlock.</div>}
        <label className="field"><span>{isSetup ? 'Choose a passcode (4+ characters)' : 'Passcode'}</span>
          <input type="password" autoFocus required value={p1} onChange={(e) => setP1(e.target.value)} autoComplete={isSetup ? 'new-password' : 'current-password'} /></label>
        {isSetup && (
          <label className="field"><span>Repeat passcode</span>
            <input type="password" required value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" /></label>
        )}
        <div className="msg bad" role="status">{left > 0 ? `Too many attempts. Try again in ${left}s.` : msg}</div>
        <button className="btn pri" type="submit" disabled={busy || left > 0}>{isSetup ? 'Set passcode and start' : 'Unlock'}</button>
        {isSetup
          ? <button className="btn" type="button" onClick={skipSetup}>Continue without a lock</button>
          : (
            <>
              <button className="btn sm" type="button" onClick={() => setErase(true)}>Forgot passcode</button>
              {erase && (
                <div>
                  <p className="small muted">Erasing deletes all progress stored on this device. This cannot be undone.</p>
                  <button type="button" className="btn danger sm" onClick={resetAll}>Erase everything and start over</button>
                </div>
              )}
            </>
          )}
      </form>
    </div>
  )
}
