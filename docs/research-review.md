# Research review

Reviewed: 2026-11-07, at the scaffold stage (no measurement has been run). The lab is graded against a doctoral research rubric. A design can be graded before results exist; outcomes cannot, so every grade below is a grade of the design and the process, not of findings.

Rule applied: every gap that can be fixed without a GPU, paid services or long runs is fixed in this change. Every gap left open names the exact compute or data it needs.

## Scorecard

| Criterion | Grade | Status | Note |
| --- | --- | --- | --- |
| Research question | A- | Strong | One question per unit, tied to a named device and a downstream consumer (cuda-kernels-lab v1.1). Scope and non-goals are explicit in SPEC.md. |
| Hypotheses | B+ | Fixed in this change | Five directional hypotheses with numeric verdict bands. M3a now states that it measures launch throughput, with single-launch latency reported separately. |
| Method and protocol | B | Fixed in this change | The M1 strided function, M2 grid sizing, plateau onset and occupancy source are now pinned by a dated amendment made before any run. |
| Baselines and reference ceilings | C | Open: needs GPU | M1 and M3c have internal baselines (coalesced copy, cuBLAS). There is no device peak bandwidth or FLOP rate to read results as a fraction of peak. |
| Statistics and uncertainty | C+ | Partly fixed | IQR and a bootstrap interval of the median are now required for every table. Run counts and thresholds remain unjustified until a pilot run exists. |
| Reproducibility | B- | Partly fixed | Protocols, device and environment record are written down and tested. No harness or measurement code exists yet, so nothing can be rerun. |
| Threats to validity | C+ | Partly fixed | Laptop clock, thermal and power variance now has an environment record. No controls are pinned yet (clock locking, cool-down, AC power). |
| Related work and sources | B- | Open: unit work | The curriculum (MIT) and NVIDIA primary sources are named per unit. No claim has a recorded citation yet, because no unit has been answered. |
| Limitations and honesty | A | Strong | The README, every stub and every protocol say no results exist. Consumer-only scope is stated. Phase 5 is marked AWAITING SOURCE rather than invented. |
| Tests and automation | B+ | Fixed in this change | Tests now check frozen rules, the device line, the M1 bijection, the em dash gate and that the site's thresholds equal the markdown. CI runs them on Python 3.11 and 3.12. |

## What this change fixed

1. Under-specified M1 mapping. The protocol said "style strided indexing ... fixed in code before the run", which defers the treatment to code that does not exist. Amendment 1 pins f(i) = (i mod (N/32)) * 32 + floor(i / (N/32)) with N = 2^24, and a test proves it is a permutation, so the correctness check of the copy is well defined.
2. M2 escape hatches. "Grid sized to fill the device", "onset of the theoretical plateau" and "from the profiler or runtime measurement where available" could each be read after the fact. Amendment 1 defines all three, and scores the occupancy condition as not holding if the metric cannot be collected.
3. M3a construct validity. 1000 back-to-back launches timed as one sequence measure pipelined launch throughput, not the latency of one launch. The amendment names the figure for what it is and adds a separate synchronous latency figure that does not enter the verdict.
4. Thin uncertainty reporting. Only M1 asked for an IQR. Every table now reports IQR and a percentile bootstrap 95 percent interval of the median (descriptive; the frozen rules still read medians).
5. Uncontrolled laptop variables. SPEC.md now requires an environment record with every results table: driver and CUDA versions, power source and mode, clocks and temperature at start and end, persistence mode, date and harness commit.
6. Untested quality gates. tests/test_preregistration.py enforces the SPEC "em dash count is 0" gate on every text file, checks every study keeps a frozen rule and the NOT YET RUN marker, checks the device of record, and checks that site/src/prereg.json carries the same thresholds and constants as PREREGISTRATION.md. The site's build runs a second known-answer check (site/src/lab.check.mjs).

## What remains open, and exactly what closes it

| Gap | Why it cannot be closed now | What closes it |
| --- | --- | --- |
| No results for M1, M2, M3a, M3b, M3c | Every protocol needs kernels timed on the device of record | The CUDA harness for each study, run on BlackBox (RTX 5050 Laptop, 8 GB): about 20 timed launches per M1 variant, 6 block sizes x 20 launches for M2, 10 x 1000 empty launches for M3a, 3 sizes x 10 launches x 2 or 3 implementations for M3b and M3c. |
| No reference ceilings | The repo states no device peak, and none may be added without a source | Either the published memory and FP32 specification for the RTX 5050 Laptop from an NVIDIA primary source, cited in the unit, or a measured ceiling (a bandwidth microbenchmark and an FMA throughput kernel on BlackBox). |
| Thresholds and run counts are not justified | Justification needs a variance estimate, which needs data | A pilot run on BlackBox, recorded as a pilot and excluded from verdicts, to estimate run-to-run spread; then a dated amendment, before the verdict runs, that either keeps or resizes the run counts. Thresholds stay frozen. |
| No pinned controls for clocks and thermals | Controls are set on the device itself | On BlackBox: AC power, a fixed power mode, a cool-down rule between variants, and locked clocks if the driver allows it (nvidia-smi --lock-gpu-clocks), recorded in the environment record. |
| No citations recorded | The answers are the units' own deliverables: SPEC.md requires each to be written in original words and verified by the lab author against the named source, so writing them in a tooling change would bypass the closure rule | The named NVIDIA guide sections (Programming Guide: Introduction, Programming Model, Hardware Implementation; Best Practices Guide: Memory Optimizations, Execution Configuration Optimizations), read for U01 to U03, with answers and section references written into each STUDY.md. No compute needed. |
| Phase 5 units do not exist | The source curriculum has not published those chapters | Publication of Phase 5 by the source; units are then added, never invented in advance. |

## Threats to validity, as the design stands

- Construct: M1 bytes moved counts one read and one write per element; caches and prefetching can make the effective figure differ from DRAM traffic. M3a measures throughput, as now stated.
- Internal: thermal throttling and boost clocks on a laptop can drift within a session. The environment record makes drift visible but does not prevent it.
- External: every number will describe one consumer laptop GPU. The README already forbids reading them as datacenter numbers.
- Statistical: 10 to 20 timed runs give a median with a wide interval when variance is high; the bootstrap interval now makes that width visible.

## About the live dashboard

The site in site/ shows the design only. Every count and threshold on it is parsed from STUDY-MAP.md, PREREGISTRATION.md, README.md, SPEC.md, units/ and this file at build time. The verdict playground, the workload calculator and the stride visualizer run on numbers the viewer types; they are labelled as what-if inputs, and no measured value exists anywhere on the page.
