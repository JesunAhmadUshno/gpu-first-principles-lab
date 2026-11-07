# U02: Feeding the beast: bandwidth, bounds, and the hierarchy

Source: Feeding the Beast, chapters 4 to 6 (see STUDY-MAP.md).
Kind: micro-study M1 (protocol frozen in PREREGISTRATION.md). No results are claimed in this stub.

## Questions this unit must answer

- Why does GPU performance so often hinge on memory bandwidth rather than on arithmetic throughput?
- What distinguishes a compute-bound kernel from a memory-bound kernel, and how is the distinction measured rather than guessed?
- What are the levels of the GPU memory hierarchy, and what are the rough latency and bandwidth relationships between them?
- For a given kernel, which level of the hierarchy is the first place to look for the bottleneck, and why?

## Closure rule

The concept answers are written in original words and verified against the primary source named for U02 in STUDY-MAP.md. The unit closes only with the M1 measured verdict published under its frozen rule.

## M1 measured results (2026-11-07)

Run on BlackBox, NVIDIA GeForce RTX 5050 Laptop GPU (8 GB),
with the protocol frozen in PREREGISTRATION.md: float32 arrays
of 2^24 elements, copy kernel out[i] = in[f(i)] in two Triton
variants, 3 warmup launches, 20 timed launches per variant,
CUDA events around the kernel only, every output element
checked against the expected value on the host before timing
counted (both variants correct). Producing code:
m1_copy_bandwidth.py in this folder. Raw record:
m1_results.json in this folder.

| Variant | Median bandwidth GB/s | IQR GB/s |
| --- | --- | --- |
| A: f(i) = i (coalesced) | 305.2 | 293.4 to 312.1 |
| B: f(i) = (i mod (N/32)) * 32 + i / (N/32) (stride 32) | 72.3 | 71.9 to 72.5 |

Ratio of medians: 4.22x. Verdict under the frozen rule:
PARTIALLY SUPPORTED (supported needs 5x; the 2x to 5x band is
partial). The hypothesis overstated the penalty on this device:
the write side stays coalesced in both variants, and the
measured strided penalty lands at about four times, not five
or more. The micro-study half of this unit is closed on this
verdict; the concept answers above remain to be written before
the unit itself closes.
