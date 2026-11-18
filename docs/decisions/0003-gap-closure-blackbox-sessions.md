# 0003: Gap-closure BlackBox sessions for M3a and M2

Date: 2026-11-17. Status: accepted. Decided by: Jesun Ahmad Ushno.

## Context

The gap register (2026-11-17) records two deductions against this
lab that only the machine of record can close. For M3a, the
REFUTED verdict is fragile: the ten frozen repetitions are
bimodal (three per-launch figures below the 10 microsecond line,
seven above) and the bootstrap interval of the median (8.17 to
12.52 microseconds) crosses the line. For M2, achieved occupancy
rests on an instrumented twin kernel because no profiler
(Nsight Compute) is installed on BlackBox, and the sweep stores
medians and quartiles only, no raw arrays and no interval.

## Decision

Two runs are registered here before either runs, both on
BlackBox on 2026-11-17, on AC power, with SM clocks locked at
2,000 MHz (nvidia-smi -lgc 2000,2000; the driver accepted the
lock in this session), in a run-copy of the GitHub clone at
C:\Users\Jesun\gap-closure-2026-11-17\gpu-first-principles-lab,
with the environment of record (Python 3.14.7, torch
2.11.0+cu128, triton 3.9.0, driver 577.05).

M3a: three extra sessions of the frozen measurement (1,000
consecutive launches of the empty kernel, timed as one sequence
with CUDA events, divided by 1,000), each session at 30
repetitions instead of the frozen 10, run back to back in one
sitting. The only change to the study module
(units/u06-hardware-hierarchy/m3a_launch_overhead.py) is the
repetition count, set in the run-copy. Raw per-repetition arrays
are stored. Outputs are filed as NEW files
units/u06-hardware-hierarchy/m3a_results_gapclosure_2026-11-17_s1.json,
_s2.json and _s3.json beside the frozen m3a_results.json, which
is not edited. The frozen verdict (REFUTED, median 12.28
microseconds) is not re-issued; the sessions price the
bimodality.

M2: the profiler calibration cannot run in this window. Nsight
Compute is not installed on BlackBox (verified 2026-11-17: no
ncu.exe anywhere on the machine) and its installer requires an
interactive elevated Windows session, which the SSH window is
not. The sm__warps_active item stays open. In its place, the
frozen sweep (units/u03-inside-the-silicon/m2_occupancy_sweep.py)
is re-run once in the run-copy with one stated change: the raw
per-launch kernel times are stored alongside the medians and
quartiles, closing the "no raw arrays" deduction for the timing
layer. Output is filed as the NEW file
units/u03-inside-the-silicon/m2_results_gapclosure_2026-11-17.json;
the frozen m2_results.json is not edited and the verdict
(PARTIALLY SUPPORTED) is not re-issued.

An environment record (device, driver, locked clocks, power
source, torch and triton versions) is attached to every output
file from these sessions.

## Consequences

The M3a record gains 90 fresh repetitions across three
same-sitting sessions at locked clocks, enough to say whether
the bimodality survives clock control. The M2 timing layer
gains raw arrays. The M2 profiler calibration remains an open
item that needs an interactive install of Nsight Compute on
BlackBox by the lab owner.
