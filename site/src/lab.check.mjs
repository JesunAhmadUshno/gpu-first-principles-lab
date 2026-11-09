// Known-answer self-check, run by "npm run build" before vite. Every value the page computes
// in the browser is reproduced here from the repo's own files (PREREGISTRATION.md, STUDY-MAP.md,
// README.md, SPEC.md, units/ including the recorded m*_results.json, REPORT.md)
// and the protocol arithmetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseStudyMap, parsePrereg, parseReadme, parseContract, parseUnitStudy, parseTable, verdict,
  m1Elements, m1BytesMoved, gbPerSecond, gemmFlops, gflopsPerSecond,
  coalescedIndex, stridedIndex, isPermutation, warpAddresses, segmentsTouched,
  median, recordedM1, recordedM2, recordedM3a, recordedM3b, studyIdOf,
} from './lab.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const p = JSON.parse(read('site/src/prereg.json'));
const preregMd = read('PREREGISTRATION.md');

// 1. prereg.json says what the markdown says.
const num = (re) => { const m = preregMd.match(re); assert.ok(m, `phrase missing: ${re}`); return +m[1]; };
assert.equal(p.M1.log2Elements, num(/arrays of 2\^(\d+) elements/));
assert.equal(p.M1.mibPerArray, num(/\((\d+) MiB per array\)/));
assert.equal(p.M1.supportedAtLeast, num(/at least (\d+(?:\.\d+)?)x the median strided/));
assert.equal(p.M1.partialAtLeast, num(/ratio is at least (\d+(?:\.\d+)?)x and below/));
assert.equal(p.M2.withinPercentagePoints, num(/within (\d+) percentage points/));
assert.deepEqual(p.M2.blockSizes, preregMd.match(/Sweep: block sizes ([\d, ]+) threads/)[1].split(',').map(Number));
assert.equal(p.M3a.supportedBelowMicroseconds, num(/per-launch overhead is below (\d+) microseconds/));
assert.equal(p.M3a.launches, num(/enqueue (\d+) consecutive launches/));
assert.deepEqual(p.M3b.sizes, preregMd.match(/square matrices of size (\d+), (\d+), and (\d+)/).slice(1).map(Number));
assert.equal(p.M3b.supportedAtLeast, num(/a speedup of at least (\d+(?:\.\d+)?)x/));
assert.equal(p.M3b.partialAbove, num(/speedup is above (\d+(?:\.\d+)?)x and below/));
assert.equal(p.M3c.verdictSize, num(/with size (\d+) as the verdict size/));
assert.equal(p.M3c.supportedAtLeast, num(/ratio at 2048 is at least (\d+(?:\.\d+)?)/));
assert.equal(p.M3c.partialAtLeast, num(/partially supported if at least (\d+(?:\.\d+)?) and below/));

// 2. Parsers: counts the hero shows.
const map = parseStudyMap(read('STUDY-MAP.md'));
assert.equal(map.filter((r) => r.unit.startsWith('U')).length, 14);
assert.equal(map.at(-1).feed, 'AWAITING SOURCE');
assert.deepEqual(map.filter((r) => r.feed === 'DIRECT').map((r) => r.unit), ['U11', 'U12', 'U13']);
assert.deepEqual(map.filter((r) => r.feed === 'INDIRECT').map((r) => r.unit), ['U02', 'U03', 'U09', 'U10']);
assert.deepEqual(Object.fromEntries(map.filter((r) => r.protocol).map((r) => [r.protocol, r.unit])),
  { M1: 'U02', M2: 'U03', M3a: 'U06', M3b: 'U12', M3c: 'U13' });
assert.equal(map[0].chapters, 'ch 1 to 3');
assert.equal(map.find((r) => r.unit === 'U14').kind, 'closing audit');

