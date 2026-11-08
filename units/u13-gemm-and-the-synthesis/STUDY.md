# U13: GEMM and the synthesis

Source: GEMM and the Synthesis, chapters 49 to 52 (see STUDY-MAP.md).
Kind: micro-study M3c (protocol frozen in PREREGISTRATION.md). No results are claimed in this stub.

## Questions this unit must answer

- After tuning (larger tiles plus register-level reuse), how much of the library call's throughput can this lab's own GEMM reach on this device, stated as a ratio and nothing more?
- Where does the remaining gap to cuBLAS live, in mechanism: data staging, pipeline depth, instruction mix, or tile shape?
- How does the ratio move across sizes 512, 1024, and 2048, and what does that movement say about fixed costs in the lab kernel?
- What does the tuned kernel's compiled footprint (registers per thread, shared memory per block) say about the occupancy its tile shape leaves behind?

## Closure rule

The concept answers are written in original words and verified against the primary sources named for U13 in STUDY-MAP.md (the NVIDIA CUDA C++ Programming Guide, Hardware Implementation, and the cuBLAS documentation for the library call). The unit closes only with the M3c measured verdict published under its frozen rule.

## M3c measured results (2026-11-08)

Run on BlackBox, NVIDIA GeForce RTX 5050 Laptop GPU (8 GB),
with the protocol frozen in PREREGISTRATION.md: C = A times
B in float32 at sizes 512, 1024, and 2048, 2048 the verdict
size, 2 warmup launches then 10 timed launches per
implementation per size, CUDA events around the kernel or
the library call only. Inputs were generated once per size
on the host from a fixed seed and shared by both
implementations and the host reference. Producing code:
m3c_tuned_gemm.py in this folder. Raw record:
m3c_results.json in this folder.

The tuned kernel, configuration recorded in code before the
run: 128 by 128 output tiles (four times the M3b tile),
K marched in steps of 32, the accumulator tile held in
registers across the whole K march so each staged element
is reused across 128 outputs, grouped program order
(GROUP_M 8), 8 warps, 3 pipeline stages, dot product at
ieee input precision. The compiled kernel reports 216
registers per thread and 65,536 shared bytes per block.
The library arm is cuBLAS SGEMM reached through PyTorch's
matmul dispatch on the same device tensors, with TF32
explicitly disabled so the call is the float32 SGEMM the
protocol names; handle creation falls in the warmup
launches, outside the timed region.

Correctness, checked before any timing counted: full check
at size 512 against the host reference, max absolute error
9.9e-05 (tuned) and 5.7e-05 (cuBLAS) against the frozen bar
of 1e-2; fixed seeded samples of 4,096 elements at 1024 and
2048, max absolute error at most 2.9e-04 for either
implementation.

| Size | Tuned median ms (IQR) | Tuned GFLOP/s | cuBLAS median ms (IQR) | cuBLAS GFLOP/s | Ratio |
| --- | --- | --- | --- | --- | --- |
| 512 | 0.0720 (0.0605 to 0.0870) | 3,729.1 | 0.0580 (0.0575 to 0.0639) | 4,625.6 | 0.806 |
| 1024 | 0.3311 (0.3307 to 0.3322) | 6,486.1 | 0.2869 (0.2853 to 0.2872) | 7,484.8 | 0.867 |
| 2048 | 1.9945 (1.9859 to 1.9976) | 8,613.6 | 1.9750 (1.9662 to 2.0315) | 8,698.8 | 0.990 |

Disclosure: the pre-run snapshot records the device at its
idle clocks (22 MHz SM, 405 MHz memory), and the tuned
kernel's size 512 timings carry a wide interquartile range
consistent with clocks ramping during the smallest size.
The medians are reported as measured, and the verdict size
timings are tight for both implementations.

One comparison this lab owes its own record: the tuning did
not improve on the M3b tiled kernel's figures at 1024 and
2048 (7,718.5 and 8,635.5 GFLOP/s there, against 6,486.1
and 8,613.6 here). The larger tiles trade occupancy for
reuse, and on this device the trade loses at 1024 and nets
out at 2048. The M3c hypothesis asks only about the library
ratio, and that is what the verdict judges.

Verdict under the frozen rule: SUPPORTED. At the verdict
size 2048 the tuned kernel's median throughput is 8,613.6
GFLOP/s against the library call's 8,698.8 GFLOP/s, a ratio
of 0.990, far past the 0.25 the hypothesis required. The
ratio is the whole claim: on this device, at this size, the
lab's tuned kernel lands at 99 percent of the cuBLAS SGEMM
figure, with the gap that remains concentrated at the
smaller sizes (0.806 at 512, 0.867 at 1024), where fixed
staging and launch costs weigh more. No wording anywhere in
this repo presents the lab kernel as competitive with the
library beyond what these ratios state. The micro-study
half of this unit is closed on this verdict, and with it
the M3 line: launch overhead (M3a), tiling (M3b), and the
tuned comparison against the library (M3c) are all
measured. The concept answers above remain to be written
before the unit itself closes.
