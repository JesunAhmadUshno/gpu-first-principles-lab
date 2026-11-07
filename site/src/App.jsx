import { useMemo, useState, useEffect, useId } from 'react';
import studyMapMd from '../../STUDY-MAP.md?raw';
import preregMd from '../../PREREGISTRATION.md?raw';
import readmeMd from '../../README.md?raw';
import specMd from '../../SPEC.md?raw';
import reviewMd from '../../docs/research-review.md?raw';
import P from './prereg.json';
import {
  parseStudyMap, parsePrereg, parseReadme, parseContract, parseUnitStudy, parseTable, verdict,
  m1Elements, m1BytesMoved, gbPerSecond, gemmFlops, gflopsPerSecond,
  coalescedIndex, stridedIndex, isPermutation, warpAddresses, segmentsTouched,
} from './lab.js';

// Everything below is parsed from the repo at build time.
const unitFiles = import.meta.glob('../../units/*/STUDY.md', { query: '?raw', import: 'default', eager: true });
const UNITS = Object.entries(unitFiles).map(([path, md]) => parseUnitStudy(md, path)).sort((a, b) => a.unit.localeCompare(b.unit));
const STUB = new Set(UNITS.map((u) => u.unit));
const MAP = parseStudyMap(studyMapMd).map((r) => ({
  ...r, status: r.feed === 'AWAITING SOURCE' ? 'awaiting source' : STUB.has(r.unit) ? 'stub' : 'not opened',
}));
const PREREG = parsePrereg(preregMd);
const README = parseReadme(readmeMd);
const CONTRACT = parseContract(specMd);
const SCORECARD = parseTable(reviewMd, 'Scorecard');
const OPEN_GAPS = parseTable(reviewMd, 'What remains open, and exactly what closes it');
const N_UNITS = MAP.filter((r) => r.unit.startsWith('U')).length;
const N_RUN = PREREG.studies.filter((s) => s.results !== 'NOT YET RUN').length;

const REPO = 'https://github.com/JesunAhmadUshno/gpu-first-principles-lab';
const blob = (p) => `${REPO}/blob/main/${p}`;
const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
const word = (n) => WORDS[n] ?? String(n);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const TONE = { supported: 'good', partial: 'warn', refuted: 'bad' };
const VLABEL = { supported: 'Supported', partial: 'Partially supported', refuted: 'Refuted' };

const SECTIONS = [['top', 'Overview', '◎'], ['method', 'Method', '①'], ['map', 'Study map', '▦'], ['feeds', 'Feeds', '⇢'], ['prereg', 'Pre-registration', '§'],
  ['verdict', 'Verdict playground', '⚖'], ['calc', 'Workload calculator', '∑'], ['stride', 'Stride visualizer', '⋮'], ['units', 'Unit questions', '?'], ['rigour', 'Rigour', '✓']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">GPU First-Principles Lab</a>
      <a className="m" href={blob('SPEC.md')}>Spec</a>
      <a className="m" href={blob('STUDY-MAP.md')}>Study map</a>
      <a className="m" href={blob('PREREGISTRATION.md')}>Pre-registration</a>
      <a className="m" href={blob('docs/research-review.md')}>Review</a>
      <span className="spacer" />
      <span className="status warn"><i /> {N_RUN === 0 ? 'No results yet' : `${N_RUN} run`}</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined} aria-label={label}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{show}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange, min, step, unit }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{unit}</span></label>
      <input id={id} type="number" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export default function App() {
  useReveal();
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Method />
      <StudyMap />
      <Feeds />
      <Prereg />
      <VerdictPlayground />
      <Calculator />
      <Stride />
      <UnitQuestions />
      <Rigour />
      <Dock />
      <footer>
        <p>Study map source: <a href="https://github.com/BEFORE-GPU-ENGINEERING/BEFORE-GPU-ENGINEERING">BEFORE-GPU-ENGINEERING</a> (MIT licence), cited for chapter titles and ranges only; no content is reproduced.
          Primary sources for verification: {README.primarySources.join('; ')}.</p>
        <p>Code and text: Apache-2.0. Every count and threshold on this page is parsed from the repo's markdown at build time; the playground, calculator and visualizer run in your browser on inputs you choose. No measurement exists yet.</p>
      </footer>
    </div>
  );
}

