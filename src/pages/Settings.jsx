import { useState } from 'react'
import { hasCrypto } from '../lib/crypto'
import { clamp } from '../lib/util'
import { ConfirmButton } from '../components/Bits'
import { Icon } from '../components/Icon'
import { beep } from '../lib/audio'
import { useTracker } from '../state/TrackerProvider'
import { useAlerts } from '../state/AlertsProvider'
import { useFx } from '../state/FxProvider'

const Msg = ({ m }) => <div className={'msg ' + (m && (m.ok ? 'ok' : 'bad'))} role="status">{m ? m.msg : ''}</div>

function Security() {
  const { S, mode, setLock, changePass, removeLock, lockNow, update } = useTracker()
  const [p0, setP0] = useState(''), [p1, setP1] = useState(''), [p2, setP2] = useState('')
  const [m, setM] = useState(null)
  const clear = () => { setP0(''); setP1(''); setP2('') }
  const run = async (fn) => { setM({ ok: true, msg: 'Working...' }); const r = await fn(); setM(r.msg ? r : null); if (r.ok) clear() }
  const pw = (id, label, v, set, ac) => (
    <label className="field"><span>{label}</span><input type="password" id={id} value={v} onChange={(e) => set(e.target.value)} autoComplete={ac} /></label>
  )
  if (mode === 'vault') {
    return (
      <>
        <p className="small">Your progress is encrypted on this device with AES-256 using a key derived from your passcode (PBKDF2, 250,000 rounds). The page locks itself after {S.idle || 'no'} minutes idle.</p>
        <div className="formrow">
          <label className="field"><span>Auto-lock after (minutes, 0 = never)</span>
            <input type="number" min="0" max="120" value={S.idle} onChange={(e) => update((d) => { d.idle = clamp(+e.target.value || 0, 0, 120) })} /></label>
        </div>
        <label className="row"><input type="checkbox" checked={S.lockHide} onChange={(e) => update((d) => { d.lockHide = e.target.checked })} /> Lock when I switch to another tab or app</label>
        <hr className="hr" /><h3>Change passcode</h3>
        <div className="formrow">{pw('pw0', 'Current', p0, setP0, 'current-password')}{pw('pw1', 'New', p1, setP1, 'new-password')}{pw('pw2', 'Repeat new', p2, setP2, 'new-password')}</div>
        <div className="row">
          <button className="btn" onClick={() => run(() => changePass(p0, p1, p2))}>Change passcode</button>
          <button className="btn danger" onClick={() => run(() => removeLock(p0))}>Remove lock</button>
          <button className="btn" onClick={lockNow}>Lock now</button>
        </div>
        <Msg m={m} />
        <p className="small muted">Removing the lock needs the current passcode in the first box.</p>
      </>
    )
  }
  return (
    <>
      <div className="warnbox">Your progress is saved on this device without encryption.</div>
      {hasCrypto() ? (
        <>
          <div className="formrow">{pw('pw1', 'New passcode (4+ characters)', p1, setP1, 'new-password')}{pw('pw2', 'Repeat', p2, setP2, 'new-password')}</div>
          <div className="row"><button className="btn pri" onClick={() => run(() => setLock(p1, p2))}><Icon n="lock" s={16} /> Turn on lock</button></div>
          <Msg m={m} />
        </>
      ) : <p className="small muted">Encryption is not available in this browser.</p>}
    </>
  )
}

function Backup() {
  const { mode, exportBackup, importBackup, resetAll } = useTracker()
  const [text, setText] = useState(''), [pass, setPass] = useState(''), [m, setM] = useState(null)
  const copy = async (kind) => {
    const j = exportBackup(kind); setText(j)
    let ok = false
    try { await navigator.clipboard.writeText(j); ok = true } catch { /* clipboard blocked */ }
    setM({ ok: true, msg: ok ? 'Backup copied to the clipboard.' : 'Select the text above and copy it.' })
  }
  return (
    <div className="card stack">
      <h2>Backup and reset</h2>
      <p className="small muted">Progress lives only in this browser. Copy a backup now and then, and paste it back to restore or move to another device. {mode === 'vault' ? 'The encrypted backup stays protected by your passcode.' : 'Plain backups are readable text, so keep them private.'}</p>
      <div className="row">
        <button className="btn" onClick={() => copy('plain')}>Copy plain backup</button>
        {mode === 'vault' && <button className="btn" onClick={() => copy('enc')}>Copy encrypted backup</button>}
      </div>
      <textarea className="mono" value={text} onChange={(e) => setText(e.target.value)} aria-label="Backup text" placeholder="Backup appears here after you copy it. To restore, paste a backup here." />
      <label className="field"><span>Passcode for an encrypted backup (only when restoring one)</span>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" /></label>
      <div className="row">
        <ConfirmButton onConfirm={async () => setM(await importBackup(text, pass))}>Restore from pasted backup</ConfirmButton>
        <ConfirmButton className="btn danger" onConfirm={resetAll}>Erase all data</ConfirmButton>
      </div>
      <Msg m={m} />
    </div>
  )
}

