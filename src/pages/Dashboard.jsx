import { useNavigate } from 'react-router-dom'
import { EPS } from '../data/curriculum'
import { chapterLinks } from '../lib/links'
import { CohortRing, Bars } from '../components/Bits'
import { Icon as Ico } from '../components/Icon'
import { addDays, clamp, diff, fmtD, pdate, today } from '../lib/util'
import { blocksFor, dueRevs, epProg, nextChapter, overall, pace, paceState, pstats, routineDone, streak, weekPlan, xpInfo } from '../lib/model'
import { useTracker } from '../state/TrackerProvider'
import { useFx } from '../state/FxProvider'

export default function Dashboard() {
  const { S, logMin, setStatus, update } = useTracker()
  const { toast } = useFx()
  const nav = useNavigate()
  const t = today(), o = overall(S), mins = S.log[t] || 0, due = dueRevs(S).length, nx = nextChapter(S)
  const h = new Date().getHours(), ps = paceState(S), xi = xpInfo(S), wp = weekPlan(S)
  const hi = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const tb = blocksFor(S, new Date().getDay()), rd = tb.filter((r) => routineDone(S, t, r.id)).length
  const pc = pace(S), left = o.t - o.d, need = left / Math.max(1, diff(t, S.target) / 7)
  let eta = 'Mark a few chapters done to see a forecast.'
  if (left === 0) eta = 'Every chapter is complete.'
  else if (pc > 0) eta = 'At your 14-day pace you finish around ' + fmtD(addDays(t, Math.ceil(left / pc))) + '. Target: ' + fmtD(S.target) + '.'

  const days = [...Array(7)].map((_, i) => addDays(t, i - 6))
  const bars = days.map((d) => ({ k: d, title: fmtD(d), label: pdate(d).toLocaleDateString('en-US', { weekday: 'short' }), v: S.log[d] || 0 }))

  const mi = (pdate(t).getDay() + 6) % 7, startH = addDays(t, -(17 * 7 + mi))
  const heat = []
  for (let i = 0; i < 18 * 7; i++) {
    const k = addDays(startH, i)
    if (k > t) { heat.push(<i key={k} className="fut" />); continue }
    const m = S.log[k] || 0, r = m / S.goal
    heat.push(<i key={k} className={m === 0 ? '' : r < 0.34 ? 'l1' : r < 0.67 ? 'l2' : r < 1 ? 'l3' : 'l4'} title={fmtD(k) + ': ' + m + ' min'} />)
  }
  const add = (m) => { logMin(m, nx && nx.id); toast('Logged', m + ' minutes added to today') }
  const done = (id) => { setStatus(id, 2); toast('Chapter done', 'Revision scheduled for ' + fmtD(addDays(t, 1))) }

  return (
    <>
      <div className="head">
        <div>
          <span className="lbl">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>{hi}.</h1>
        </div>
        <div className="row">
          <span className="pill acc">{streak(S)} day streak</span>
          <span className={'pill ' + ps[0]}>{ps[1]}</span>
          {due > 0 && <button className="pill warn" style={{ border: 0 }} onClick={() => nav('/revise')}>{due} revisions due</button>}
        </div>
      </div>

      <div className="card hero">
        <div className="ringwrap">
          <CohortRing S={S} size={176} sw={14} />
          <div className="rc"><b>{Math.round(o.p * 100)}%</b><span className="lbl">Lv {xi.lv} {xi.title}</span></div>
        </div>
        <div className="stack">
          <div className="stats">
            <div className="stat"><b>{o.d}</b><span className="lbl">done</span></div>
            <div className="stat"><b>{o.g}</b><span className="lbl">in progress</span></div>
            <div className="stat"><b>{o.t - o.d - o.g}</b><span className="lbl">to start</span></div>
          </div>
          {nx ? (
            <div className="next">
              <span className="lbl">Up next &middot; Episode {nx.ep + 1}</span>
              <h2>{nx.t}</h2>
              <div className="row">
                <button className="btn sm" onClick={() => { update((d) => { d.cur = nx.id; if (!d.status[nx.id]) d.status[nx.id] = 1 }); nav('/focus') }}>
                  <Ico n="play" s={14} /> Start focus session
                </button>
                <a className="ytl" href={chapterLinks(nx, S.latest)[0][1]} target="_blank" rel="noopener noreferrer"><Ico n="yt" s={16} /> Watch in Hindi</a>
              </div>
            </div>
          ) : <div className="next"><h2>All chapters complete</h2></div>}
        </div>
      </div>

      <div className="grid2">
        <div className="card stack">
          <div className="spread"><h2>Today</h2><span className="mono small">{mins} / {S.goal} min</span></div>
          <div className="meter"><i style={{ width: clamp((mins / S.goal) * 100, 0, 100) + '%' }} /></div>
          <div className="spread small muted"><span>Routine {rd} of {tb.length} done</span><span>{S.sess[t] || 0} focus sessions</span></div>
          <div className="spread small muted"><span>Problems solved today</span><span className="mono">{pstats(S).td} / {S.pgoal}</span></div>
          <div className="row">{[15, 30, 60].map((m) => <button key={m} className="btn sm" onClick={() => add(m)}>+{m} min</button>)}</div>
          <p className="small muted">{eta}{left ? ' You need about ' + need.toFixed(1) + ' chapters a week to hit the target.' : ''}</p>
        </div>
        <div className="card stack">
          <div className="spread"><h2>This week</h2><span className="mono small">{wp.done} / {wp.target} chapters</span></div>
          <div className="meter"><i style={{ width: (wp.target ? clamp((wp.done / wp.target) * 100, 0, 100) : 100) + '%' }} /></div>
          {wp.list.length ? wp.list.map((c) => (
            <div className="wk" key={c.id} style={{ '--h': EPS[c.ep].h }}>
              <span className="e">E{c.ep + 1}</span><span>{c.t}</span>
              <button className="btn sm" onClick={() => done(c.id)}>Done</button>
            </div>
          )) : <p className="small muted">Nothing left to plan. Nice work.</p>}
        </div>
      </div>

      <div className="card stack">
        <div className="spread"><h2>Last 7 days</h2><span className="lbl">minutes &middot; goal {S.goal}</span></div>
        <Bars data={bars} goal={S.goal} unit="min" />
      </div>

      <div className="grid3">
        <div className="card stack">
          <h2>Episodes</h2>
          <div className="eplist">
            {EPS.map((e, i) => {
              const p = epProg(S, i)
              return (
                <button key={e.n} className="epbtn" style={{ '--h': e.h }} onClick={() => nav('/learn', { state: { ep: i, k: Date.now() } })}>
                  <span className="n">E{i + 1}</span>
                  <span className="t"><b>{e.n}</b><span className="epbar"><i style={{ width: p.p * 100 + '%' }} /></span></span>
                  <span className="mono small muted">{p.d}/{p.t}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="card stack">
          <h2>Consistency</h2>
          <div className="heatwrap"><div className="heat">{heat}</div></div>
          <p className="small muted">Each square is a day. Darker means you reached more of your daily goal.</p>
        </div>
      </div>
    </>
  )
}