function Hero() {
  const n = PREREG.studies.length;
  return (
    <header className="card hero window" id="top" data-title="README.md · gpu-first-principles-lab">
      <div className="head">
        <p className="eyebrow">Pre-registered study lab · scaffold stage</p>
        <span className="pill warn">● Scaffold: no results yet</span>
      </div>
      <h1>{cap(word(N_UNITS))} GPU units, {word(n)} pre-registered bets, <em>{word(N_RUN)} results</em> so far.</h1>
      <p className="sub">
        Every verdict rule is frozen before the first kernel runs. This lab learns GPU architecture from first principles and closes each unit only with a measurement taken under a protocol written in advance.
        Nothing has been measured yet, so this page shows the design itself: the study map, the frozen rules, and tools to see what each rule would conclude.
      </p>
      <div className="actions">
        <a className="btn primary" href="#verdict">Try the verdict rules</a>
        <a className="btn ghost" href={blob('PREREGISTRATION.md')}>Read the pre-registration</a>
      </div>
      <div className="strip">
        <span className="pill info">Hardware of record: {README.host} · {README.gpu}</span>
        <span className="pill info">Device in every protocol: {PREREG.device}</span>
      </div>
      <div className="tiles">
        <div className="tile"><div className="num">{N_UNITS}</div><div className="cap">units in the study map, U01 to U{String(N_UNITS).padStart(2, '0')}</div></div>
        <div className="tile"><div className="num">{n}</div><div className="cap">protocols with a frozen verdict rule</div></div>
        <div className="tile"><div className="num">{N_RUN}</div><div className="cap">protocols run (each reads RESULTS: NOT YET RUN)</div></div>
        <div className="tile"><div className="num">{UNITS.length}</div><div className="cap">unit folders opened as stubs, no answers yet</div></div>
      </div>
    </header>
  );
}

// Which SPEC deliverable each README step produces (indices into the contract list).
const STEP_PARTS = [[0], [0], [1], [2, 3], [4]];
function Method() {
  return (
    <section id="method" className="card window reveal" data-title="method.md">
      <p className="eyebrow">The method</p>
      <h2>A unit is finished when it is <em>measured</em>, not when it is read.</h2>
      <p className="sub">The five steps from the README, in order, next to the deliverable each one leaves in the unit folder (SPEC.md). A unit missing any part for its kind is open.</p>
      <ol className="steps" style={{ marginTop: 20 }}>
        {README.steps.map((s, i) => (
          <li key={s}><span className="n">{i + 1}</span><div><b>{s.split(' ')[0]}</b> <span className="hint">{s.split(' ').slice(1).join(' ')}</span>
            <div className="chips">{(STEP_PARTS[i] || []).map((k) => CONTRACT[k] && <span className="chip" key={k} title={CONTRACT[k].text}><b>{CONTRACT[k].part}</b> {CONTRACT[k].text}</span>)}</div>
          </div></li>
        ))}
      </ol>
    </section>
  );
}