const prereg = parsePrereg(preregMd);
assert.deepEqual(prereg.studies.map((s) => s.id), ['M1', 'M2', 'M3a', 'M3b', 'M3c']);
assert.equal(prereg.device, 'BlackBox, NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM');
// Each RESULTS line is either NOT YET RUN or a dated run naming the device and one verdict word.
for (const s of prereg.studies) {
  if (!s.results.run) { assert.equal(s.results.label, 'NOT YET RUN', s.id); continue; }
  assert.match(s.results.when, /^\d{4}-\d{2}-\d{2}, BlackBox, RTX 5050 Laptop GPU$/, s.id);
  assert.ok(s.results.verdict, `${s.id}: RESULTS line has no verdict word`);
}

const readme = parseReadme(read('README.md'));
assert.equal(readme.host, 'BlackBox');
assert.match(readme.verdict, /^(Draft|Proposed|Functional|Evaluated|v1\.0 Released)\b/, 'README verdict line');
assert.equal(readme.steps.length, 5);
assert.equal(readme.primarySources.length, 3);
assert.deepEqual(parseContract(read('SPEC.md')).map((c) => c.part), ['STUDY.md', 'Code', 'Preregistration', 'Results', 'Verdict']);

const unitDirs = fs.readdirSync(path.join(root, 'units')).filter((d) => fs.existsSync(path.join(root, 'units', d, 'STUDY.md'))).sort();
const units = unitDirs.map((d) => parseUnitStudy(read(`units/${d}/STUDY.md`), `units/${d}/STUDY.md`));
assert.deepEqual(units.map((u) => u.unit), ['U01', 'U02', 'U03', 'U06', 'U12', 'U13']);
assert.ok(units.every((u) => u.questions.length === 4 && u.closure.length > 0));

const review = read('REPORT.md');
assert.equal(parseTable(review, 'Assessment by criterion').length, 10);
assert.ok(parseTable(review, 'Assessment by criterion').every((r) => r.length === 3));
assert.ok(parseTable(review, 'What remains open, and exactly what closes it').every((r) => r.length === 3));

// 3. Verdict bands at their edges.
assert.equal(verdict.M1(p.M1.supportedAtLeast, p), 'supported');
assert.equal(verdict.M1(4.99, p), 'partial');
assert.equal(verdict.M1(p.M1.partialAtLeast, p), 'partial');
assert.equal(verdict.M1(1.99, p), 'refuted');
assert.equal(verdict.M2(true, true), 'supported');
assert.equal(verdict.M2(true, false), 'partial');
assert.equal(verdict.M2(false, false), 'refuted');
assert.equal(verdict.M3a(9.99, p), 'supported');
assert.equal(verdict.M3a(p.M3a.supportedBelowMicroseconds, p), 'refuted');
assert.equal(verdict.M3b(p.M3b.supportedAtLeast, p), 'supported');
assert.equal(verdict.M3b(1.11, p), 'partial');
assert.equal(verdict.M3b(p.M3b.partialAbove, p), 'refuted');
assert.equal(verdict.M3c(p.M3c.supportedAtLeast, p), 'supported');
assert.equal(verdict.M3c(p.M3c.partialAtLeast, p), 'partial');
assert.equal(verdict.M3c(0.099, p), 'refuted');

// 4. Workload arithmetic: 2^24 float32 is 64 MiB per array, 128 MiB moved per launch.
assert.equal(m1Elements(p), 16777216);
assert.equal(m1BytesMoved(p), 2 * p.M1.mibPerArray * 2 ** 20);
assert.equal(m1BytesMoved(p), 134217728);
assert.equal(gbPerSecond(m1BytesMoved(p), 1), 134.217728);
assert.deepEqual(p.M3b.sizes.map(gemmFlops), [268435456, 2147483648, 17179869184]);
assert.equal(gflopsPerSecond(gemmFlops(1024), 1), 2147.483648);

