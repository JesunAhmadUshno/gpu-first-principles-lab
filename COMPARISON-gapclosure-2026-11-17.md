# Gap-closure sessions: gpu-first-principles-lab, 2026-11-17

Run of record: docs/decisions/0003-gap-closure-blackbox-sessions.md.
BlackBox, SM clocks locked at 2,000 MHz, AC power, environment of
record (b4 venv: torch 2.11.0+cu128, triton 3.9.0). Frozen files
untouched; no verdict re-issued. Outputs:
units/u06-hardware-hierarchy/m3a_results_gapclosure_2026-11-17_s1.json,
_s2.json, _s3.json, and
units/u03-inside-the-silicon/m2_results_gapclosure_2026-11-17.json.

## M3a launch overhead: the soft point is now firm

Committed record (10 repetitions of 1,000 launches): median 12.28
us, range 8.07 to 13.27, three repetitions below the 10 us line
and seven above, bootstrap interval of the median 8.17 to 12.52
(crossing the line), verdict REFUTED.

Fresh sessions (30 repetitions each, locked clocks):

| Session | Median us | Range us | Below 10 us |
| --- | --- | --- | --- |
| s1 | 11.9092 | 8.1622 to 12.7702 | 2 of 30 |
| s2 | 12.3810 | 9.1938 to 13.7091 | 1 of 30 |
| s3 | 11.7313 | 8.4940 to 14.4390 | 2 of 30 |

Pooled fresh (90 repetitions): median 11.9253 us, 5 of 90 below
the line, bootstrap 95 percent interval of the median 11.757 to
12.067 (10,000 resamples, seed 20261117), entirely above the
frozen 10 us line. All 100 repetitions on record (committed plus
fresh): median 11.94 us, 8 of 100 below the line. The committed
sample's bimodality largely disappears under locked clocks; what
remains is a small low tail. The REFUTED verdict now rests on 90
fresh repetitions whose interval clears the line.

## M2 occupancy sweep: reproduced, raw times now stored

The frozen sweep re-ran once in a run-copy whose only edit stores
the raw per-launch kernel times (20 per block size, now in the
output file). Theoretical occupancy identical at every block size
(50.0, 100.0, 100.0, 100.0, 100.0, 66.7 percent). Achieved
occupancy by runtime residency, committed -> fresh: 23.3 -> 20.2
(block 32), 72.0 -> 72.2 (64), 77.7 -> 74.0 (128), 74.7 -> 71.9
(256), 68.2 -> 66.6 (512), 46.2 -> 45.6 (1024). The script's own
verdict: PARTIALLY SUPPORTED, as committed. One change: the
fastest block moved from 64 (0.4515 ms committed) to 128 (0.4726
ms fresh; block 64 measured 0.5765 ms fresh). All absolute times
rose under the 2,000 MHz lock, as expected against a floating
original.

## Still blocked

The M2 profiler calibration (sm__warps_active through Nsight
Compute) did not run: Nsight Compute is not installed on BlackBox
and its installer needs an interactive elevated Windows session,
which the SSH window is not. Recorded in decision 0003.
