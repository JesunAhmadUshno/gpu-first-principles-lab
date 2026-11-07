# Research review

Reviewed: 2026-11-07, after the first four runs. M1, M2, M3a and M3b each have a recorded run on BlackBox (RTX 5050 Laptop GPU), a results file under units/ and a RESULTS line in PREREGISTRATION.md. M3c has not run. The lab is graded against a doctoral research rubric: the design, and now the measurements themselves.

Rule applied: every gap that can be fixed without a GPU, paid services or long runs is fixed in this change. Every gap left open names the exact compute or data it needs.

## Scorecard

| Criterion | Grade | Status | Note |
| --- | --- | --- | --- |
| Research question | A- | Strong | One question per unit, tied to a named device and a downstream consumer (cuda-kernels-lab v1.1). Scope and non-goals are explicit in SPEC.md. |
| Hypotheses | B+ | Strong | Five directional hypotheses with numeric verdict bands, frozen before the runs and judged as written: two partially supported, one refuted, one supported. The refutation of M3a was published, not explained away. |
| Method and protocol | B- | Partly fixed | The runs follow the frozen text. M2 used the protocol's runtime route for achieved occupancy (an instrumented twin kernel, no profiler installed), and M3a's figure of record is a second execution of the protocol; both are disclosed in the unit files but neither choice was fixed before the data. |
| Baselines and reference ceilings | C | Open: needs GPU or a cited spec | M1 and M3b carry internal baselines (coalesced copy, naive GEMM). There is still no device peak bandwidth or FLOP rate, so 305.2 GB/s and 8,635.5 GFLOP/s cannot be read as a fraction of peak. |
| Statistics and uncertainty | C+ | Partly fixed | 20 or 10 timed launches per cell in one session, medians and IQR only. This change adds seeded bootstrap intervals from the raw arrays (analysis/bootstrap_medians.json): M1 and M3b stay inside one verdict band; the M3a interval crosses the 10 microsecond line. |
| Reproducibility | B | Partly fixed | Harness code, raw timing arrays (except M2), library versions and seeds are committed, and a test now reruns the interval analysis. M2 stores only the median and quartiles of its timings, so its timing spread cannot be reanalysed. |
| Threats to validity | C+ | Open: needs GPU | Clock and power state visibly moved within runs: M3a's repetitions split into two groups, and its pre-run nvidia-smi line reads 100 percent utilisation. No controls were pinned (locked clocks, AC power, cool-down). |
| Related work and sources | B- | Open: unit work | The curriculum (MIT) and NVIDIA primary sources are named per unit. No concept answer, and so no recorded citation, exists yet in any STUDY.md. |
| Limitations and honesty | A- | Strong | Partial and refuted verdicts are reported at face value, M3a's first execution is disclosed, and the README states that no unit has closed. Phase 5 is marked AWAITING SOURCE rather than invented. |
| Tests and automation | B+ | Fixed in this change | Tests check frozen rules, that each RESULTS line names the device and matches its results file's verdict, that the M1 harness runs the protocol mapping, the em dash gate, the site thresholds and the interval analysis. The site build recomputes every shown figure from the raw arrays. |

## Grading the four runs

M1 (U02), coalesced vs strided copy, PARTIALLY SUPPORTED at a 4.22x ratio. Strong: both variants pass a full host correctness check, and the strided mapping in m1_copy_bandwidth.py is exactly the protocol's f(i). The bootstrap interval of the ratio (4.07 to 4.31) sits wholly inside the 2x to 5x band, so the verdict does not hinge on noise. Weak: the timing array is stored rounded to 4 decimals of a millisecond, no environment line was recorded, and with no stated peak the 305.2 GB/s figure has no ceiling to be read against.

M2 (U03), occupancy sweep, PARTIALLY SUPPORTED. The theoretical side is sound: it comes from the CUDA occupancy API on the compiled kernel. The achieved side is the weak point. With no profiler installed, achieved occupancy was taken from an instrumented twin kernel that records a timer and SM id per block, so it measures the twin, not the timed kernel, and launch ramp and tail count against its time-weighted mean. The 28.0 point gap at block 64 could be partly a property of that method; nothing in the repo yet calibrates it against a profiler. The verdict is nonetheless stable on the data as recorded: blocks 64 and 128 are within each other's timing IQR, so "fastest" is not resolved, but condition 2 holds for either and condition 1 fails for either.

M3a (U06), launch overhead, REFUTED at 12.28 microseconds. The measurement note correctly names what is timed: back-to-back enqueue through the Python and Triton launch path, not an isolated launch latency. Two weaknesses matter. First, the ten repetitions are bimodal (8.07 to 13.27 microseconds): the first three sit below the 10 microsecond line, the other seven above it, and the bootstrap interval of the median (8.17 to 12.52) crosses the line. Second, the figure of record is a second execution after a warm load; the first execution (median 14.87) is disclosed and gives the same verdict, but choosing which execution counts was not pre-registered. Read honestly: refuted under the rule, fragile in fact.

