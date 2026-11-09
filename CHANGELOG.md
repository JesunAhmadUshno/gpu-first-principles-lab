# Changelog

All notable changes to this project. Format: Keep a Changelog 1.1.
Versions follow Semantic Versioning; no release is tagged yet.

## [Unreleased]

### Changed
- 2026-11-08: Restructured to the portfolio standard v2. README opens
  with the abstract (question, headline with intervals, field, job
  family, verdict: Functional), reproduce commands, lifecycle and a
  layout table. docs/research-review.md becomes REPORT.md, with every
  hypothesis scored, the field profile checked and the letter-grade
  column removed (grades are internal). The scaffold commit a04d4ac is
  tagged proposal-v1, and a test pins PREREGISTRATION.md to its locked
  SHA-256 with only RESULTS lines free to change (decision 0001). The
  dashboard reads REPORT.md and shows the README verdict. CI runs on
  Python 3.11 and 3.12 with read-only permissions, regenerates the
  bootstrap intervals and builds the site; CodeQL and Dependabot
  added; CITATION.cff and SECURITY.md added.

### Added
- 2026-11-07: Seeded bootstrap 95 percent intervals for the M1 ratio,
  the M3a median and the M3b speedup (analysis/), with a test that the
  committed output reproduces. Research review of the four runs.
- 2026-11-07: M3b measured (naive vs tiled GEMM): SUPPORTED, 8.62x.
- 2026-11-07: M3a measured (launch overhead): REFUTED, 12.28
  microseconds.
- 2026-11-07: M2 measured (occupancy sweep): PARTIALLY SUPPORTED.
- 2026-11-07: M1 measured (coalesced vs strided copy): PARTIALLY
  SUPPORTED, 4.22x.
- 2026-11-07: Live dashboard in site/ and its Pages workflow;
  preregistration tests (frozen rules, device, M1 bijection, em dash
  gate, threshold contract).
- 2026-11-06: Scaffold: SPEC, study map U01 to U14, pre-registered
  M1, M2 and M3 (locked; tag proposal-v1), unit stubs U01 to U03, CI.

### Removed
- 2026-11-07: Amendment 1 to PREREGISTRATION.md withdrawn before
  merge, because the runs never saw it (decision 0002).
