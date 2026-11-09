// Pure functions behind the dashboard. Parsers read the repo's own markdown at build time;
// the arithmetic is the protocol arithmetic from PREREGISTRATION.md. Checked by lab.check.mjs.

const lines = (md) => md.split('\n').map((l) => l.trim());
const bulletsAfter = (md, heading) => {
  const out = [];
  let on = false;
  for (const l of lines(md)) {
    if (l.startsWith('#')) { on = l.replace(/^#+\s*/, '') === heading; continue; }
    if (on && l.startsWith('- ')) out.push(l.slice(2));
  }
  return out;
};
const paragraphAfter = (md, heading) => {
  const ls = lines(md);
  const i = ls.findIndex((l) => l.replace(/^#+\s*/, '') === heading && l.startsWith('#'));
  return i < 0 ? '' : (ls.slice(i + 1).find((l) => l && !l.startsWith('#')) || '');
};

export function parseStudyMap(md) {
  return lines(md).filter((l) => /^\| (U\d\d|Phase \d)/.test(l)).map((l) => {
    const [unit, partCell, kindText, source, feed] = l.split('|').slice(1, -1).map((c) => c.trim());
    const m = partCell.match(/^(.*?) \((ch [^)]+)\)(?:: (.*))?$/);
    const kind = /^Concept gate/.test(kindText) ? 'concept gate'
      : /^Closing/.test(kindText) ? 'closing audit'
      : /^AWAITING/.test(kindText) ? 'awaiting source' : 'micro-study';
    return {
      unit, part: m ? m[1] : partCell, chapters: m ? m[2] : '', concepts: m && m[3] ? m[3].split('; ') : [],
      kindText, kind, protocol: (kindText.match(/\bM\d[a-z]?\b/) || [''])[0], source, feed,
    };
  });
}

export function parsePrereg(md) {
  const [body, amendText = ''] = md.split('\n## Amendments');
  const parts = body.split(/^#{2,3} (M\d[a-z]?): (.+)$/m);
  const studies = [];
  for (let i = 1; i < parts.length; i += 3) {
    const text = parts[i + 2], ls = lines(text);
    const rule = ls.find((l) => l.startsWith('Frozen verdict rule: '));
    if (!rule) continue;
    studies.push({
      id: parts[i], title: parts[i + 1].replace(/\s*\(Units? [^)]+\)$/, ''),
      units: (parts[i + 1].match(/U\d\d/g) || []),
      hypothesis: ls.find((l) => l.startsWith('Hypothesis: ')).slice(12),
      protocol: ls.filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
      rule: rule.slice(21),
      results: parseResultsLine(ls.find((l) => /^RESULTS\b/.test(l)) || ''),
    });
  }
  const amendments = amendText.split(/^### /m).slice(1).map((a) => ({
    title: a.split('\n')[0].trim(), items: lines(a).filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
  }));
  const device = (body.match(/Device for every study below: (.+?)\. Timing/) || [])[1] || '';
  return { studies, amendments, device };
}

// "RESULTS: NOT YET RUN" or "RESULTS (date, device): ... Verdict: PARTIALLY SUPPORTED. ..."
const VERDICT_WORD = { 'SUPPORTED': 'supported', 'PARTIALLY SUPPORTED': 'partial', 'REFUTED': 'refuted' };
export function parseResultsLine(l) {
  const m = l.match(/^RESULTS \(([^)]*)\): (.*)$/);
  if (!m) return { run: false, label: l.replace(/^RESULTS:\s*/, '') || 'NOT YET RUN' };
  const v = (m[2].match(/Verdict: ([A-Z ]+?)\./) || [])[1];
  return { run: true, when: m[1], text: m[2], verdictWord: v, verdict: VERDICT_WORD[v], label: v };
}

export function parseReadme(md) {
  const pick = (k) => (md.match(new RegExp(`^- ${k}: (.+)$`, 'm')) || [])[1] || '';
  return {
    host: pick('Host'), gpu: pick('GPU'),
    verdict: ((md.match(/^\*\*Verdict\.\*\* (.+?\.)(?: |$)/m) || [])[1]) || '',
    steps: lines(md).filter((l) => /^\d\. /.test(l)).map((l) => l.slice(3)),
    primarySources: lines((md.split('Primary sources used for verification:')[1] || '').split('\n## ')[0]).filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
  };
}

export const parseContract = (spec) => bulletsAfter(spec, 'Per-unit deliverable contract').map((b) => {
  const k = b.indexOf(': ');
  return { part: b.slice(0, k), text: b.slice(k + 2) };
});

