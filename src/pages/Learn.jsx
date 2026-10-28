import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { C, CH, EPC, EPS, EXTRA } from '../data/curriculum'
import { chQ, chapterLinks, cleanURL, practiceLinks, yt } from '../lib/links'
import { fmtD, fmtMin } from '../lib/util'
import { epProg, isWeak, nextChapter, stat } from '../lib/model'
import { ExtLink } from '../components/Bits'
import { Icon, StatusIcon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'
import { useFx } from '../state/FxProvider'

const FILTERS = [['all', 'All'], ['0', 'To do'], ['1', 'In progress'], ['2', 'Done'], ['star', 'Starred'], ['weak', 'Weak spots']]

function PinForm({ id }) {
  const { update } = useTracker()
  const [u, setU] = useState(''), [t, setT] = useState(''), [msg, setMsg] = useState('')
  const { S } = useTracker()
  const save = () => {
    const url = cleanURL(u.trim())
    if (!url) return setMsg('Paste a full https link from youtube.com or youtu.be.')
    if ((S.links[id] || []).length >= 8) return setMsg('Up to 8 links per chapter.')
    update((d) => { (d.links[id] = d.links[id] || []).push({ u: url, t: t.trim().slice(0, 60) }) })
    setU(''); setT(''); setMsg('')
  }
  return (
    <>
      <div className="formrow">
        <label className="field"><span>Pin your own video or playlist</span>
          <input type="text" value={u} onChange={(e) => setU(e.target.value)} placeholder="https://www.youtube.com/..." /></label>
        <label className="field"><span>Title</span>
          <input type="text" value={t} maxLength={60} onChange={(e) => setT(e.target.value)} placeholder="e.g. Docker playlist" /></label>
      </div>
      <div className="row"><button className="btn sm" onClick={save}>Save link</button><span className="msg bad" role="status">{msg}</span></div>
    </>
  )
}

function ChapterPanel({ c }) {
  const { S, update } = useTracker()
  const cf = S.conf[c.id] || 0, ct = S.ctime[c.id] || 0
  const mine = S.links[c.id] || []
  const prac = practiceLinks(c)
  return (
    <div className="notep">
      <div className="spread">
        <span className="small muted">How well do you know it?</span>
        <span className="dots" role="group" aria-label="Confidence">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} aria-pressed={cf === n} aria-label={'Confidence ' + n}
              onClick={() => update((d) => { if (d.conf[c.id] === n) delete d.conf[c.id]; else d.conf[c.id] = n })}>{n}</button>
          ))}
        </span>
      </div>
      <div className="vids">
        <span className="lbl">Watch in Hindi (YouTube)</span>
        <div className="row">{chapterLinks(c, S.latest).map((a) => <ExtLink key={a[0]} href={a[1]}>{a[0]}</ExtLink>)}</div>
        {mine.map((l, i) => (
          <div className="spread" key={l.u + i}>
            <ExtLink href={l.u}>{l.t || 'Saved video'}</ExtLink>
            <button className="ic" aria-label="Remove link"
              onClick={() => update((d) => { d.links[c.id].splice(i, 1); if (!d.links[c.id].length) delete d.links[c.id] })}><Icon n="trash" s={14} /></button>
          </div>
        ))}
        <PinForm id={c.id} />
      </div>
      {prac.length > 0 && (
        <div className="vids"><span className="lbl">Practice this chapter</span>
          <div className="row">{prac.map((a) => <ExtLink key={a[0]} icon="code" href={a[1]}>{a[0]}</ExtLink>)}</div></div>
      )}
      <textarea value={S.note[c.id] || ''} maxLength={2000} placeholder="Notes, links, doubts for this chapter" aria-label={'Notes for ' + c.t}
        onChange={(e) => { const v = e.target.value.slice(0, 2000); update((d) => { d.note[c.id] = v }) }} />
      <span className="small muted">Study time on this chapter: {ct ? fmtMin(ct) : 'none yet'}</span>
    </div>
  )
}

