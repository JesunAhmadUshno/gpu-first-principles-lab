# PREREGISTRATION

Frozen before any run. A protocol in this file may be amended only by a dated amendment entry that states the reason; verdict rules never change after the first run of their study.

Device for every study below: BlackBox, NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM. Timing uses CUDA events around the timed region unless the protocol says otherwise. Warmup runs are never timed. Every results table names the device.

## M1: Coalesced vs strided global-memory bandwidth (Unit U02)

Hypothesis: for a simple copy kernel over global memory, fully coalesced access (stride 1) reaches at least 5 times the effective bandwidth of maximally strided access (stride 32) on this device, because strided access wastes most of every memory transaction.

Protocol:

- Kernel: float copy, out[i] = in[f(i)], in two compiled variants. Variant A: f(i) = i (coalesced). Variant B: f(i) = (i mod (N/32)) * 32 + i / (N/32) style strided indexing with stride 32, fixed in code before the run and recorded in the unit folder.
- Data: float32 arrays of 2^24 elements (64 MiB per array), resident on the device.
- Runs: 3 warmup launches, then 20 timed launches per variant. Timed region: the kernel only, by CUDA events. Host transfer time is excluded.
- Metric: effective bandwidth in GB/s, bytes moved (read plus write) divided by kernel time; report median and interquartile range per variant.
- Correctness: every output element checked against the expected value on the host before timing counts.

Frozen verdict rule: hypothesis supported if the median coalesced bandwidth is at least 5x the median strided bandwidth; partially supported if the ratio is at least 2x and below 5x; refuted if below 2x.

RESULTS (2026-11-07, BlackBox, RTX 5050 Laptop GPU): coalesced median 305.2 GB/s, strided median 72.3 GB/s, ratio 4.22x. Verdict: PARTIALLY SUPPORTED. Full record: units/u02-feeding-the-beast/STUDY.md and m1_results.json.

## M2: Occupancy sweep against the theory curve (Unit U03)

Hypothesis: for a simple arithmetic kernel, achieved occupancy as a function of block size tracks the theoretical occupancy predicted by the CUDA occupancy calculation (registers, shared memory, and block limits), and the best measured performance sits on the plateau the theory curve predicts, not necessarily at 100 percent occupancy.

Protocol:

- Kernel: a simple elementwise kernel over 2^24 float32 elements, low register use, no shared memory, fixed at study time and recorded in the unit folder.
- Sweep: block sizes 32, 64, 128, 256, 512, 1024 threads. Grid sized to fill the device at each block size.
- Per block size: theoretical occupancy from the CUDA occupancy API, achieved occupancy from the profiler or runtime measurement where available, and kernel time from CUDA events, median of 20 timed launches after 3 warmups.
- Correctness: output verified on the host at each block size before timing counts.

Frozen verdict rule: hypothesis supported if achieved occupancy is within 10 percentage points of theoretical occupancy at the best block size, and the measured fastest block size lies within one sweep step of the onset of the theoretical plateau; partially supported if only one of the two conditions holds; refuted if neither holds.

RESULTS (2026-11-07, BlackBox, RTX 5050 Laptop GPU): theoretical occupancy 50.0% at block 32, 100.0% at blocks 64 to 512, 66.7% at 1024 (CUDA occupancy API); achieved occupancy by runtime residency measurement 23.3%, 72.0%, 77.7%, 74.7%, 68.2%, 46.2% across the same sweep; fastest block size 64 (median 0.4515 ms), exactly the onset of the theoretical plateau, but achieved occupancy there is 28.0 percentage points below theoretical, outside the 10 point band. Verdict: PARTIALLY SUPPORTED. Full record: units/u03-inside-the-silicon/STUDY.md and m2_results.json.

## M3: The GEMM line (Units U06, U12, U13)

One line of three studies that ends at a tuned matrix multiply compared against the library call.

### M3a: Kernel launch overhead (Unit U06)

Hypothesis: the median launch overhead of an empty kernel on this device is below 10 microseconds per launch.

Protocol:

- Kernel: an empty kernel (immediate return).
- Method: enqueue 1000 consecutive launches, time the whole sequence with CUDA events on the stream, divide by 1000. Repeat the whole measurement 10 times; report the median per-launch figure and the spread.
- No data movement; no correctness output.

Frozen verdict rule: supported if the median per-launch overhead is below 10 microseconds; refuted otherwise. The measured figure is reported either way.

RESULTS (2026-11-07, BlackBox, RTX 5050 Laptop GPU): median per-launch overhead 12.28 microseconds across 10 repetitions of 1000 launches (spread 8.07 to 13.27 microseconds), above the frozen 10 microsecond line; a first execution from the idle power state gave a median of 14.87 microseconds and the same verdict. Verdict: REFUTED. Full record: units/u06-hardware-hierarchy/STUDY.md and m3a_results.json.

### M3b: Naive vs tiled GEMM (Unit U12)