// 5. M1 index functions: both are permutations at the real N, and at every N the visualizer allows.
assert.ok(isPermutation(stridedIndex, m1Elements(p)), 'strided mapping is not a permutation at N = 2^24');
assert.ok(isPermutation(coalescedIndex, m1Elements(p)));
for (let n = 64; n <= 1024; n += 32) assert.ok(isPermutation(stridedIndex, n), `strided not a permutation at N=${n}`);
assert.deepEqual(warpAddresses(stridedIndex, 1024, 0), Array.from({ length: 32 }, (_, i) => 32 * i));
assert.equal(segmentsTouched(warpAddresses(coalescedIndex, 1024, 0), 128, 4), 1);
assert.equal(segmentsTouched(warpAddresses(stridedIndex, 1024, 0), 128, 4), 32);
assert.equal(segmentsTouched(warpAddresses(coalescedIndex, 1024, 0), 32, 4), 4);
assert.equal(segmentsTouched(warpAddresses(stridedIndex, 256, 0), 128, 4), 8);

// 6. Recorded results: recompute every figure the page shows from the raw arrays, then check it
// against the stored summary in the same file, the verdict rule, and the RESULTS line in the markdown.
const resultFiles = unitDirs.flatMap((d) => fs.readdirSync(path.join(root, 'units', d)).filter((f) => /^m\d[a-z]?_results\.json$/.test(f)).map((f) => `units/${d}/${f}`));
const rec = Object.fromEntries(resultFiles.map((f) => [studyIdOf(`/${f}`), JSON.parse(read(f))]));
const runIds = prereg.studies.filter((s) => s.results.run).map((s) => s.id);
assert.deepEqual(Object.keys(rec).sort(), [...runIds].sort(), 'every run study has a results file and no other');
const close = (a, b, rel, what) => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${what}: ${a} vs ${b}`);
const study = (id) => prereg.studies.find((s) => s.id === id).results;
const VW = { supported: 'SUPPORTED', partial: 'PARTIALLY SUPPORTED', refuted: 'REFUTED' };
assert.equal(median([3, 1, 2]), 2);
assert.equal(median([4, 1, 3, 2]), 2.5);

if (rec.M1) {
  const r = recordedM1(rec.M1), j = rec.M1;
  assert.equal(j.bytes_moved_per_launch, m1BytesMoved(p));
  assert.equal(j.timed_launches, p.M1.timed);
  // times_ms are stored to 4 decimals, so the recomputed medians agree to within 0.1 percent.
  close(r.coalesced, j.variants.coalesced.bandwidth_gb_s_median, 1e-3, 'M1 coalesced');
  close(r.strided, j.variants.strided.bandwidth_gb_s_median, 1e-3, 'M1 strided');
  close(r.ratio, j.ratio_median_coalesced_over_strided, 2e-3, 'M1 ratio');
  const v = verdict.M1(r.ratio, p);
  assert.equal(VW[v], j.verdict); assert.equal(v, study('M1').verdict);
  assert.ok(study('M1').text.includes(`ratio ${j.ratio_median_coalesced_over_strided.toFixed(2)}x`));
  assert.ok(study('M1').text.includes(`coalesced median ${r.coalesced.toFixed(1)} GB/s`));
  assert.ok(study('M1').text.includes(`strided median ${r.strided.toFixed(1)} GB/s`));
  assert.ok(r.correct);
}
if (rec.M2) {
  const r = recordedM2(rec.M2, p), j = rec.M2;
  assert.deepEqual(r.rows.map((x) => x.block), p.M2.blockSizes);
  r.rows.forEach((x, i) => close(x.achieved, j.rows[i].achieved_occupancy_pct_median, 1e-12, `M2 achieved ${x.block}`));
  assert.equal(r.best.block, j.fastest_block_size);
  assert.equal(r.onset.block, j.plateau_onset_block_size);
  assert.equal(r.withinPp, j.condition_1_achieved_within_10pp_at_best);
  assert.equal(r.withinStep, j.condition_2_fastest_within_one_step_of_plateau_onset);
  const v = verdict.M2(r.withinPp, r.withinStep);
  assert.equal(VW[v], j.verdict); assert.equal(v, study('M2').verdict);
  assert.ok(study('M2').text.includes(`${r.gapPp.toFixed(1)} percentage points below theoretical`));
  assert.ok(study('M2').text.includes(`fastest block size ${r.best.block}`));
}
if (rec.M3a) {
  const r = recordedM3a(rec.M3a), j = rec.M3a;
  assert.equal(r.n, p.M3a.repeats); assert.equal(r.launches, p.M3a.launches);
  close(r.median, j.per_launch_us_median, 1e-12, 'M3a median');
  assert.equal(r.min, j.per_launch_us_min); assert.equal(r.max, j.per_launch_us_max);
  const v = verdict.M3a(r.median, p);
  assert.equal(VW[v], j.verdict); assert.equal(v, study('M3a').verdict);
  assert.ok(study('M3a').text.includes(`${r.median.toFixed(2)} microseconds`));
  assert.ok(study('M3a').text.includes(`spread ${r.min.toFixed(2)} to ${r.max.toFixed(2)} microseconds`));
}
if (rec.M3b) {
  const r = recordedM3b(rec.M3b, p), j = rec.M3b;
  assert.deepEqual(r.bySize.map((x) => x.n), p.M3b.sizes);
  for (const x of r.bySize) {
    const s = j.results_by_size[x.n];
    close(x.naive, s.naive.time_ms_median, 1e-12, `M3b naive ${x.n}`);
    close(x.tiled, s.tiled.time_ms_median, 1e-12, `M3b tiled ${x.n}`);
    close(x.tiledGflops, s.tiled.gflops_median, 1e-9, `M3b GFLOP/s ${x.n}`);
    assert.ok(x.correct);
  }
  close(r.speedup, j.speedup_at_1024, 1e-12, 'M3b speedup');
  const v = verdict.M3b(r.speedup, p);
  assert.equal(VW[v], j.verdict); assert.equal(v, study('M3b').verdict);
  assert.ok(study('M3b').text.includes(`speedup at the verdict size ${p.M3b.verdictSize} is ${r.speedup.toFixed(2)}x`));
}

// 7. The committed bootstrap intervals are centred on the same point estimates the page recomputes.
const boot = JSON.parse(read('analysis/bootstrap_medians.json'));
close(boot.M1_ratio_of_median_bandwidths.point, recordedM1(rec.M1).ratio, 1e-12, 'boot M1');
close(boot.M3a_median_per_launch_us.point, recordedM3a(rec.M3a).median, 1e-12, 'boot M3a');
close(boot.M3b_speedup_at_1024.point, recordedM3b(rec.M3b, p).speedup, 1e-12, 'boot M3b');
for (const k of ['M1_ratio_of_median_bandwidths', 'M3a_median_per_launch_us', 'M3b_speedup_at_1024']) assert.ok(boot[k].lo <= boot[k].point && boot[k].point <= boot[k].hi, k);
// The M3a interval straddles the frozen line, which the page states; M1 and M3b stay inside one band.
assert.ok(boot.M3a_median_per_launch_us.lo < p.M3a.supportedBelowMicroseconds && boot.M3a_median_per_launch_us.hi > p.M3a.supportedBelowMicroseconds);
assert.equal(verdict.M1(boot.M1_ratio_of_median_bandwidths.lo, p), verdict.M1(boot.M1_ratio_of_median_bandwidths.hi, p));
assert.equal(verdict.M3b(boot.M3b_speedup_at_1024.lo, p), verdict.M3b(boot.M3b_speedup_at_1024.hi, p));

console.log('lab check ok', { units: map.length - 1, studies: prereg.studies.length, bytesMoved: m1BytesMoved(p), run: runIds });
