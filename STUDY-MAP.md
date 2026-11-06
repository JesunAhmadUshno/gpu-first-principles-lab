# STUDY MAP

Units follow the parts of the source curriculum (BEFORE-GPU-ENGINEERING, MIT licence, cited in README.md), grouped for measurement. Chapter titles and ranges below are factual references to the source's structure; all study text in this repo is original.

Feed key for the last column:

- DIRECT: the unit's verdict is a required input to a cuda-kernels-lab v1.1 item.
- INDIRECT: the unit's verdict informs cuda-kernels-lab v1.1 work but does not gate it.
- FOUNDATION: the unit builds the base the later units stand on.

| Unit | Source part and chapter range | Concept gate or micro-study | Primary source for verification | Feeds P04 v1.1 |
| --- | --- | --- | --- | --- |
| U01 | The Architecture (ch 1 to 3): why CPUs cannot have 10,000 cores; why a GPU multiplies matrices faster; what parallelizable means | Concept gate: written self-test, no micro-study | NVIDIA CUDA C++ Programming Guide: Introduction and Programming Model | FOUNDATION |
| U02 | Feeding the Beast (ch 4 to 6): memory bandwidth; compute-bound vs memory-bound; the GPU memory hierarchy | Micro-study M1: coalesced vs strided global-memory bandwidth, measured | NVIDIA CUDA C++ Best Practices Guide: Memory Optimizations | INDIRECT |
| U03 | Inside the Silicon (ch 7 to 10): warps; branching and divergence; SIMT vs SIMD; occupancy | Micro-study M2: occupancy sweep on a simple kernel against the theory curve | NVIDIA CUDA C++ Programming Guide: Hardware Implementation; Best Practices Guide: Execution Configuration Optimizations | INDIRECT |
| U04 | Putting It Together (ch 11 to 15): why AI runs on GPUs; latency hiding; caches; the memory wall and HBM; designing an LLM training processor | Concept gate: written self-test | NVIDIA CUDA C++ Programming Guide: Hardware Implementation (memory hierarchy); NVIDIA architecture whitepapers | FOUNDATION |
| U05 | The Translation Barrier (ch 16 to 18): why C++ does not auto-compile to GPU; a kernel is not a function; why thread indexing exists | Concept gate: written self-test | NVIDIA CUDA C++ Programming Guide: Programming Model (kernels and thread hierarchy) | FOUNDATION |
| U06 | The Hardware Hierarchy (ch 19 to 22): thread blocks; shared memory; host visibility; kernel launch overhead | Micro-study M3a: kernel launch overhead, measured | NVIDIA CUDA C++ Programming Guide: Programming Model and Hardware Implementation | FOUNDATION |
| U07 | Synchronization and Hazards (ch 23 to 25): what syncthreads protects; race conditions; what makes CUDA code correct | Micro-study: a race-condition reproduction and its fix, verified by a runnable check | NVIDIA CUDA C++ Programming Guide: Programming Model (synchronization) | FOUNDATION |
| U08 | Scale and Performance (ch 26 to 32): context switching; kernel launch anatomy; asynchronous CUDA; coalesced vs strided access; slowdowns; the reduction tree | Micro-study: reduction tree implementations compared, measured | NVIDIA CUDA C++ Best Practices Guide: Memory Optimizations and Execution Configuration Optimizations | FOUNDATION |
| U09 | The Memory Wall (ch 33 to 35): idle ALUs; arithmetic intensity; roofline ceilings | Micro-study: roofline placement of every kernel built so far, from measured numbers | Williams, Waterman and Patterson, Roofline (Communications of the ACM, 2009); Best Practices Guide: performance metrics | INDIRECT |
| U10 | The Register Physics and Register Spilling (ch 36 to 42): register-occupancy tradeoff; what occupancy is; when higher occupancy hurts; spilling and its cliff; when spilling is acceptable | Micro-study: a register-spilling case induced, measured, and fixed | NVIDIA CUDA C++ Best Practices Guide: Execution Configuration Optimizations (registers and occupancy); Programming Guide: per-thread resources | INDIRECT |
| U11 | Global Memory and Coalescing (ch 43 to 45) | Applied study at depth: coalescing patterns revisited; verdict feeds the P04 coalescing upgrade | NVIDIA CUDA C++ Best Practices Guide: Memory Optimizations (global memory coalescing) | DIRECT |
| U12 | Shared Memory and Tiling (ch 46 to 48) | Micro-study M3b: naive vs tiled GEMM, measured | NVIDIA CUDA C++ Best Practices Guide: Memory Optimizations (shared memory and tiling) | DIRECT |
| U13 | GEMM and the Synthesis (ch 49 to 52) | Micro-study M3c: tuned tiled GEMM vs the library call, honestly reported | NVIDIA CUDA C++ Programming Guide: Hardware Implementation; cuBLAS documentation for the library call | DIRECT |
| U14 | The Measurement Mandate (ch 53 to 56) | Closing unit: the lab's own methods audit against PREREGISTRATION.md | NVIDIA CUDA C++ Best Practices Guide: performance measurement guidance; this repo's own protocols | FOUNDATION |
| Phase 5 | Source Phase 5, chapters not yet published | AWAITING SOURCE: units are added when the chapters land, never invented in advance | To be named when the source publishes | AWAITING SOURCE |

## How the feed works

A cuda-kernels-lab v1.1 item opens only when the unit that feeds it has a measured verdict in this repo. DIRECT units gate their items: U11 gates the coalescing upgrade, U12 and U13 gate the tiled GEMM progression. INDIRECT units (U02, U03, U09, U10) inform the occupancy tuning pass and the register-spilling case study without gating them on a single unit.