export function parseUnitStudy(md, path) {
  return {
    unit: `U${path.match(/u(\d\d)-/)[1]}`, folder: path.match(/(u\d\d-[^/]+)/)[1],
    title: lines(md)[0].replace(/^# /, ''),
    kind: (md.match(/^Kind: (.+)$/m) || [])[1] || '',
    questions: bulletsAfter(md, 'Questions this unit must answer'),
    closure: paragraphAfter(md, 'Closure rule'),
  };
}

// Rows of the first markdown table under a "## heading", header and separator dropped.
export function parseTable(md, heading) {
  const section = (md.split(`\n## ${heading}\n`)[1] || '').split('\n## ')[0];
  return lines(section).filter((l) => l.startsWith('|')).slice(2).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
}

// Verdict rules, read from prereg.json (which tests prove equals PREREGISTRATION.md).
export const verdict = {
  M1: (ratio, p) => ratio >= p.M1.supportedAtLeast ? 'supported' : ratio >= p.M1.partialAtLeast ? 'partial' : 'refuted',
  M2: (withinPp, withinStep) => withinPp && withinStep ? 'supported' : withinPp || withinStep ? 'partial' : 'refuted',
  M3a: (us, p) => us < p.M3a.supportedBelowMicroseconds ? 'supported' : 'refuted',
  M3b: (speedup, p) => speedup >= p.M3b.supportedAtLeast ? 'supported' : speedup > p.M3b.partialAbove ? 'partial' : 'refuted',
  M3c: (ratio, p) => ratio >= p.M3c.supportedAtLeast ? 'supported' : ratio >= p.M3c.partialAtLeast ? 'partial' : 'refuted',
};

// Workload arithmetic. M1 moves every element once in (read) and once out (write).
export const m1Elements = (p) => 2 ** p.M1.log2Elements;
export const m1BytesMoved = (p) => 2 * m1Elements(p) * p.M1.bytesPerElement;
export const gbPerSecond = (bytes, ms) => bytes / 1e9 / (ms / 1e3);
export const gemmFlops = (n) => 2 * n ** 3;
export const gflopsPerSecond = (flops, ms) => flops / 1e9 / (ms / 1e3);

// M1 index functions, as written in units/u02-feeding-the-beast/m1_copy_bandwidth.py.
export const coalescedIndex = (i) => i;
export const stridedIndex = (i, n) => { const s = n / 32; return (i % s) * 32 + Math.floor(i / s); };
export function isPermutation(f, n) {
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const j = f(i, n); if (j < 0 || j >= n || seen[j]) return false; seen[j] = 1; }
  return true;
}
export const warpAddresses = (f, n, warp) => Array.from({ length: 32 }, (_, lane) => f(warp * 32 + lane, n));
export const segmentsTouched = (addrs, segmentBytes, bytesPerElement) =>
  new Set(addrs.map((a) => Math.floor((a * bytesPerElement) / segmentBytes))).size;

// Recorded results: recompute each headline figure from the raw arrays in units/*/m*_results.json.
// Median as numpy.median (mean of the two middle values for an even count).
export const median = (xs) => { const a = [...xs].sort((x, y) => x - y), h = a.length >> 1; return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2; };
export function recordedM1(r) {
  const bw = (v) => median(r.variants[v].times_ms.map((t) => gbPerSecond(r.bytes_moved_per_launch, t)));
  const coalesced = bw('coalesced'), strided = bw('strided');
  return { coalesced, strided, ratio: coalesced / strided, correct: r.variants.coalesced.correct && r.variants.strided.correct };
}
export function recordedM2(r, p) {
  const rows = r.rows.map((x) => ({ block: x.block_size, theoretical: x.theoretical_occupancy_pct,
    achieved: median(x.achieved_occupancy_pct_runs), ms: x.time_ms_median }));
  const best = rows.reduce((a, b) => (b.ms < a.ms ? b : a));
  const top = Math.max(...rows.map((x) => x.theoretical));
  const onset = rows.find((x) => x.theoretical === top);
  const withinPp = Math.abs(best.theoretical - best.achieved) <= p.M2.withinPercentagePoints;
  const withinStep = Math.abs(rows.indexOf(best) - rows.indexOf(onset)) <= 1;
  return { rows, best, onset, gapPp: best.theoretical - best.achieved, withinPp, withinStep };
}
export function recordedM3a(r) {
  const xs = r.per_launch_us_by_repetition;
  return { median: median(xs), min: Math.min(...xs), max: Math.max(...xs), n: xs.length, launches: r.launches_per_repetition };
}
export function recordedM3b(r, p) {
  const bySize = r.sizes.map((n) => {
    const x = r.results_by_size[n], naive = median(x.naive.times_ms), tiled = median(x.tiled.times_ms);
    return { n, naive, tiled, speedup: naive / tiled, naiveGflops: gflopsPerSecond(gemmFlops(n), naive), tiledGflops: gflopsPerSecond(gemmFlops(n), tiled),
      correct: x.naive.correct && x.tiled.correct };
  });
  return { bySize, speedup: bySize.find((x) => x.n === p.M3b.verdictSize).speedup };
}
// Results files are named m1_results.json, m3a_results.json, ...: the stem is the study id.
export const studyIdOf = (path) => path.match(/\/(m\d[a-z]?)_results\.json$/)[1].toUpperCase().replace(/([A-Z])$/, (c) => c.toLowerCase());
