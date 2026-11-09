# gpu-first-principles-lab

**Question.** On one consumer laptop GPU, do the textbook rules of GPU
performance (coalescing, occupancy, launch overhead, shared-memory
tiling) hold at the sizes their pre-registered lines predict?

**Headline.** On the RTX 5050 Laptop GPU of record, a shared-memory
tiled GEMM ran 8.62x faster than a naive GEMM at size 1024 (bootstrap
95% interval 8.35 to 8.68, one session), and a tuned tiled GEMM reached
0.99 of cuBLAS SGEMM throughput at size 2048 (interval 0.98 to 1.02).
Of the five pre-registered studies, two are supported, two are
partially supported (coalescing 4.22x against a 5x line, interval 4.07
to 4.31), and one is refuted (launch overhead 12.28 microseconds
against a 10 microsecond line, interval 8.17 to 12.52).

**Field.** Systems, performance. **Job family.** GPU and ML systems
engineering.

**Verdict.** Functional. The plan was locked before any code or result
(tag proposal-v1 on a04d4ac); tests pass in CI on Python 3.11 and 3.12;
all five studies ran end to end on the machine of record with raw
records committed, and one command regenerates the intervals from
them. Not Evaluated: M2 keeps no raw timings, no device peak is
stated, and no run records co-tenancy (REPORT.md, field profile).

Live dashboard: https://jesunahmadushno.github.io/gpu-first-principles-lab/

## Reproduce

```text
python3 -m unittest discover -s tests -v
python3 analysis/bootstrap_medians.py && git diff --exit-code analysis/bootstrap_medians.json
cd site && npm ci && npm run build
```

The checks need Python 3 only (standard library). The site build
recomputes every recorded figure from the raw arrays and fails on any
mismatch. Re-running a measurement needs the machine of record (CUDA,
torch, Triton): for example
`python3 units/u12-shared-memory-and-tiling/m3b_gemm.py` writes a new
m3b_results.json beside itself.

## Lifecycle

- Question: DONE 2026-11-06
- Proposal: DONE 2026-11-06
- Baseline: DONE 2026-11-07
- Build: DONE 2026-11-07
- Evaluate: OPEN
- Report: OPEN
- Review: OPEN
- Release: OPEN

## Layout

Files named in the locked scaffold keep their names; the second column
gives the role each plays in the portfolio standard. There is no
experiments/ or results/ folder: the locked PREREGISTRATION.md points
each RESULTS line at its unit folder, so raw evidence stays there, and
the one scored output lives in analysis/.

| Path | Role | What it holds |
| --- | --- | --- |
| PREREGISTRATION.md | proposal | Frozen protocols and verdict rules (tag proposal-v1); only RESULTS lines may change, and a test pins the rest to the locked SHA-256 |
| SPEC.md, STUDY-MAP.md | proposal (scope) | Scope, unit contract, quality gates, environment record; the fourteen units and their primary sources |
| REPORT.md | report | Every hypothesis scored, field profile check, the 2026-11-07 review, open gaps, threats |
| units/ | code and evidence | One folder per unit: STUDY.md, the harness (m*_*.py) and its raw record (m*_results.json) |
| analysis/ | results | bootstrap_medians.py and the intervals it regenerates from units/ |
| docs/decisions/ | decisions | Records of hard-to-reverse choices |
| tests/ | tests | Frozen rules, threshold contract, interval reproduction, lock pin, layout |
| site/ | dashboard | React and Vite, built and published by .github/workflows/pages.yml |
| CHANGELOG.md, CITATION.cff, SECURITY.md, LICENSE | project | History, citation, security contact, Apache-2.0 |

## Hardware of record

All measurements in this lab run on one machine:

- Host: BlackBox
- GPU: NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM

This is a consumer laptop GPU. Numbers measured on it describe this device. Consumer-GPU numbers are never presented as datacenter numbers anywhere in this repo, and every results table names the device it was measured on.

## The method

This lab is the literacy layer under inference and training work, so that performance claims made elsewhere in this portfolio rest on understood hardware behaviour rather than on rules of thumb. A unit is finished when the concept has been restated in our own words, checked against a primary source, implemented in original code, measured on the named hardware, and closed with a published verdict. Every unit follows the same five steps, in this order:

1. Study the concept from the study map (see STUDY-MAP.md).
2. Verify the concept against a primary source before it is written down as fact here.
3. Implement it originally. All text and code in this repo are written for this repo.
4. Measure it on the named hardware, under a protocol that was pre-registered before the run (see PREREGISTRATION.md).
5. Publish the verdict, including when the measurement disagrees with the expectation.

No unit has its concept answers written yet, so no unit has closed.

## Credits and sources

Study map source: this lab follows and cites the curriculum at BEFORE-GPU-ENGINEERING (https://github.com/BEFORE-GPU-ENGINEERING/BEFORE-GPU-ENGINEERING), published under the MIT licence. That project supplies the chapter sequence this lab studies. It is a map, not an authority: nothing is copied from it, and no claim enters this repo on its word alone.

Primary sources used for verification:

- NVIDIA CUDA C++ Programming Guide
- NVIDIA CUDA C++ Best Practices Guide
- NVIDIA architecture whitepapers and named papers, cited per unit where used

## License

Apache-2.0. See LICENSE.
