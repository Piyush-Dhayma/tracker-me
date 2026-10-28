import { useNavigate } from 'react-router-dom'
import { C, CM, EPS } from '../data/curriculum'
import { REV, isWeak } from '../lib/model'
import { addDays, fmtD, today } from '../lib/util'
import { useTracker } from '../state/TrackerProvider'

export default function Revise() {
  const { S, update } = useTracker()
  const nav = useNavigate()
  const t = today()
  const ks = Object.keys(S.revs).filter((k) => CM[k])
  const byDue = (a, b) => S.revs[a].due.localeCompare(S.revs[b].due)
  const due = ks.filter((k) => S.revs[k].due <= t).sort(byDue)
  const up = ks.filter((k) => S.revs[k].due > t).sort(byDue)
  const weak = C.filter((c) => isWeak(S, c))

  const revised = (id) => update((d) => {
    const r = d.revs[id]; if (!r) return
    r.step++; d.revCount++
    if (r.step >= REV.length) delete d.revs[id]; else r.due = addDays(today(), REV[r.step])
  })
  const snooze = (id) => update((d) => { d.revs[id].due = addDays(today(), 1) })

  const row = (k, isDue) => {
    const r = S.revs[k], c = CM[k]
    return (
      <div className="crow" key={k} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', '--h': EPS[c.ep].h }}>
        <div>
          <div style={{ fontWeight: 500 }}>{c.t}</div>
          <div className="cmeta">
            <span className="pill">E{c.ep + 1}</span>
            <span className="pill">review {r.step + 1} of {REV.length}</span>
            <span className={'pill ' + (isDue ? 'warn' : '')}>{isDue ? 'due ' + fmtD(r.due) : fmtD(r.due)}</span>
          </div>
        </div>
        <div className="row">
          {isDue && <><button className="btn sm pri" onClick={() => revised(k)}>Revised</button><button className="btn sm" onClick={() => snooze(k)}>Tomorrow</button></>}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="head"><div>
        <span className="lbl">Spaced repetition</span><h1>Revision</h1>
        <p className="muted">Every finished chapter comes back after 1, 3, 7, 21 and 45 days.</p>
      </div></div>
      <div className="stack">
        <h2>Due now ({due.length})</h2>
        {due.length ? due.map((k) => row(k, true)) : <div className="card muted">Nothing due. Finish a chapter and it will be scheduled here.</div>}
      </div>
      {weak.length > 0 && (
        <div className="stack">
          <h2>Weak spots ({weak.length})</h2>
          {weak.map((c) => (
            <div className="crow" key={c.id} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', '--h': EPS[c.ep].h }}>
              <div><div style={{ fontWeight: 500 }}>{c.t}</div><div className="cmeta"><span className="pill warn">confidence {S.conf[c.id]} of 5</span></div></div>
              <button className="btn sm" onClick={() => nav('/learn', { state: { ep: c.ep, open: c.id, k: Date.now() } })}>Open</button>
            </div>
          ))}
        </div>
      )}
      {up.length > 0 && (
        <div className="stack">
          <h2>Coming up</h2>
          {up.slice(0, 12).map((k) => row(k, false))}
          {up.length > 12 && <p className="small muted">and {up.length - 12} more</p>}
        </div>
      )}
    </>
  )
}
