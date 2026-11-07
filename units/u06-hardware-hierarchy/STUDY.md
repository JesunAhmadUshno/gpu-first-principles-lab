# U06: The hardware hierarchy: blocks, shared memory, host visibility, launch overhead

Source: The Hardware Hierarchy, chapters 19 to 22 (see STUDY-MAP.md).
Kind: micro-study M3a (protocol frozen in PREREGISTRATION.md). No results are claimed in this stub.

## Questions this unit must answer

- What is a thread block, which resources does a block hold, and what does the block boundary make possible and impossible?
- What is shared memory, who can see it, how long does it live, and why does its scope make it fast?
- Which device memory can the host see or reach, and through which mechanisms?
- What does a kernel launch consist of, host side and device side, and where does the launch overhead go?

## Closure rule

The concept answers are written in original words and verified against the primary source named for U06 in STUDY-MAP.md. The unit closes only with the M3a measured verdict published under its frozen rule.

## M3a measured results (2026-11-07)

Run on BlackBox, NVIDIA GeForce RTX 5050 Laptop GPU (8 GB),
with the protocol frozen in PREREGISTRATION.md: an empty
kernel (immediate return), 1000 consecutive launches timed as
one sequence with CUDA events on the stream, the total
divided by 1000, repeated 10 times. A few warmup launches
preceded the repetitions and were never timed. Producing
code: m3a_launch_overhead.py in this folder. Raw record:
m3a_results.json in this folder.

What the events measure here: an empty kernel drains faster
than the host can enqueue the next launch, so the stream
elapsed time is the launch path cost per launch on this
device and stack, host dispatch through the Python and
Triton launch path included. That is the overhead a program
on this machine actually pays per kernel launch, and it is
the quantity the frozen rule judges.

| Statistic across the 10 repetitions | Per-launch overhead |
| --- | --- |
| Median | 12.28 microseconds |
| First quartile | 9.17 microseconds |
| Third quartile | 12.39 microseconds |
| Minimum repetition | 8.07 microseconds |
| Maximum repetition | 13.27 microseconds |

The repetitions are bimodal: the first three sit near
8.1 microseconds and the remaining seven near 12.3
microseconds, as if the machine settled into a different
power behaviour partway through. The frozen rule judges the
median, which is 12.28 microseconds either way the spread is
read.

Disclosure of the first execution: the protocol was first
run with the machine fully idle (its own pre-run snapshot
records 22 MHz SM and 405 MHz memory clocks, the idle power
state). That execution gave a median of 14.87 microseconds
(spread 10.39 to 16.22). The result of record above is a
second execution of the identical protocol, run immediately
after a 10 second GPU warm load, the normal working state
every other study in this lab was measured in. The verdict
is the same under both executions.

Verdict under the frozen rule: REFUTED. The hypothesis
placed the median launch overhead below 10 microseconds;
the measured median is 12.28 microseconds. On this device
and stack, a program pays roughly twelve microseconds of
launch path for every kernel it starts, so designs that
launch many small kernels pay for them in launch overhead
alone, before any kernel does work. The micro-study half of
this unit is closed on this verdict; the concept answers
above remain to be written before the unit itself closes.
