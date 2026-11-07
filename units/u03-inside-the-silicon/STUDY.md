# U03: Inside the silicon: warps, divergence, SIMT, occupancy

Source: Inside the Silicon, chapters 7 to 10 (see STUDY-MAP.md).
Kind: micro-study M2 (protocol frozen in PREREGISTRATION.md). No results are claimed in this stub.

## Questions this unit must answer

- What problem does the warp solve, and what does warp-level execution imply for how code should be shaped?
- Why is branching expensive on a GPU, and what actually happens inside a warp when threads diverge?
- How does SIMT differ from SIMD, in mechanism and in consequence for the programmer?
- What is occupancy, which resources limit it, and why is maximum occupancy not always the fastest configuration?

## Closure rule

The concept answers are written in original words and verified against the primary sources named for U03 in STUDY-MAP.md. The unit closes only with the M2 measured verdict published under its frozen rule.

## M2 measured results (2026-11-07)

Run on BlackBox, NVIDIA GeForce RTX 5050 Laptop GPU (8 GB),
with the protocol frozen in PREREGISTRATION.md: elementwise
kernel out[i] = x[i] * x[i] + x[i] over 2^24 float32 elements,
one element per thread, 10 registers per thread, no spills,
no shared memory, grid sized to cover the array at each block
size. Theoretical occupancy comes from the CUDA occupancy API
(driver call cuOccupancyMaxActiveBlocksPerMultiprocessor on
the compiled kernel). No profiler is installed on this
machine, so achieved occupancy uses the protocol's runtime
measurement route: an instrumented twin kernel records
globaltimer start and end plus the SM id once per block, and
the time-weighted mean resident warps per SM over the kernel
window is divided by the device maximum of 48 warps per SM
(median of 5 instrumented launches). Kernel time is the
median of 20 timed launches after 3 warmups, CUDA events
around the kernel only. Output was verified on the host at
every block size before timing counted (max abs error
3.8e-06 against the host reference). Producing code:
m2_occupancy_sweep.py in this folder. Raw record:
m2_results.json in this folder.

Device limits that shape the theory curve on this device:
20 SMs, 1536 threads per SM, 48 warps per SM, and a maximum
of 24 resident blocks per SM (device attribute), which caps
32-thread blocks at 24 x 32 = 768 threads, 50.0 percent,
before registers or threads bind.

| Block size | API blocks per SM | Theoretical occupancy | Achieved occupancy | Median time ms (IQR) |
| --- | --- | --- | --- | --- |
| 32 | 24 | 50.0% | 23.3% | 0.9853 (0.9842 to 0.9905) |
| 64 | 24 | 100.0% | 72.0% | 0.4515 (0.4504 to 0.4522) |
| 128 | 12 | 100.0% | 77.7% | 0.4532 (0.4494 to 0.4584) |
| 256 | 6 | 100.0% | 74.7% | 0.4563 (0.4543 to 0.4595) |
| 512 | 3 | 100.0% | 68.2% | 0.4722 (0.4704 to 0.4740) |
| 1024 | 1 | 66.7% | 46.2% | 0.6686 (0.6678 to 0.6722) |

Verdict under the frozen rule: PARTIALLY SUPPORTED. The
second condition holds: the fastest block size is 64
(median 0.4515 ms), exactly the onset of the theoretical
plateau, and every plateau size (64 to 512) sits within
about 5 percent of the best time while both off-plateau
sizes are clearly slower (32 threads: 2.2x slower; 1024
threads: 1.5x slower, where only one block fits under the
1536 thread SM limit). The first condition fails: at the
fastest block size, achieved occupancy is 72.0 percent
against a theoretical 100.0 percent, a gap of 28.0
percentage points, well outside the 10 point band. A repeat
exploratory run swapped the fastest size between 64 and 128
(they differ by about 0.002 ms) and produced the same
verdict.

Why achieved occupancy runs low here: each block holds one
element per thread, so a block lives for well under a
microsecond of work at the small sizes, and block launch
and retire gaps take a large share of the window. A control
run with the same ruler on a spin kernel (long-lived blocks,
no memory traffic) read 92.0 percent at theoretical
100.0 percent, so the ruler itself carries only a small
downward bias; the streaming kernel's 68 to 78 percent on
the plateau is a property of the workload, not of the
measurement. The lesson the numbers support: the theory
curve predicts where the fast configurations live, but for
very short-lived blocks the SMs do not stay as full as the
static calculation promises. The micro-study half of this
unit is closed on this verdict; the concept answers above
remain to be written before the unit itself closes.
