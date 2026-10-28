import { useRef, useState } from 'react'
import { PCATS, PL, PLAT } from '../data/curriculum'
import { cleanHTTPS } from '../lib/links'
import { addDays, clamp, fmtD, pdate, today, uid } from '../lib/util'
import { LV, pstats } from '../lib/model'
import { Bars, ExtLink } from '../components/Bits'
import { Icon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'
import { useFx } from '../state/FxProvider'

function Entry({ x }) {
  const { update } = useTracker()
  return (
    <div className="entry">
      <div className="spread">
        <span><b>{x.t || 'Problem'}</b> <span className="small muted">on {PL[x.p].n}</span></span>
        <span className="row"><span className={'pill ' + LV[x.lv][1]}>{LV[x.lv][0]}</span>{x.rv && <span className="pill acc">revisit</span>}</span>
      </div>
      <div className="spread">
        <span className="small muted">{fmtD(x.d)}{x.u && <> &middot; <a href={x.u} target="_blank" rel="noopener noreferrer">open</a></>}</span>
        <span className="row">
          {x.rv && <button className="btn sm" onClick={() => update((d) => { const y = d.plog.find((z) => z.id === x.id); if (y) y.rv = false })}>Revisited</button>}
          <button className="ic" aria-label="Remove" onClick={() => update((d) => { d.plog = d.plog.filter((z) => z.id !== x.id) })}><Icon n="trash" s={14} /></button>
        </span>
      </div>
    </div>
  )
}

export default function Practice() {
  const { S, update } = useTracker()
  const { toast } = useFx()
  const formRef = useRef(null)
  const [cat, setCat] = useState('All')
  const [pp, setPp] = useState('lc'), [lv, setLv] = useState('m')
  const [title, setTitle] = useState(''), [url, setUrl] = useState(''), [count, setCount] = useState(1), [rv, setRv] = useState(false)
  const [msg, setMsg] = useState('')
  const st = pstats(S), t = today()
  const days = [...Array(7)].map((_, i) => addDays(t, i - 6))
  const bars = days.map((d) => ({ k: d, title: fmtD(d), label: pdate(d).toLocaleDateString('en-US', { weekday: 'short' }), v: S.plog.filter((x) => x.d === d).length }))
  const byp = Object.keys(st.byp).sort((a, b) => st.byp[b] - st.byp[a]).slice(0, 6)
  const mxp = Math.max(1, ...byp.map((k) => st.byp[k]))
  const rq = S.plog.filter((x) => x.rv).slice(-8).reverse()
  const recent = S.plog.slice(-10).reverse()

  const log = () => {
    const n = clamp(parseInt(count) || 1, 1, 20), raw = url.trim(), u = raw ? cleanHTTPS(raw) : ''
    if (raw && !u) return setMsg('The link must start with https://')
    update((d) => {
      for (let i = 0; i < n; i++) d.plog.push({ id: uid(), d: t, p: pp, lv, t: n === 1 ? title.trim().slice(0, 80) : '', u: n === 1 ? u : '', rv: n === 1 && rv })
      if (d.plog.length > 1000) d.plog = d.plog.slice(-1000)
    })
    toast('Logged', n + ' ' + LV[lv][0].toLowerCase() + ' problem' + (n > 1 ? 's' : '') + ' on ' + PL[pp].n)
    setMsg(''); setTitle(''); setUrl(''); setRv(false); setCount(1)
  }

  return (
    <>
      <div className="head">
        <div>
          <span className="lbl">Practice</span><h1>Problem solving</h1>
          <p className="muted">LeetCode-style platforms for every episode, plus a log that counts toward your streak and XP.</p>
        </div>
        <label className="field" style={{ width: 130 }}><span>Daily goal</span>
          <input type="number" min="1" max="50" value={S.pgoal} onChange={(e) => update((d) => { d.pgoal = clamp(+e.target.value || 3, 1, 50) })} /></label>
      </div>
      <div className="card"><div className="stats">
        <div className="stat"><b>{st.tot}</b><span className="lbl">solved</span></div>
        <div className="stat"><b>{st.td} / {S.pgoal}</b><span className="lbl">today</span></div>
        <div className="stat"><b>{st.wk}</b><span className="lbl">last 7 days</span></div>
        <div className="stat"><b>{st.lv.e} / {st.lv.m} / {st.lv.h}</b><span className="lbl">easy / med / hard</span></div>
        <div className="stat"><b>{st.rv}</b><span className="lbl">to revisit</span></div>
      </div></div>

      <div className="card stack" ref={formRef}>
        <h2>Log a solved problem</h2>
        <div className="formrow">
          <label className="field"><span>Platform</span>
            <select value={pp} onChange={(e) => setPp(e.target.value)}>
              {PLAT.slice().sort((a, b) => a.n.localeCompare(b.n)).map((p) => <option key={p.id} value={p.id}>{p.n}</option>)}
            </select></label>
          <label className="field"><span>Problem (optional)</span><input id="p-title" type="text" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Two Sum" /></label>
          <label className="field"><span>Link (optional)</span><input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://leetcode.com/problems/two-sum/" /></label>
          <label className="field"><span>How many</span><input type="number" min="1" max="20" value={count} onChange={(e) => setCount(e.target.value)} /></label>
        </div>
        <div className="row">
          <div className="seg" role="group" aria-label="Difficulty">
            {['e', 'm', 'h'].map((k) => <button key={k} aria-pressed={lv === k} onClick={() => setLv(k)}>{LV[k][0]}</button>)}
          </div>
          <label className="row small"><input type="checkbox" checked={rv} onChange={(e) => setRv(e.target.checked)} /> Revisit later</label>
          <button className="btn pri" onClick={log}>Log solved</button>
        </div>
        <div className="msg bad" role="status">{msg}</div>
        <p className="small muted">Easy gives 10 XP, medium 25 and hard 50. Title, link and revisit apply when you log one problem at a time.</p>
      </div>

      <div className="grid2">
        <div className="card stack">
          <div className="spread"><h2>Last 7 days</h2><span className="lbl">goal {S.pgoal} a day</span></div>
          <Bars data={bars} goal={S.pgoal} unit="solved" />
        </div>
        <div className="card stack">
          <h2>By platform</h2>
          {byp.length ? byp.map((k) => (
            <div className="hb w" key={k}>
              <span className="small">{PL[k].n}</span>
              <span className="bar"><i style={{ width: (st.byp[k] / mxp) * 100 + '%', background: 'var(--accent)' }} /></span>
              <span className="mono small">{st.byp[k]}</span>
            </div>
          )) : <p className="small muted">Log your first problem to see where you practise most.</p>}
        </div>
      </div>

      {rq.length > 0 && <div className="stack"><h2>Revisit queue</h2>{rq.map((x) => <Entry key={x.id} x={x} />)}</div>}

      <div className="stack">
        <h2>Platforms</h2>
        <div className="chips" role="group" aria-label="Category">
          {PCATS.map((c) => <button key={c} className="chip" style={{ minWidth: 0, '--h': 215 }} aria-pressed={cat === c} onClick={() => setCat(c)}><b>{c}</b></button>)}
        </div>
        <div className="mgrid">
          {PLAT.filter((p) => cat === 'All' || p.cat === cat).map((p) => (
            <div className="mcard" key={p.id}>
              <div className="spread"><b>{p.n}</b><span className="pill">{p.cat}</span></div>
              <span className="small muted">{p.d}</span>
              <div className="row">
                <ExtLink icon="code" href={p.u}>Open</ExtLink>
                <button className="btn sm" onClick={() => { setPp(p.id); formRef.current && formRef.current.scrollIntoView({ block: 'center' }); const i = document.getElementById('p-title'); i && i.focus() }}>Log here</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {recent.length > 0 && <div className="stack"><h2>Recent</h2>{recent.map((x) => <Entry key={x.id} x={x} />)}</div>}
    </>
  )
}