const KINDS = ['all', 'concept gate', 'micro-study', 'closing audit', 'awaiting source'];
const FEEDS = ['all', 'DIRECT', 'INDIRECT', 'FOUNDATION'];
function StudyMap() {
  const [kind, setKind] = useState('all');
  const [feed, setFeed] = useState('all');
  const [sel, setSel] = useState(null);
  const rows = MAP.filter((r) => (kind === 'all' || r.kind === kind) && (feed === 'all' || r.feed === feed));
  const picked = MAP.find((r) => r.unit === sel);
  return (
    <section id="map" className="card window reveal" data-title="study-map.csv">
      <div className="head">
        <div>
          <p className="eyebrow">Study map explorer</p>
          <h2>{cap(word(N_UNITS))} units, grouped for <em>measurement</em>.</h2>
          <p className="sub">Parsed from STUDY-MAP.md. Status comes from the repo itself: a unit is a stub when its folder exists under units/, otherwise not opened. Select a unit to see its concepts and primary source.</p>
        </div>
      </div>
      <div className="filters">
        <div className="seg" role="group" aria-label="Filter by kind">
          {KINDS.map((k) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'all' ? 'All kinds' : cap(k)}</button>)}
        </div>
        <div className="seg" role="group" aria-label="Filter by feed">
          {FEEDS.map((k) => <button key={k} aria-pressed={feed === k} onClick={() => setFeed(k)}>{k === 'all' ? 'All feeds' : k}</button>)}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="stack">
          <thead><tr><th>Unit</th><th>Source part</th><th>Kind</th><th>Protocol</th><th>Feeds</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.unit} className={sel === r.unit ? 'sel' : ''}>
                <td><button className="link" aria-pressed={sel === r.unit} onClick={() => setSel(sel === r.unit ? null : r.unit)}>{r.unit}</button></td>
                <td className="wide">{r.part}{r.chapters && <span className="hint"> ({r.chapters})</span>}</td>
                <td>{r.kind}</td>
                <td className="mono">{r.protocol || '·'}</td>
                <td><span className={`pill ${r.feed === 'DIRECT' ? 'info' : r.feed === 'AWAITING SOURCE' ? 'warn' : ''}`}>{r.feed}</span></td>
                <td><span className={`pill ${r.status === 'stub' ? 'good' : 'muted'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tip" aria-live="polite">
        {rows.length === 0 ? 'No unit matches both filters.' : picked
          ? <><b>{picked.unit}:</b> {picked.kindText}. {picked.concepts.length > 0 && <>Concepts: {picked.concepts.join('; ')}. </>}Verified against: {picked.source}.</>
          : `${rows.length} of ${MAP.length} rows shown.`}
      </div>
    </section>
  );
}

function Feeds() {
  const direct = MAP.filter((r) => r.feed === 'DIRECT').map((r) => r.unit);
  const indirect = MAP.filter((r) => r.feed === 'INDIRECT').map((r) => r.unit);
  const foundation = MAP.filter((r) => r.feed === 'FOUNDATION').map((r) => r.unit);
  // Items and edges as stated in STUDY-MAP.md, "How the feed works".
  const items = [
    { k: 'Coalescing upgrade', from: direct.filter((u) => u === 'U11'), gate: true },
    { k: 'Tiled GEMM progression', from: direct.filter((u) => u !== 'U11'), gate: true },
    { k: 'Occupancy tuning pass and register-spilling case study', from: indirect, gate: false },
  ];
  const left = [...direct, ...indirect];
  const W = 960, rowH = 40, H = left.length * rowH + 40, ux = 130, ix = 560;
  const uy = (u) => 30 + left.indexOf(u) * rowH;
  const iy = (i) => { const ys = items[i].from.map(uy); return (Math.min(...ys) + Math.max(...ys)) / 2; };
  return (
    <section id="feeds" className="card window reveal" data-title="feeds.svg">
      <p className="eyebrow">What each unit feeds</p>
      <h2>{cap(word(direct.length))} units <em>gate</em> kernel work; {word(indirect.length)} only inform it.</h2>
      <p className="sub">A cuda-kernels-lab v1.1 item opens only when the unit feeding it has a measured verdict here. Solid lines gate; dashed lines inform. None of these verdicts exists yet, so every item downstream is still closed.</p>
      <div style={{ overflowX: 'auto', marginTop: 16 }}><svg className="chart wideviz" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Graph of which study units gate or inform cuda-kernels-lab v1.1 items">
        {items.map((it, i) => it.from.map((u) => (
          <path key={it.k + u} d={`M${ux + 70},${uy(u)} C${(ux + ix) / 2},${uy(u)} ${(ux + ix) / 2},${iy(i)} ${ix - 10},${iy(i)}`}
            fill="none" stroke={it.gate ? 'var(--primary)' : 'var(--muted)'} strokeWidth={it.gate ? 2 : 1.4} strokeDasharray={it.gate ? '' : '5 5'} />
        )))}
        {left.map((u) => {
          const row = MAP.find((r) => r.unit === u);
          return (
            <g key={u}>
              <rect x={ux - 70} y={uy(u) - 14} width="140" height="28" rx="8" fill="var(--surface-strong)" stroke="var(--border)" />
              <text x={ux - 58} y={uy(u) + 4} style={{ fill: 'var(--text)', fontWeight: 700 }}>{u}</text>
              <text x={ux + 60} y={uy(u) + 4} textAnchor="end">{row.status}</text>
            </g>
          );
        })}
        {items.map((it, i) => (
          <g key={it.k}>
            <rect x={ix - 10} y={iy(i) - 18} width={W - ix} height="36" rx="10" fill={it.gate ? 'var(--primary-pale)' : 'var(--surface-strong)'} stroke="var(--border)" />
            <text x={ix + 6} y={iy(i) - 3} style={{ fill: 'var(--text)', fontSize: 13 }}>{it.k}</text>
            <text x={ix + 6} y={iy(i) + 12}>{it.gate ? 'gated: closed until a verdict exists' : 'informed, not gated'}</text>
          </g>
        ))}
        <text x={0} y={H - 4}>Foundation units, feeding no item directly: {foundation.join(', ')}</text>
      </svg></div>
    </section>
  );
}

function Prereg() {
  const [id, setId] = useState(PREREG.studies[0].id);
  const s = PREREG.studies.find((x) => x.id === id);
  return (
    <section id="prereg" className="card window reveal" data-title="PREREGISTRATION.md">
      <div className="head">
        <div>
          <p className="eyebrow">Frozen protocols</p>
          <h2>{cap(word(PREREG.studies.length))} bets, each with its <em>verdict rule</em> written first.</h2>
          <p className="sub">Read straight from PREREGISTRATION.md. Rules never change after the first run of their study; protocol details change only by a dated amendment.</p>
        </div>
        <div className="seg" role="tablist" aria-label="Study">
          {PREREG.studies.map((x) => <button key={x.id} role="tab" aria-selected={id === x.id} onClick={() => setId(x.id)}>{x.id}</button>)}
        </div>
      </div>
      <div className="prereg" role="tabpanel" aria-label={`${s.id}: ${s.title}`}>
        <div className="head" style={{ marginBottom: 8 }}>
          <h3>{s.id}: {s.title} <span className="hint">({s.units.join(', ')})</span></h3>
          <span className="pill warn">RESULTS: {s.results}</span>
        </div>
        <p><b>Hypothesis.</b> {s.hypothesis}</p>
        <ul className="protocol">{s.protocol.map((b) => <li key={b}>{b}</li>)}</ul>
        <div className="rule"><span className="eyebrow">Frozen verdict rule</span><p>{s.rule}</p></div>
      </div>
      {PREREG.amendments.map((a) => (
        <details className="amend" key={a.title}>
          <summary>{a.title}: {a.items.length} clarifications, no verdict rule changed</summary>
          <ul className="protocol">{a.items.map((b) => <li key={b}>{b}</li>)}</ul>
        </details>
      ))}
    </section>
  );
}

function BandLine({ label, value, min, max, bands, ticks, show }) {
  const W = 400, H = 50, l = 8, r = 8;
  const x = (v) => l + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (W - l - r);
  return (
    <svg className="chart band" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: verdict bands with the what-if value ${show}`}>
      {bands.map((b) => <rect key={b.v + b.from} x={x(b.from)} width={Math.max(0, x(b.to) - x(b.from))} y={14} height={12} rx="3" fill={`var(--${TONE[b.v]})`} opacity="0.35" />)}
      {ticks.map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={10} y2={30} stroke="var(--text)" strokeOpacity="0.5" /><text x={x(t)} y={44} textAnchor="middle">{t}</text></g>)}
      <circle cx={x(value)} cy={20} r="7" fill="var(--text)" stroke="var(--surface-strong)" strokeWidth="2" />
    </svg>
  );
}

