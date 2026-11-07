# SPEC: gpu-first-principles-lab

## Scope

This lab builds first-principles fluency in GPU architecture: how work is parallelised, how data moves, where time actually goes, and how to prove each of those statements with a measurement.

In scope:

- Architecture concepts: parallelism, warps, SIMT, occupancy, the memory hierarchy, synchronisation, registers and spilling, coalescing, shared-memory tiling, GEMM structure, and measurement method.
- Small original implementations whose purpose is to make one concept measurable.
- Pre-registered micro-studies with frozen verdict rules.

Out of scope, explicitly:

- This lab is NOT a kernels-as-identity claim. It is the literacy layer under inference and training (Stage 2 of the career programme). Kernel engineering as an applied record lives in cuda-kernels-lab; this lab feeds it verdicts.
- No datacenter hardware claims. All measurement is on the consumer device named in README.md.
- No copied text or code from the study-map source or anywhere else. Chapter titles are cited as factual references in STUDY-MAP.md; chapter content is never reproduced.

## Unit structure

The lab has fourteen units, U01 to U14, defined in STUDY-MAP.md. Units are grouped for measurement, not only for reading order. A unit is one of three kinds:

- Concept gate: closed by a written self-test in the unit's own STUDY.md, every answer verified against a primary source.
- Micro-study: closed by a pre-registered measurement with a published verdict.
- Closing audit (U14 only): a methods audit of the lab itself.

## Per-unit deliverable contract

Each unit folder carries:

- STUDY.md: the concept restated in original words, the questions the unit answers, and the primary source each claim was verified against.
- Code: the original implementation or measurement harness for the unit, where the unit kind requires one.
- Preregistration: for micro-studies, the frozen protocol and verdict rule, committed before any run (the first set lives in PREREGISTRATION.md).
- Results: the measured table, with the device named on the table itself.
- Verdict: supported, partially supported, or refuted, against the frozen rule, with the reasoning stated.

A unit without all five parts for its kind is open, not done.

## Quality gates

- Every unit ships at least one runnable check (a test or a scripted verification) that passes.
- CI is green on Python 3.11 and 3.12 before a unit is called closed.
- Em dash count is 0 in every file in this repo.
- No result is written anywhere before its run exists. Scaffold text claims no results.
- Measurements name the device. A results table without a device name fails review.

## Environment record

A laptop GPU changes its clocks with temperature and power source, so every results table carries this record, captured in the same session as the run:

- Device: host name and GPU model, as in README.md.
- Driver version and CUDA toolkit version (nvidia-smi and nvcc --version).
- Power source: AC or battery, and the operating system power mode.
- GPU clocks and temperature at the start and end of the timed runs (nvidia-smi --query-gpu=clocks.sm,clocks.mem,temperature.gpu --format=csv).
- Persistence mode, and whether any other GPU process was running.
- Date, and the commit hash of the harness that produced the table.
