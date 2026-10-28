import { useState } from 'react'
import { DOW, MOOD, WEEKEND, WK, WORK, blocksFor, mkBlocks, nextInfo, routineDone } from '../lib/model'
import { clamp, fmtD, fmtMin, today, uid } from '../lib/util'
import { useNow } from '../lib/hooks'
import { ConfirmButton } from '../components/Bits'
import { Icon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'
import { useAlerts } from '../state/AlertsProvider'
import { useFx } from '../state/FxProvider'

export default function Routine() {
  const { S, update } = useTracker()
  const { notify } = useAlerts()
  const { toast } = useFx()
  const now = useNow(15000)
  const [rday, setRday] = useState(now.getDay())
  const [time, setTime] = useState('18:00'), [label, setLabel] = useState(''), [min, setMin] = useState(45)
  const [newDays, setNewDays] = useState([1, 2, 3, 4, 5])
  const t = today(), mod = now.getHours() * 60 + now.getMinutes(), isToday = rday === now.getDay()
  const all = blocksFor(S, rday).sort((a, b) => a.time.localeCompare(b.time))
  const done = isToday ? all.filter((r) => routineDone(S, t, r.id)).length : 0
  const plan = all.reduce((a, r) => a + r.min, 0)
  const nx = isToday ? nextInfo(S, now) : null
  const j = S.journal[t] || {}
  const recent = Object.keys(S.journal).filter((k) => k !== t && (S.journal[k].win || S.journal[k].block)).sort().reverse().slice(0, 4)
  const setJ = (patch) => update((d) => { d.journal[t] = { ...(d.journal[t] || {}), ...patch } })

  const add = () => {
    const lb = label.trim()
    if (!/^\d\d:\d\d$/.test(time) || !lb) return toast('Add a time and a name', 'Both are needed for the alarm.')
    if (!newDays.length) return toast('Pick at least one day', 'Choose which days this block repeats on.')
    update((d) => { d.routine.push({ id: uid(), time, label: lb.slice(0, 60), min: clamp(+min || 0, 0, 600), on: true, days: newDays.slice() }) })
    setLabel('')
  }
  const addTpl = (kind) => {
    const set = kind === 'work' ? mkBlocks(WORK, [1, 2, 3, 4, 5]) : mkBlocks(WEEKEND, [0, 6])
    update((d) => { set.forEach((n) => { if (!d.routine.some((r) => r.time === n.time && r.label === n.label)) d.routine.push(n) }) })
    toast('Blocks added', kind === 'work' ? 'Working-day set (Mon to Fri)' : 'Weekend set (Sat and Sun)')
  }

  return (
    <>
      <div className="head">
        <div>
          <span className="lbl">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>Daily routine</h1>
        </div>
        <span className="pill">{isToday ? `${done} of ${all.length} done` : `${all.length} blocks · ${fmtMin(plan)}`}</span>
      </div>

      <div className="week" role="group" aria-label="Day of week">
        {WK.map((d) => (
          <button key={d} aria-pressed={rday === d} className={now.getDay() === d ? 'now' : ''} onClick={() => setRday(d)}>
            <span>{DOW[d]}</span><b>{S.routine.filter((r) => r.days.includes(d)).length}</b>
          </button>
        ))}
      </div>

      {isToday && (
        <div className="banner">
          <div><span className="lbl">Next</span>
            <div style={{ fontWeight: 700 }}>{nx ? `${nx.label} at ${nx.time} (${nx.in < 1 ? 'now' : 'in ' + fmtMin(nx.in)})` : 'Nothing else scheduled today'}</div></div>
          <button className="btn sm" onClick={() => notify('Test alarm', 'Alarms look like this.')}>Test the alarm</button>
        </div>
      )}

      <div className="stack">
        {all.length ? all.map((r) => {
          const d = isToday && routineDone(S, t, r.id), m = +r.time.slice(0, 2) * 60 + +r.time.slice(3), over = isToday && !d && m < mod
          return (
            <div key={r.id} className={'block' + (d ? ' done' : '') + (over ? ' over' : '')}>
              <input type="checkbox" checked={d} disabled={!isToday} aria-label="Mark done"
                onChange={(e) => update((x) => { x.rdone[t] = x.rdone[t] || {}; if (e.target.checked) x.rdone[t][r.id] = 1; else delete x.rdone[t][r.id] })} />
              <span className="tm">{r.time}</span>
              <div className="bl">
                <div>{r.label}</div>
                <div className="small muted">{r.min ? fmtMin(r.min) : ''} {r.days.length < 7 ? r.days.slice().sort().map((x) => DOW[x]).join(' ') : 'every day'}{over && <> <span className="pill warn">overdue</span></>}</div>
              </div>
              <div className="acts">
                <button className={'ic' + (r.on ? ' on' : '')} aria-pressed={r.on} aria-label={r.on ? 'Alarm on' : 'Alarm off'}
                  onClick={() => update((x) => { const y = x.routine.find((z) => z.id === r.id); if (y) y.on = !y.on })}><Icon n={r.on ? 'bell' : 'bellx'} /></button>
                <button className="ic" aria-label="Delete" onClick={() => update((x) => { x.routine = x.routine.filter((z) => z.id !== r.id) })}><Icon n="trash" /></button>
              </div>
            </div>
          )
        }) : <p className="muted">No blocks on {DOW[rday]}. Add one below.</p>}
      </div>

      <div className="card stack">
        <h2>Add a block</h2>
        <div className="formrow">
          <label className="field"><span>Time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <label className="field"><span>What</span><input type="text" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Build the Express project" /></label>
          <label className="field"><span>Minutes</span><input type="number" min="0" max="600" value={min} onChange={(e) => setMin(e.target.value)} /></label>
        </div>
        <div className="dchips" role="group" aria-label="Days">
          {WK.map((d) => (
            <button key={d} aria-pressed={newDays.includes(d)} onClick={() => setNewDays((a) => (a.includes(d) ? a.filter((x) => x !== d) : a.concat(d)))}>{DOW[d]}</button>
          ))}
        </div>
        <div className="row">
          <button className="btn pri" onClick={add}>Add to routine</button>
          <button className="btn sm" onClick={() => addTpl('work')}>Add working-day set</button>
          <button className="btn sm" onClick={() => addTpl('weekend')}>Add weekend set</button>
          <ConfirmButton className="btn sm danger" onConfirm={() => update((d) => { d.routine = [] })}>Clear all</ConfirmButton>
        </div>
        <p className="small muted">Alarms ring while this page is open in a tab, even when the screen is locked by your passcode. Blocks reset each morning.</p>
      </div>

      <div className="card stack">
        <h2>End-of-day review</h2>
        <div className="mood" role="group" aria-label="How did today go">
          {MOOD.map((m, i) => <button key={m} aria-pressed={j.mood === i + 1} onClick={() => setJ({ mood: j.mood === i + 1 ? 0 : i + 1 })}>{m}</button>)}
        </div>
        <label className="field"><span>What did I learn today?</span>
          <textarea maxLength={600} value={j.win || ''} onChange={(e) => setJ({ win: e.target.value.slice(0, 600) })} /></label>
        <label className="field"><span>What is blocking me?</span>
          <textarea maxLength={600} style={{ minHeight: 60 }} value={j.block || ''} onChange={(e) => setJ({ block: e.target.value.slice(0, 600) })} /></label>
        {recent.length > 0 && (
          <>
            <hr className="hr" /><span className="lbl">Recent reviews</span>
            {recent.map((k) => (
              <div className="entry" key={k}>
                <span className="lbl">{fmtD(k)}{S.journal[k].mood ? ' · ' + MOOD[S.journal[k].mood - 1] : ''}</span>
                {S.journal[k].win && <span className="small">{S.journal[k].win}</span>}
                {S.journal[k].block && <span className="small muted">Blocked by: {S.journal[k].block}</span>}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