export default function Settings() {
  const { S, update } = useTracker()
  const { notify } = useAlerts()
  const { toast } = useFx()
  const perm = (window.Notification && Notification.permission) || 'unsupported'
  const [, force] = useState(0)
  const askPerm = async () => {
    try {
      if (!window.Notification) return toast('Not supported', 'This browser does not offer desktop notifications here.')
      const r = await Notification.requestPermission()
      toast('Notifications: ' + r, r === 'granted' ? 'You will also get system notifications.' : 'In-page alerts and sound still work.')
      force((n) => n + 1)
    } catch { toast('Could not ask', 'This view blocks the permission prompt. In-page alerts still work.') }
  }
  const num = (key, lo, hi, dflt) => (e) => { const v = clamp(+e.target.value || dflt, lo, hi); update((d) => { d[key] = v }) }

  return (
    <>
      <div className="head"><div><span className="lbl">Settings</span><h1>Security and preferences</h1></div></div>
      <div className="card stack">
        <h2>Security</h2>
        <Security />
        <p className="small muted">There is no passcode recovery. If you forget it, the only way back in is to erase the data from the lock screen. Alarm names and times stay readable while locked so reminders can still ring. Failed unlock attempts are counted and shown the next time you get in.</p>
      </div>
      <div className="card stack">
        <h2>Goals</h2>
        <div className="formrow">
          <label className="field"><span>Daily study goal (minutes)</span><input type="number" min="10" max="720" value={S.goal} onChange={num('goal', 10, 720, 120)} /></label>
          <label className="field"><span>Started on</span><input type="date" value={S.start} onChange={(e) => e.target.value && update((d) => { d.start = e.target.value })} /></label>
          <label className="field"><span>Target finish date</span><input type="date" value={S.target} onChange={(e) => e.target.value && update((d) => { d.target = e.target.value })} /></label>
        </div>
        <div className="formrow">
          <label className="field"><span>Focus minutes</span><input type="number" min="1" max="180" value={S.foc} onChange={num('foc', 1, 180, 25)} /></label>
          <label className="field"><span>Break minutes</span><input type="number" min="1" max="60" value={S.brk} onChange={num('brk', 1, 60, 5)} /></label>
        </div>
      </div>
      <div className="card stack">
        <h2>Alerts</h2>
        <label className="row"><input type="checkbox" checked={S.notify} onChange={(e) => update((d) => { d.notify = e.target.checked })} /> Ring alarms for routine blocks</label>
        <label className="row"><input type="checkbox" checked={S.sound} onChange={(e) => { if (e.target.checked) beep(); update((d) => { d.sound = e.target.checked }) }} /> Play a sound</label>
        <div className="row">
          <button className="btn" onClick={askPerm}>Allow desktop notifications</button>
          <button className="btn" onClick={() => notify('Test alarm', 'Alarms look like this.')}>Test alarm</button>
          <span className="pill">{perm}</span>
        </div>
        <p className="small muted">In-page alerts and sound always work while the tab is open. Desktop notifications depend on whether your browser lets this page ask. Alerts cannot fire when the tab is closed.</p>
      </div>
      <div className="card stack">
        <h2>Appearance</h2>
        <label className="field"><span>Theme</span>
          <select value={S.theme} onChange={(e) => update((d) => { d.theme = e.target.value })}>
            <option value="auto">Match my device</option><option value="light">Light</option><option value="dark">Dark</option>
          </select></label>
      </div>
      <Backup />
    </>
  )
}