function VerdictPlayground() {
  const m1 = P.M1, a = P.M3a, b = P.M3b, c = P.M3c;
  const [r1, setR1] = useState((m1.partialAtLeast + m1.supportedAtLeast) / 2);
  const [us, setUs] = useState(a.supportedBelowMicroseconds * 1.5);
  const [sp, setSp] = useState((b.partialAbove + b.supportedAtLeast) / 2);
  const [rc, setRc] = useState((c.partialAtLeast + c.supportedAtLeast) / 2);
  const [pp, setPp] = useState(true);
  const [step, setStep] = useState(false);
  const rows = [
    { id: 'M1', q: 'Median coalesced / strided bandwidth', v: r1, set: setR1, min: 0, max: m1.supportedAtLeast * 2, stepv: 0.1, show: `${r1.toFixed(1)}x`,
      out: verdict.M1(r1, P), ticks: [m1.partialAtLeast, m1.supportedAtLeast],
      bands: [{ v: 'refuted', from: 0, to: m1.partialAtLeast }, { v: 'partial', from: m1.partialAtLeast, to: m1.supportedAtLeast }, { v: 'supported', from: m1.supportedAtLeast, to: m1.supportedAtLeast * 2 }] },
    { id: 'M3a', q: 'Median per-launch cost, back-to-back', v: us, set: setUs, min: 0, max: a.supportedBelowMicroseconds * 3, stepv: 0.5, show: `${us.toFixed(1)} µs`,
      out: verdict.M3a(us, P), ticks: [a.supportedBelowMicroseconds],
      bands: [{ v: 'supported', from: 0, to: a.supportedBelowMicroseconds }, { v: 'refuted', from: a.supportedBelowMicroseconds, to: a.supportedBelowMicroseconds * 3 }] },
    { id: 'M3b', q: `Tiled over naive speedup at N = ${b.verdictSize}`, v: sp, set: setSp, min: 0, max: b.supportedAtLeast * 2, stepv: 0.01, show: `${sp.toFixed(2)}x`,
      out: verdict.M3b(sp, P), ticks: [b.partialAbove, b.supportedAtLeast],
      bands: [{ v: 'refuted', from: 0, to: b.partialAbove }, { v: 'partial', from: b.partialAbove, to: b.supportedAtLeast }, { v: 'supported', from: b.supportedAtLeast, to: b.supportedAtLeast * 2 }] },
    { id: 'M3c', q: `Lab GEMM / cuBLAS throughput at N = ${c.verdictSize}`, v: rc, set: setRc, min: 0, max: c.supportedAtLeast * 2, stepv: 0.005, show: rc.toFixed(3),
      out: verdict.M3c(rc, P), ticks: [c.partialAtLeast, c.supportedAtLeast],
      bands: [{ v: 'refuted', from: 0, to: c.partialAtLeast }, { v: 'partial', from: c.partialAtLeast, to: c.supportedAtLeast }, { v: 'supported', from: c.supportedAtLeast, to: c.supportedAtLeast * 2 }] },
  ];
  const m2 = verdict.M2(pp, step);
  return (
    <section id="verdict" className="card window reveal" data-title="verdict.app · what-if">
      <div className="head">
        <div>
          <p className="eyebrow">Verdict-rule playground</p>
          <h2>Move a hypothetical result and watch the <em>frozen rule</em> decide.</h2>
          <p className="sub">The bands and thresholds come from site/src/prereg.json, which the repo tests prove matches PREREGISTRATION.md. The values are yours, not the lab's: no measurement exists yet.</p>
        </div>
        <span className="pill warn">what-if: no measurement exists yet</span>
      </div>
      <div className="vrows">
        {rows.map((r) => (
          <div className="vrow" key={r.id}>
            <Range label={`${r.id}: ${r.q} (what-if)`} value={r.v} min={r.min} max={r.max} step={r.stepv} onChange={r.set} show={r.show} />
            <BandLine label={`${r.id} ${r.q}`} value={r.v} min={r.min} max={r.max} bands={r.bands} ticks={r.ticks} show={r.show} />
            <span className={`pill ${TONE[r.out]}`}>{VLABEL[r.out]}</span>
          </div>
        ))}
        <div className="vrow">
          <div className="field">
            <span className="flabel">M2: occupancy against the theory curve (what-if)</span>
            <label className="check"><input type="checkbox" checked={pp} onChange={(e) => setPp(e.target.checked)} /> Achieved within {P.M2.withinPercentagePoints} pp of theoretical at the best block size</label>
            <label className="check"><input type="checkbox" checked={step} onChange={(e) => setStep(e.target.checked)} /> Fastest block size within one sweep step of the plateau onset</label>
          </div>
          <p className="hint" style={{ margin: 0 }}>Sweep: {P.M2.blockSizes.join(', ')} threads per block. Both conditions: supported. One: partial. Neither: refuted.</p>
          <span className={`pill ${TONE[m2]}`}>{VLABEL[m2]}</span>
        </div>
      </div>
      <div className="legend"><span><i style={{ background: 'var(--bad)' }} />refuted</span><span><i style={{ background: 'var(--warn)' }} />partially supported</span><span><i style={{ background: 'var(--good)' }} />supported</span><span>Ticks mark the frozen thresholds.</span></div>
    </section>
  );
}

