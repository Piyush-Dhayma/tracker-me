import { useState } from 'react'
import { CH, EPS, EXTRA } from '../data/curriculum'
import { chQ, cleanURL, newest, yt } from '../lib/links'
import { ExtLink } from '../components/Bits'
import { Icon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'

export default function Mentors() {
  const { S, update } = useTracker()
  const [ep, setEp] = useState(0)
  const [u, setU] = useState(''), [t, setT] = useState(''), [msg, setMsg] = useState('')
  const x = EXTRA[ep], e = EPS[ep]
  const save = () => {
    const url = cleanURL(u.trim())
    if (!url) return setMsg('Paste a full https link from youtube.com or youtu.be.')
    if (S.fav.length >= 20) return setMsg('Up to 20 saved channels.')
    update((d) => { d.fav.push({ u: url, t: t.trim().slice(0, 60) }) })
    setU(''); setT(''); setMsg('')
  }
  return (
    <>
      <div className="head">
        <div>
          <span className="lbl">Learn from the best</span><h1>Mentors</h1>
          <p className="muted">Hindi, Hinglish and English channels for each episode.</p>
        </div>
        <label className="row small">
          <input type="checkbox" checked={S.latest} onChange={(ev) => update((d) => { d.latest = ev.target.checked })} /> Prefer latest versions ({new Date().getFullYear()})
        </label>
      </div>
      <div className="chips" role="group" aria-label="Episodes">
        {EPS.map((p, i) => (
          <button key={p.n} className="chip" style={{ '--h': p.h }} aria-pressed={ep === i} onClick={() => setEp(i)}><b>E{i + 1}</b><span>{p.n}</span></button>
        ))}
      </div>
      <div className="stack">
        <h2>E{ep + 1} {e.n}</h2>
        <div className="mgrid">
          {x.ch.map((n) => {
            const m = CH[n] || ['Hindi', ''], q = chQ(n, x, S.latest)
            return (
              <div className="mcard" key={n}>
                <div className="spread"><b>{n}</b><span className={'pill' + (m[0] === 'English' ? '' : ' acc')}>{m[0]}</span></div>
                <span className="small muted">{m[1]}</span>
                <div className="row"><ExtLink href={yt(q)}>Topic videos</ExtLink><ExtLink href={newest(q)}>Newest first</ExtLink></div>
              </div>
            )
          })}
        </div>
        <p className="small muted">Descriptions are short summaries, not ratings. Search links open YouTube, so results stay current. &quot;Newest first&quot; sorts by upload date.</p>
      </div>
      <div className="card stack">
        <h2>How to pick a mentor and stay current</h2>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li>Prefer playlists uploaded in the last 12 months, and check the version in the title or description (React, Next.js, Node, Docker).</li>
          <li>Pick one main mentor per episode and finish their series. Use the others to fill gaps.</li>
          <li>Choose projects over theory-only lectures, and code along. Pause and rebuild each feature yourself.</li>
          <li>Check the pinned comment or description for version changes and fixes.</li>
        </ul>
      </div>
      <div className="card stack">
        <h2>My channels</h2>
        {S.fav.length ? S.fav.map((l, i) => (
          <div className="spread" key={l.u + i}>
            <ExtLink href={l.u}>{l.t || 'Saved channel'}</ExtLink>
            <button className="ic" aria-label="Remove" onClick={() => update((d) => { d.fav.splice(i, 1) })}><Icon n="trash" s={14} /></button>
          </div>
        )) : <p className="small muted">Save channels or playlists you trust, and they stay here.</p>}
        <div className="formrow">
          <label className="field"><span>YouTube link</span><input type="text" value={u} onChange={(ev) => setU(ev.target.value)} placeholder="https://www.youtube.com/@..." /></label>
          <label className="field"><span>Name</span><input type="text" value={t} maxLength={60} onChange={(ev) => setT(ev.target.value)} placeholder="e.g. My React mentor" /></label>
        </div>
        <div className="row"><button className="btn sm" onClick={save}>Save channel</button><span className="msg bad" role="status">{msg}</span></div>
      </div>
    </>
  )
}
