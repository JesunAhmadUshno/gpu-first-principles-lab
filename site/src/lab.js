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
      results: ls.find((l) => l.startsWith('RESULTS: ')).slice(9),
    });
  }
  const amendments = amendText.split(/^### /m).slice(1).map((a) => ({
    title: a.split('\n')[0].trim(), items: lines(a).filter((l) => l.startsWith('- ')).map((l) => l.slice(2)),
  }));
  const device = (body.match(/Device for every study below: (.+?)\. Timing/) || [])[1] || '';
  return { studies, amendments, device };
}

export function parseReadme(md) {
  const pick = (k) => (md.match(new RegExp(`^- ${k}: (.+)$`, 'm')) || [])[1] || '';
  return {
    host: pick('Host'), gpu: pick('GPU'),
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

// M1 index functions, as pinned in Amendment 1.
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