function Calculator() {
  const [ms, setMs] = useState('1');
  const [n, setN] = useState(P.M3b.verdictSize);
  const [gms, setGms] = useState('1');
  const t = parseFloat(ms), g = parseFloat(gms);
  const bytes = m1BytesMoved(P), flopsAll = P.M3b.sizes.map((s) => [s, gemmFlops(s)]);
  const maxF = flopsAll.at(-1)[1];
  const W = 460, rowH = 34, H = flopsAll.length * rowH + 8;
  return (
    <section id="calc" className="card window reveal" data-title="bytes-and-flops.calc">
      <div className="head">
        <div>
          <p className="eyebrow">Workload arithmetic</p>
          <h2>What the protocols will <em>divide by</em>.</h2>
          <p className="sub">Bytes and FLOPs follow from the protocol constants alone. Type a hypothetical time to see the figure the protocol would report. No device peak is shown, because the repo states none.</p>
        </div>
        <span className="pill warn">inputs are hypothetical</span>
      </div>
      <div className="grid2">
        <div className="tile">
          <h3>M1 copy: effective bandwidth</h3>
          <p className="hint">2^{P.M1.log2Elements} float32 = {fmt(m1Elements(P))} elements, {P.M1.mibPerArray} MiB per array. Read plus write moves {fmt(bytes)} bytes ({fmt(bytes / 2 ** 20)} MiB) per launch.</p>
          <NumberField label="Hypothetical kernel time" unit="ms" value={ms} onChange={setMs} min="0.001" step="0.001" />
          <div className="out"><span className="big">{t > 0 ? fmt(gbPerSecond(bytes, t), 1) : '·'}</span> GB/s effective (bytes moved / time, GB = 10^9 bytes)</div>
        </div>
        <div className="tile">
          <h3>M3b and M3c GEMM: throughput</h3>
          <p className="hint">C = A x B in float32 costs 2N^3 floating-point operations.</p>
          <div className="controls" style={{ gridTemplateColumns: '1fr 1fr', margin: '8px 0 0' }}>
            <div className="field"><label htmlFor="gemm-n">Matrix size N</label>
              <select id="gemm-n" value={n} onChange={(e) => setN(+e.target.value)}>{P.M3b.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <NumberField label="Hypothetical time" unit="ms" value={gms} onChange={setGms} min="0.001" step="0.001" />
          </div>
          <div className="out"><span className="big">{g > 0 ? fmt(gflopsPerSecond(gemmFlops(n), g), 1) : '·'}</span> GFLOP/s for {fmt(gemmFlops(n))} FLOPs</div>
        </div>
      </div>
      <h3 style={{ marginTop: 20 }}>FLOPs per GEMM at the three protocol sizes</h3>
      <div style={{ overflowX: 'auto' }}><svg className="chart wideviz" viewBox={`0 0 ${W * 2} ${H}`} role="img" aria-label="Bar chart of floating-point operations per GEMM for each protocol matrix size">
        {flopsAll.map(([s, f], i) => (
          <g key={s} transform={`translate(0 ${i * rowH + 4})`}>
            <text x={0} y={18} style={{ fill: 'var(--text)', fontWeight: s === n ? 700 : 400 }}>N = {s}</text>
            <rect x={90} y={4} height={20} rx="5" width={Math.max(3, (f / maxF) * (W * 2 - 330))} fill={s === n ? 'var(--primary)' : 'var(--primary-pale)'} stroke="var(--primary)" strokeOpacity="0.4" />
            <text x={W * 2} y={18} textAnchor="end">{fmt(f)} FLOPs</text>
          </g>
        ))}
      </svg></div>
    </section>
  );
}

const SEGMENTS = [32, 64, 128];
function Grid({ title, f, n, warp, upto }) {
  const rows = n / 32, cell = 10;
  const read = new Map(warpAddresses(f, n, warp).map((a, lane) => [a, lane]));
  return (
    <div>
      <h3>{title}</h3>
      <svg className="chart grid" viewBox={`0 0 ${32 * cell} ${rows * cell}`} role="img" aria-label={`${title}: input addresses read by warp ${warp}, ${n} elements, 32 per row`}>
        {Array.from({ length: rows }, (_, r) => (
          <rect key={r} x={0} y={r * cell} width={32 * cell} height={cell} fill={r % 2 ? 'var(--primary-pale)' : 'transparent'} />
        ))}
        {[...read].filter(([, lane]) => lane <= upto).map(([a, lane]) => (
          <rect key={a} x={(a % 32) * cell + 1} y={Math.floor(a / 32) * cell + 1} width={cell - 2} height={cell - 2} rx="2" fill="var(--primary)" opacity={0.45 + (0.55 * lane) / 31} />
        ))}
      </svg>
    </div>
  );
}

function Stride() {
  const maxN = 1024;
  const [n, setN] = useState(maxN);
  const [warp, setWarp] = useState(0);
  const [seg, setSeg] = useState(128);
  const [upto, setUpto] = useState(31);
  const [playing, setPlaying] = useState(false);
  const w = Math.min(warp, n / 32 - 1);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setUpto((u) => { if (u >= 31) { setPlaying(false); return 31; } return u + 1; }), 90);
    return () => clearInterval(t);
  }, [playing]);
  const bpe = P.M1.bytesPerElement;
  const co = warpAddresses(coalescedIndex, n, w), st = warpAddresses(stridedIndex, n, w);
  const perm = useMemo(() => isPermutation(stridedIndex, n), [n]);
  return (
    <section id="stride" className="card window reveal" data-title="stride.viz">
      <div className="head">
        <div>
          <p className="eyebrow">M1 index functions, live</p>
          <h2>Same warp, same data, <em>scattered</em> reads.</h2>
          <p className="sub">
            Each grid is a small input array, 32 floats per row ({32 * bpe} bytes). Shaded cells are the addresses that lanes 0 to 31 of one warp read under f(i) = i and under the pinned strided mapping
            f(i) = (i mod (N/32)) * 32 + floor(i / (N/32)). The real study uses N = 2^{P.M1.log2Elements}; this view shrinks N so the pattern is visible.
          </p>
        </div>
      </div>
      <div className="controls">
        <Range label="Array size N (multiple of 32)" value={n} min={64} max={maxN} step={32} onChange={(v) => { setN(v); setWarp(0); }} show={fmt(n)} />
        <Range label="Warp index" value={w} min={0} max={n / 32 - 1} step={1} onChange={setWarp} show={`${w} (threads ${w * 32} to ${w * 32 + 31})`} />
        <div className="field"><label htmlFor="seg">Segment size (a model you choose, not a repo claim)</label>
          <select id="seg" value={seg} onChange={(e) => setSeg(+e.target.value)}>{SEGMENTS.map((s) => <option key={s} value={s}>{s} bytes</option>)}</select>
        </div>
      </div>
      <div className="actions" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="btn primary" onClick={() => { setUpto(0); setPlaying(true); }} disabled={playing}>{playing ? `Lane ${upto}…` : 'Animate lanes 0 to 31'}</button>
        <span className={`pill ${perm ? 'good' : 'bad'}`}>{perm ? `✓ Both mappings are permutations of all ${fmt(n)} addresses` : 'Not a permutation'}</span>
      </div>
      <div className="grid2">
        <Grid title="Variant A: f(i) = i" f={coalescedIndex} n={n} warp={w} upto={upto} />
        <Grid title="Variant B: pinned strided mapping" f={stridedIndex} n={n} warp={w} upto={upto} />
      </div>
      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="tile"><div className="num">{segmentsTouched(co, seg, bpe)}</div><div className="cap">distinct {seg}-byte segments touched by the warp, variant A. First lanes read {co.slice(0, 4).join(', ')}, …</div></div>
        <div className="tile"><div className="num">{segmentsTouched(st, seg, bpe)}</div><div className="cap">distinct {seg}-byte segments touched by the warp, variant B. First lanes read {st.slice(0, 4).join(', ')}, …</div></div>
      </div>
      <p className="hint" style={{ marginTop: 12 }}>Segment counts are arithmetic on addresses under the segment model you picked. How many transactions the RTX 5050 Laptop actually issues is what M1 will measure.</p>
    </section>
  );
}

