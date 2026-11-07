// Known-answer self-check, run by "npm run build" before vite. Every value the page computes
// in the browser is reproduced here from the repo's own files (PREREGISTRATION.md, STUDY-MAP.md,
// README.md, SPEC.md, units/, docs/research-review.md) and the protocol arithmetic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseStudyMap, parsePrereg, parseReadme, parseContract, parseUnitStudy, parseTable, verdict,
  m1Elements, m1BytesMoved, gbPerSecond, gemmFlops, gflopsPerSecond,
  coalescedIndex, stridedIndex, isPermutation, warpAddresses, segmentsTouched,
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
assert.ok(prereg.studies.every((s) => s.results === 'NOT YET RUN'), 'a study claims a result');
assert.equal(prereg.device, 'BlackBox, NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM');
assert.equal(prereg.amendments.length, 1);

const readme = parseReadme(read('README.md'));
assert.equal(readme.host, 'BlackBox');
assert.equal(readme.steps.length, 5);
assert.equal(readme.primarySources.length, 3);
assert.deepEqual(parseContract(read('SPEC.md')).map((c) => c.part), ['STUDY.md', 'Code', 'Preregistration', 'Results', 'Verdict']);

const unitDirs = fs.readdirSync(path.join(root, 'units')).filter((d) => fs.existsSync(path.join(root, 'units', d, 'STUDY.md'))).sort();
const units = unitDirs.map((d) => parseUnitStudy(read(`units/${d}/STUDY.md`), `units/${d}/STUDY.md`));
assert.deepEqual(units.map((u) => u.unit), ['U01', 'U02', 'U03']);
assert.ok(units.every((u) => u.questions.length === 4 && u.closure.length > 0));

const review = read('docs/research-review.md');
assert.equal(parseTable(review, 'Scorecard').length, 10);
assert.equal(parseTable(review, 'What remains open, and exactly what closes it').length, 6);

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

console.log('lab check ok', { units: map.length - 1, studies: prereg.studies.length, bytesMoved: m1BytesMoved(p) });
