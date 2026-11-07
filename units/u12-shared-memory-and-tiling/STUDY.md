# U12: Shared memory and tiling

Source: Shared Memory and Tiling, chapters 46 to 48 (see STUDY-MAP.md).
Kind: micro-study M3b (protocol frozen in PREREGISTRATION.md). No results are claimed in this stub.

## Questions this unit must answer

- Why does a naive matrix multiply re-read the same data so many times, and what reuse does tiling create?
- What does a shared-memory tile cost (capacity, extra loads, synchronization) and what does it buy?
- How does tile size trade off reuse against occupancy and shared memory per block?
- Where does the remaining gap to the library call live after tiling, in mechanism rather than in folklore?

## Closure rule

The concept answers are written in original words and verified against the primary source named for U12 in STUDY-MAP.md. The unit closes only with the M3b measured verdict published under its frozen rule.

## M3b measured results (2026-11-07)

Run on BlackBox, NVIDIA GeForce RTX 5050 Laptop GPU (8 GB),
with the protocol frozen in PREREGISTRATION.md: C = A times
B in float32 at sizes 512, 1024, and 2048, 2 warmup launches
then 10 timed launches per implementation per size, CUDA
events around the kernel only. Inputs were generated once
per size on the host from a fixed seed and shared by both
implementations and the host reference. Producing code:
m3b_gemm.py in this folder. Raw record: m3b_results.json in
this folder.

The two implementations, in the lab's Triton vehicle. Naive:
one output element per thread; each program is one warp
producing 32 consecutive outputs in a row, and every output
is a full length-N dot product loaded element by element
from global memory (compiled kernel: 78 registers per
thread, 0 shared bytes per block). Tiled: 64 by 64 output
tiles with K marched in steps of 32, tile sizes fixed in
code before the run, tiles staged for the dot product,
which the compiler routes through shared memory (compiled
kernel: 96 registers per thread, 32,768 shared bytes per
block). The dot product ran at ieee input precision so the
comparison stays in honest float32.

Correctness, checked before any timing counted: full check
at size 512 against the host reference, max absolute error
9.9e-05 for both implementations (the frozen bar is 1e-2);
fixed seeded samples of 4,096 elements at 1024 and 2048,
max absolute error at most 2.9e-04.

| Size | Naive median ms (IQR) | Naive GFLOP/s | Tiled median ms (IQR) | Tiled GFLOP/s | Speedup |
| --- | --- | --- | --- | --- | --- |
| 512 | 0.3181 (0.3171 to 0.3194) | 843.8 | 0.0584 (0.0578 to 0.0611) | 4,596.5 | 5.45x |
| 1024 | 2.3973 (2.3928 to 2.3997) | 895.8 | 0.2782 (0.2764 to 0.2850) | 7,718.5 | 8.62x |
| 2048 | 19.0402 (19.0242 to 19.0752) | 902.3 | 1.9895 (1.9885 to 1.9919) | 8,635.5 | 9.57x |

Verdict under the frozen rule: SUPPORTED. At the verdict
size 1024 the tiled kernel's median time is 0.2782 ms
against the naive kernel's 2.3973 ms, a speedup of 8.62x,
far past the 1.5x the hypothesis required. The naive kernel
is strikingly flat at about 900 GFLOP/s at every size: with
no reuse, its ceiling is set by how fast global memory can
be re-read, and making the matrices bigger does not change
the rate. The tiled kernel climbs from 4,596.5 to 8,635.5
GFLOP/s as size grows, because larger matrices give the
tiles more work to amortise their staging cost over. Where
the remaining gap to the library call lives is the M3c
question, and it is measured there, not guessed here. The
micro-study half of this unit is closed on this verdict;
the concept answers above remain to be written before the
unit itself closes.