function UnitQuestions() {
  return (
    <section id="units" className="card window reveal" data-title="units/">
      <p className="eyebrow">Open questions</p>
      <h2>{cap(word(UNITS.length))} units opened, <em>no answers</em> written yet.</h2>
      <p className="sub">The questions each stub commits to, read from units/*/STUDY.md. A box is ticked only when an answer is written in original words and verified against the unit's primary source.</p>
      <div className="ugrid" style={{ marginTop: 16 }}>
        {UNITS.map((u) => (
          <div className="tile" key={u.unit}>
            <h3>{u.title}</h3>
            <p className="hint" style={{ margin: '4px 0 8px' }}>{u.kind}</p>
            <ul className="qs">{u.questions.map((q) => <li key={q}><span aria-hidden="true">☐</span> {q}<span className="sr"> (unanswered)</span></li>)}</ul>
            <p className="hint closure"><b>Closure rule.</b> {u.closure}</p>
            <a href={blob(`units/${u.folder}/STUDY.md`)} className="hint">units/{u.folder}/STUDY.md ↗</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function Rigour() {
  const tone = (s) => (s === 'Strong' ? 'good' : s.startsWith('Fixed') ? 'info' : s.startsWith('Partly') ? 'warn' : 'bad');
  return (
    <section id="rigour" className="card window reveal" data-title="rubric.md · research review">
      <p className="eyebrow">Research rigour and limitations</p>
      <h2>An honest scorecard of the <em>design</em>, before any data.</h2>
      <p className="sub">Read from <a href={blob('docs/research-review.md')}>docs/research-review.md</a>. Grades cover the design and process only; outcomes cannot be graded until runs exist.</p>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="stack">
          <thead><tr><th>Criterion</th><th>Grade</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>{SCORECARD.map(([c, g, s, note]) => <tr key={c}><td><b>{c}</b></td><td className="grade">{g}</td><td><span className={`pill ${tone(s)}`}>{s}</span></td><td className="hint wide">{note}</td></tr>)}</tbody>
        </table>
      </div>
      <h3 style={{ marginTop: 24 }}>Still open, and what closes each gap</h3>
      <div className="grid2" style={{ marginTop: 12 }}>
        {OPEN_GAPS.map(([gap, why, closes]) => (
          <div className="tile" key={gap}><h3>{gap}</h3><p className="hint" style={{ margin: '6px 0' }}>{why}.</p><p style={{ margin: 0, fontSize: 13 }}><b>Closes with:</b> {closes}</p></div>
        ))}
      </div>
    </section>
  );
}
