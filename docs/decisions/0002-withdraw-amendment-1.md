# 0002: Withdraw Amendment 1, which the runs never saw

Date: 2026-11-07. Status: accepted. Decided by: Jesun Ahmad Ushno.

## Context

Amendment 1 (a1bae32, dated 2026-11-07, before any run) pinned the M1
mapping, defined M2's grid, plateau onset and achieved occupancy
(Nsight Compute, else condition 1 fails), split M3a into throughput
and latency figures, and added bootstrap intervals and an environment
record. It was committed on the dashboard branch. The four runs
(M1, M2, M3a, M3b) were made on main from the original text and never
saw it.

## Decision

Withdraw it (d2b6013) so PREREGISTRATION.md matches the protocol the
runs actually followed. Its proposals are kept in REPORT.md as
candidate changes for M3c and any re-run, each to be adopted only by a
dated amendment before that run. The environment record stays in
SPEC.md for future runs.

## Consequences

The verdicts are judged against the text the runs followed. Two
choices the amendment would have fixed in advance were instead made
during the runs (M2's achieved-occupancy route, M3a's run of record);
both are disclosed in the unit files and in REPORT.md.
