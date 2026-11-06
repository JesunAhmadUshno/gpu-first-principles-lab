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

RESULTS: NOT YET RUN

## M2: Occupancy sweep against the theory curve (Unit U03)

Hypothesis: for a simple arithmetic kernel, achieved occupancy as a function of block size tracks the theoretical occupancy predicted by the CUDA occupancy calculation (registers, shared memory, and block limits), and the best measured performance sits on the plateau the theory curve predicts, not necessarily at 100 percent occupancy.

Protocol:

- Kernel: a simple elementwise kernel over 2^24 float32 elements, low register use, no shared memory, fixed at study time and recorded in the unit folder.
- Sweep: block sizes 32, 64, 128, 256, 512, 1024 threads. Grid sized to fill the device at each block size.
- Per block size: theoretical occupancy from the CUDA occupancy API, achieved occupancy from the profiler or runtime measurement where available, and kernel time from CUDA events, median of 20 timed launches after 3 warmups.
- Correctness: output verified on the host at each block size before timing counts.

Frozen verdict rule: hypothesis supported if achieved occupancy is within 10 percentage points of theoretical occupancy at the best block size, and the measured fastest block size lies within one sweep step of the onset of the theoretical plateau; partially supported if only one of the two conditions holds; refuted if neither holds.

RESULTS: NOT YET RUN

## M3: The GEMM line (Units U06, U12, U13)

One line of three studies that ends at a tuned matrix multiply compared against the library call.

### M3a: Kernel launch overhead (Unit U06)

Hypothesis: the median launch overhead of an empty kernel on this device is below 10 microseconds per launch.

Protocol:

- Kernel: an empty kernel (immediate return).
- Method: enqueue 1000 consecutive launches, time the whole sequence with CUDA events on the stream, divide by 1000. Repeat the whole measurement 10 times; report the median per-launch figure and the spread.
- No data movement; no correctness output.

Frozen verdict rule: supported if the median per-launch overhead is below 10 microseconds; refuted otherwise. The measured figure is reported either way.

RESULTS: NOT YET RUN

### M3b: Naive vs tiled GEMM (Unit U12)

Hypothesis: a shared-memory tiled GEMM is at least 1.5 times faster than a naive one-thread-per-output GEMM at matrix size 1024 on this device.

Protocol:

- Operation: C = A times B, float32, square matrices of size 512, 1024, and 2048.
- Implementations: naive kernel (one thread per output element, global memory only) and tiled kernel (shared-memory tiles, tile size recorded in code before the run).
- Runs: 2 warmup launches, then 10 timed launches per implementation per size, CUDA events around the kernel only.
- Correctness: each implementation's output checked against a host reference with max absolute error below 1e-2 at size 512 before any timing counts; sizes 1024 and 2048 spot-checked on a fixed sample of elements.
- Metric: kernel time and derived GFLOP/s (2 times N cubed divided by time).

Frozen verdict rule: hypothesis supported if the tiled kernel's median time at 1024 is at most two thirds of the naive kernel's median time (a speedup of at least 1.5x); partially supported if the speedup is above 1.1x and below 1.5x; refuted at or below 1.1x. All three sizes are reported regardless of the verdict.

RESULTS: NOT YET RUN

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