Hypothesis: a shared-memory tiled GEMM is at least 1.5 times faster than a naive one-thread-per-output GEMM at matrix size 1024 on this device.

Protocol:

- Operation: C = A times B, float32, square matrices of size 512, 1024, and 2048.
- Implementations: naive kernel (one thread per output element, global memory only) and tiled kernel (shared-memory tiles, tile size recorded in code before the run).
- Runs: 2 warmup launches, then 10 timed launches per implementation per size, CUDA events around the kernel only.
- Correctness: each implementation's output checked against a host reference with max absolute error below 1e-2 at size 512 before any timing counts; sizes 1024 and 2048 spot-checked on a fixed sample of elements.
- Metric: kernel time and derived GFLOP/s (2 times N cubed divided by time).

Frozen verdict rule: hypothesis supported if the tiled kernel's median time at 1024 is at most two thirds of the naive kernel's median time (a speedup of at least 1.5x); partially supported if the speedup is above 1.1x and below 1.5x; refuted at or below 1.1x. All three sizes are reported regardless of the verdict.

RESULTS (2026-11-07, BlackBox, RTX 5050 Laptop GPU): naive median times 0.3181 ms, 2.3973 ms, 19.0402 ms at sizes 512, 1024, 2048 (about 900 GFLOP/s at every size); tiled median times 0.0584 ms, 0.2782 ms, 1.9895 ms (4,596.5, 7,718.5, 8,635.5 GFLOP/s); speedup at the verdict size 1024 is 8.62x. Correctness passed everywhere (max abs error 9.9e-05 on the full size 512 check, at most 2.9e-04 on the spot samples). Verdict: SUPPORTED. Full record: units/u12-shared-memory-and-tiling/STUDY.md and m3b_results.json.

### M3c: Tuned tiled GEMM vs the library call (Unit U13)

Hypothesis: after tuning (larger tiles plus register-level reuse, exact configuration recorded in code before the run), the lab's GEMM reaches at least 25 percent of the throughput of the cuBLAS SGEMM call on the same inputs at size 2048 on this device.

Protocol:

- Operation and sizes as in M3b, with size 2048 as the verdict size and 512 and 1024 reported alongside.
- Implementations: the tuned lab kernel, and cuBLAS SGEMM through its standard handle-based call on identical inputs.
- Runs: 2 warmup launches, then 10 timed launches per implementation per size, CUDA events around the kernel or library call only. Handle creation and destruction are excluded.
- Correctness: as in M3b, against the same host reference and tolerance.
- Reporting: the ratio of tuned-kernel GFLOP/s to cuBLAS GFLOP/s is reported as measured at every size. No wording may present the lab kernel as competitive with the library beyond what the ratio states.

Frozen verdict rule: supported if the ratio at 2048 is at least 0.25; partially supported if at least 0.10 and below 0.25; refuted below 0.10. The gap is published either way.

RESULTS: NOT YET RUN

## Amendments

### Amendment 1, 2026-11-07 (before any run)

Reason: a review of this file found three places where the protocol left a choice to be made after the data could be seen. No study has been run, no measurement code exists, and no verdict rule is changed by this entry. Every threshold above stands as written.

- M1 strided mapping, pinned. Variant B uses exactly f(i) = (i mod (N/32)) * 32 + floor(i / (N/32)) with N = 2^24. This is a transpose of a 32 by N/32 index grid, so it is a permutation of [0, N) and every output element has exactly one expected input, which keeps the host correctness check well defined. tests/test_preregistration.py checks the bijection on a small N.
- M2 grid sizing, defined. One element per thread; the grid is ceil(2^24 / block size) blocks at every block size.
- M2 plateau onset, defined. The onset of the theoretical plateau is the smallest swept block size whose theoretical occupancy equals the maximum theoretical occupancy over the whole sweep. "Within one sweep step" means the fastest measured block size is the onset or an adjacent entry in the sweep list.
- M2 achieved occupancy, defined. Achieved occupancy is the profiler's achieved-occupancy metric for the kernel (Nsight Compute, active warps as a percentage of the per-SM maximum). If that metric cannot be collected on this device, the first condition of the M2 rule is scored as not holding, so the verdict can be at most partially supported.
- M3a construct, clarified. Back-to-back launches timed as one sequence measure the per-launch cost under pipelined enqueue (launch throughput), not the latency of one isolated launch. The verdict rule applies to that throughput figure and the results table will name it so. A secondary figure, 1000 launches each followed by a stream synchronize and timed on the host clock, is reported alongside as single-launch latency. It does not enter the verdict.
- Uncertainty reporting, added. Alongside every median, each results table reports the interquartile range and a percentile bootstrap 95 percent interval of the median (10,000 resamples, seed recorded). These are descriptive; the frozen rules still read the medians.
- Environment, added. Every results table carries the environment record defined in SPEC.md (driver, CUDA version, clocks, power source, temperature).