M3b (U12), naive vs tiled GEMM, SUPPORTED at 8.62x at size 1024. Strong: an 8.35 to 8.68 bootstrap interval far above the 1.5x line, a host reference check at every size, and all three sizes reported. Weak: both kernels are Triton, so "tiled" includes whatever the Triton compiler does with tl.dot beyond explicit tiling, and the naive baseline (about 900 GFLOP/s) is itself compiler generated. Correctness at sizes 1024 and 2048 rests on 4,096 sampled elements, not the full output.

## What this change fixed

1. Stale review. The previous version graded a scaffold with no runs. This version grades the four recorded runs, including their method and statistics.
2. No uncertainty on the verdict statistics. analysis/bootstrap_medians.py computes percentile bootstrap 95 percent intervals (10,000 resamples, fixed seed, standard library only) for the M1 ratio, the M3a median and the M3b speedup from the raw arrays, and tests/test_analysis.py proves the committed output reproduces. The intervals are descriptive; the frozen rules still read the medians.
3. A test that would have failed main. The preregistration test asserted every study read NOT YET RUN. It now checks that each RESULTS line is either NOT YET RUN or a dated run on the device of record whose verdict matches its results file.
4. A protocol amendment the runs never saw. An earlier draft of this branch added an "Amendment 1, before any run" to PREREGISTRATION.md (bootstrap intervals, a synchronous M3a latency figure, new M2 definitions). The four runs on main were made without it, so it has been withdrawn and PREREGISTRATION.md is byte-identical to main. Its proposals are kept below as candidate changes for M3c and any re-run, to be adopted only by a dated amendment before those runs.
5. Environment record. SPEC.md keeps the environment record for future runs and now states plainly that the four runs of 2026-11-07 predate it and carry only part of it.

Candidate protocol changes, not in force (each needs a dated amendment before the run it governs):

- M2: take achieved occupancy from Nsight Compute where installed, and calibrate the twin-kernel route against it on the same sweep.
- M3a: report a synchronous single-launch latency figure beside the throughput figure, and fix in advance which execution is the run of record.
- All studies: store raw timing arrays at full precision, and attach the SPEC.md environment record.

## What remains open, and exactly what closes it

| Gap | Why it cannot be closed now | What closes it |
| --- | --- | --- |
| M3c not run | Needs the tuned tiled kernel and cuBLAS timed on the device of record | The M3c harness on BlackBox: the lab GEMM and the library call at sizes 512, 1024 and 2048, 10 timed launches each after warmup, ratio judged at 2048. |
| M3a verdict is fragile | The bimodal repetitions and an interval crossing the line can only be resolved with more data under controlled clocks | On BlackBox, on AC power with clocks locked if the driver allows (nvidia-smi --lock-gpu-clocks): repeat the frozen M3a protocol in three separate sessions, raw arrays and environment record stored, the run of record named in a dated amendment first. About a minute of GPU time. |
| M2 achieved occupancy is uncalibrated | No profiler is installed on BlackBox | Install Nsight Compute on BlackBox and collect sm__warps_active (achieved occupancy) for the six block sizes, compared with the twin-kernel figures in m2_results.json; rerun the sweep storing raw timing arrays. |
| No reference ceilings | The repo states no device peak, and none may be added without a source | Either the published memory bandwidth and FP32 rate for the RTX 5050 Laptop from an NVIDIA primary source, cited in the unit, or a measured ceiling on BlackBox (a bandwidth microbenchmark and an FMA throughput kernel). |
| Single-session statistics | Run-to-run and session-to-session variance needs repeat sessions on the device | Each of M1, M2, M3a and M3b repeated in at least three sessions on BlackBox (minutes of GPU time in total), reported as a spread across sessions; the frozen verdicts stay with the runs of record. |
| No concept answers or citations | SPEC.md requires each answer in original words, verified by the lab author against the named source, so writing them in a tooling change would bypass the closure rule | The named NVIDIA guide sections, read for each opened unit (U01, U02, U03, U06, U12), with answers and section references written into each STUDY.md. No compute needed. |
| Phase 5 units do not exist | The source curriculum has not published those chapters | Publication of Phase 5 by the source; units are then added, never invented in advance. |

## Threats to validity

- Construct: M1 counts one read and one write per element, and caches can make the effective figure differ from DRAM traffic. M3a measures the full launch path on this software stack, not the hardware launch alone. M2's achieved occupancy is a property of an instrumented twin kernel.
- Internal: clocks and power state changed within sessions (M3a's two groups; idle against warm executions). Nothing was locked.
- External: every number describes one consumer laptop GPU with one driver, torch 2.11.0 and Triton 3.9.0. The README already forbids reading them as datacenter numbers.
- Statistical: one session per study, 10 or 20 timed launches per cell. The bootstrap intervals capture within-session spread only.

## About the live dashboard

The site in site/ shows the design and the recorded runs. Counts and thresholds are parsed from STUDY-MAP.md, PREREGISTRATION.md, README.md, SPEC.md, units/ and this file at build time. Every measured figure is recomputed from the raw arrays in units/*/m*_results.json, and the build fails if it disagrees with the stored summary, the verdict rule or the RESULTS line. The verdict playground, the workload calculator and the stride visualizer run on numbers the viewer chooses and are labelled that way. Recorded values are marked as recorded.