function ChapterRow({ c, cur, open, setOpen, showEp, hl }) {
  const { S, update, setStatus } = useTracker()
  const { toast } = useFx()
  const s = stat(S, c.id), rv = S.revs[c.id], ct = S.ctime[c.id] || 0
  const ref = useRef(null)
  useEffect(() => { if (hl && ref.current) ref.current.scrollIntoView({ block: 'center' }) }, [hl])
  const cycle = () => {
    const n = (s + 1) % 3
    setStatus(c.id, n)
    if (n === 2) toast('Chapter done', 'Revision scheduled for tomorrow')
  }
  return (
    <li ref={ref} className={'crow s' + s + (cur ? ' cur' : '') + (hl ? ' hl' : '')} data-cid={c.id} style={{ '--h': EPS[c.ep].h }}>
      <button className="st" onClick={cycle} aria-label={['Not started', 'In progress', 'Done'][s] + '. Click to change status'}><StatusIcon s={s} /></button>
      <div>
        <button className="ttl" onClick={() => setOpen(open ? null : c.id)} aria-expanded={open}>{c.t}</button>
        <div className="cmeta">
          {showEp && <span className="pill">E{c.ep + 1}</span>}
          {S.doneAt[c.id] && <span className="pill ok">done {fmtD(S.doneAt[c.id])}</span>}
          {rv && <span className="pill">review {fmtD(rv.due)}</span>}
          {ct > 0 && <span className="pill">{fmtMin(ct)}</span>}
          {isWeak(S, c) && <span className="pill warn">weak spot</span>}
          {S.note[c.id] && <span className="pill">note</span>}
        </div>
      </div>
      <div className="acts">
        <button className="ic" aria-pressed={!!S.star[c.id]} aria-label="Star"
          onClick={() => update((d) => { if (d.star[c.id]) delete d.star[c.id]; else d.star[c.id] = 1 })}><Icon n="star" /></button>
        {s !== 2 && (
          <button className={'ic' + (S.cur === c.id ? ' on' : '')} aria-label="Make this my current chapter" title="Make current"
            onClick={() => { update((d) => { d.cur = c.id }); toast('Current chapter set', c.t) }}><Icon n="target" /></button>
        )}
      </div>
      {open && <ChapterPanel c={c} />}
    </li>
  )
}

export default function Learn() {
  const { S, update } = useTracker()
  const loc = useLocation()
  const st = loc.state || {}
  const [ep, setEp] = useState(st.ep ?? 0)
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [open, setOpen] = useState(st.open ?? null)
  const [hl, setHl] = useState(st.open ?? null)

  // arriving from the dashboard or the palette
  useEffect(() => {
    if (st.ep != null) { setEp(st.ep); setQ(''); setF('all') }
    if (st.open) { setOpen(st.open); setHl(st.open) }
  }, [loc.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = nextChapter(S)
  const term = q.trim().toLowerCase()
  const pool = useMemo(() => {
    const base = term ? C : EPC[ep]
    return base.filter((c) =>
      (!term || c.t.toLowerCase().includes(term) || c.g.toLowerCase().includes(term)) &&
      (f === 'all' || (f === 'star' ? S.star[c.id] : f === 'weak' ? isWeak(S, c) : stat(S, c.id) === +f)))
  }, [term, ep, f, S])

  const x = EXTRA[ep]
  let g = null
  const rows = []
  pool.forEach((c) => {
    if (!term && c.g && c.g !== g) { g = c.g; rows.push(<li key={'g' + c.g} className="glabel lbl">{g}</li>) }
    rows.push(<ChapterRow key={c.id} c={c} cur={cur && cur.id === c.id} open={open === c.id} setOpen={setOpen} showEp={!!term} hl={hl === c.id} />)
  })

  return (
    <>
      <div className="head"><div>
        <span className="lbl">Curriculum</span>
        <h1>{term ? 'Search results' : EPS[ep].n}</h1>
        {!term && <p className="muted">{EPS[ep].s}</p>}
      </div></div>

      <div className="chips" role="group" aria-label="Episodes">
        {EPS.map((e, i) => {
          const p = epProg(S, i)
          return (
            <button key={e.n} className="chip" style={{ '--h': e.h }} aria-pressed={ep === i && !term} onClick={() => { setEp(i); setQ('') }}>
              <b>E{i + 1} &middot; {p.d}/{p.t}</b><span>{e.n}</span>
            </button>
          )
        })}
      </div>

      {!term && (
        <div className="card stack" style={{ padding: '12px 14px' }}>
          <div className="spread">
            <span className="lbl">Mentors for this episode</span>
            <label className="row small"><input type="checkbox" checked={S.latest} onChange={(e) => update((d) => { d.latest = e.target.checked })} /> Prefer latest versions</label>
          </div>
          <div className="row">
            {x.ch.map((n) => {
              const m = CH[n] || ['Hindi', '']
              return <ExtLink key={n} href={yt(chQ(n, x, S.latest))}>{n + (m[0] === 'English' ? ' (EN)' : '')}</ExtLink>
            })}
          </div>
          <span className="small muted">Open the Mentors page for what each one is known for and newest-first links.</span>
        </div>
      )}

      <div className="tools">
        <input type="text" placeholder="Filter chapters" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chapters" />
        <select value={f} onChange={(e) => setF(e.target.value)} aria-label="Filter">
          {FILTERS.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
        </select>
      </div>

      <ul className="list">{rows.length ? rows : <li className="card muted">No chapters match.</li>}</ul>
    </>
  )
}
