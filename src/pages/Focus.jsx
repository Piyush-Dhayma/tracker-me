import { useEffect, useState } from 'react'
import { EPC, EPS } from '../data/curriculum'
import { chapterLinks } from '../lib/links'
import { nextChapter, stat } from '../lib/model'
import { fmtClock, today } from '../lib/util'
import { noise, noiseKind, setNoiseVolume } from '../lib/audio'
import { ExtLink } from '../components/Bits'
import { Icon } from '../components/Icon'
import { useTracker } from '../state/TrackerProvider'
import { useTimer } from '../state/TimerProvider'
import { useFx } from '../state/FxProvider'

export default function Focus() {
  const { S, update, setStatus } = useTracker()
  const T = useTimer()
  const { toast } = useFx()
  const [nz, setNz] = useState(noiseKind())
  const o = nextChapter(S), t = today()

  // Space starts/pauses (not while typing or on a button)
  useEffect(() => {
    const k = (e) => {
      const tag = e.target.tagName || ''
      if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag) && !e.target.isContentEditable) { e.preventDefault(); T.toggle() }
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [T])

  return (
    <>
      <div className="head"><div><span className="lbl">Pomodoro</span><h1>Focus timer</h1></div><span className="pill">{S.log[t] || 0} min today</span></div>
      <div className="card timer">
        <div className="seg">
          <button aria-pressed={T.mode === 'foc'} onClick={() => T.setMode('foc')}>Focus</button>
          <button aria-pressed={T.mode === 'brk'} onClick={() => T.setMode('brk')}>Break</button>
        </div>
        <div className="tdisp" id="tdisp" aria-live="off">{fmtClock(T.left)}</div>
        <div className="tbar meter"><i style={{ width: (1 - T.left / T.dur) * 100 + '%' }} /></div>
        <div className="row">
          <button className="btn pri" onClick={T.toggle}><Icon n={T.run ? 'pause' : 'play'} s={16} /> {T.run ? 'Pause' : 'Start'}</button>
          <button className="btn" onClick={T.reset}>Reset</button>
        </div>
        <div className="row">{[25, 45, 60, 90].map((m) => <button key={m} className="btn sm" onClick={() => T.preset(m)}>{m} min</button>)}</div>
        <span className="small muted">Press <span className="kbd">Space</span> to start or pause.</span>
      </div>

      <div className="grid2">
        <div className="card stack">
          <label className="field"><span>Chapter you are studying</span>
            <select value={o ? o.id : ''} onChange={(e) => update((d) => { d.cur = e.target.value || null })}>
              {!o && <option value="">All done</option>}
              {EPS.map((e, i) => (
                <optgroup key={e.n} label={`E${i + 1} ${e.n}`}>
                  {EPC[i].filter((c) => stat(S, c.id) !== 2).map((c) => <option key={c.id} value={c.id}>{c.t}</option>)}
                </optgroup>
              ))}
            </select></label>
          <p className="small muted">Finished focus sessions add to today&apos;s minutes, the chapter&apos;s study time, your streak and the heatmap. {S.sess[t] || 0} sessions completed today.</p>
          {o && (
            <>
              <div className="row"><span className="lbl">Watch in Hindi</span>{chapterLinks(o, S.latest).map((a) => <ExtLink key={a[0]} href={a[1]}>{a[0]}</ExtLink>)}</div>
              <div className="row">
                <button className="btn" onClick={() => { setStatus(o.id, 1); toast('In progress', o.t) }}>Mark in progress</button>
                <button className="btn" onClick={() => { setStatus(o.id, 2); toast('Chapter done', 'Revision scheduled for tomorrow') }}>Mark done</button>
              </div>
            </>
          )}
        </div>
        <div className="card stack">
          <h2>Ambient sound</h2>
          <div className="seg" role="group" aria-label="Ambient sound">
            {[['off', 'Off'], ['brown', 'Brown'], ['white', 'White'], ['rain', 'Rain']].map((n) => (
              <button key={n[0]} aria-pressed={nz === n[0]} onClick={() => { noise(n[0], S.vol); setNz(noiseKind()) }}>{n[1]}</button>
            ))}
          </div>
          <label className="field"><span>Volume</span>
            <input type="range" min="0" max="1" step="0.05" value={S.vol} aria-label="Volume"
              onChange={(e) => { const v = Math.min(1, Math.max(0, +e.target.value)); setNoiseVolume(v); update((d) => { d.vol = v }) }} /></label>
          <p className="small muted">Generated in your browser, so it works offline. It keeps playing while the page is open.</p>
        </div>
      </div>
    </>
  )
}
