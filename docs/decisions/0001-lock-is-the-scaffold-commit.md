# 0001: The lock is the scaffold commit; only RESULTS lines change

Date: 2026-11-08 (records a choice made 2026-11-06). Status: accepted.
Decided by: Jesun Ahmad Ushno.

## Context

PREREGISTRATION.md was committed in a04d4ac (2026-11-06) with every
hypothesis, protocol and frozen verdict rule, and every RESULTS line
reading NOT YET RUN. No harness code or measurement existed then; the
first harness and result arrived together in a13cf03 (2026-11-07). The
file's own rule is that RESULTS lines are filled in as studies run and
verdict rules never change after the first run. The portfolio standard
asks for the locked proposal to be tagged and pinned by SHA-256.

## Decision

Tag a04d4ac as proposal-v1. Pin PREREGISTRATION.md as committed there
(SHA-256 dae1d805...). tests/test_layout.py rewrites every recorded
RESULTS line back to "RESULTS: NOT YET RUN" and requires the result to
hash to the lock, so a RESULTS line may change and nothing else may.
The file keeps its name (locked names win).

## Consequences

Any change to a hypothesis, protocol or rule fails CI. A future
amendment goes in a new dated entry under a new tag, written before
the runs it governs. The harness code was committed with its results,
so the lock covers the plan, not the code (REPORT.md, threats).
