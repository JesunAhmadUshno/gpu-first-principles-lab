# gpu-first-principles-lab

A study lab for GPU architecture, learned from first principles and proven by measurement.

Status: four of five micro-studies measured on 2026-11-07, each under its frozen rule: M1 (U02, coalesced vs strided bandwidth) PARTIALLY SUPPORTED at a 4.22x ratio; M2 (U03, occupancy sweep) PARTIALLY SUPPORTED; M3a (U06, launch overhead) REFUTED at 12.28 microseconds; M3b (U12, naive vs tiled GEMM) SUPPORTED at 8.62x. M3c remains unrun, and no unit has its concept answers written yet. Every measured claim arrives through a pre-registered unit.

**Live dashboard:** [jesunahmadushno.github.io/gpu-first-principles-lab](https://jesunahmadushno.github.io/gpu-first-principles-lab/), with the study map, the frozen verdict rules, the recorded results and three what-if tools that run in your browser. Source in `site/`; every count and threshold is parsed from this repo's markdown at build time, and every measured figure is recomputed from the raw arrays in `units/*/m*_results.json` and checked against PREREGISTRATION.md when the site builds.

## What this lab is

This lab works through a structured GPU architecture curriculum one unit at a time and converts each concept into evidence. A unit is not finished when the reading is done. A unit is finished when the concept has been restated in our own words, checked against a primary source, implemented in original code, measured on the named hardware, and closed with a published verdict.

The lab is the literacy layer under inference and training work. It exists so that performance claims made elsewhere in this portfolio (serving, kernels, training) rest on understood hardware behaviour rather than on rules of thumb.

## The method

Every unit follows the same five steps, in this order:

1. Study the concept from the study map (see STUDY-MAP.md).
2. Verify the concept against a primary source before it is written down as fact here.
3. Implement it originally. All text and code in this repo are written for this repo.
4. Measure it on the named hardware, under a protocol that was pre-registered before the run (see PREREGISTRATION.md).
5. Publish the verdict, including when the measurement disagrees with the expectation.

## Hardware of record

All measurements in this lab run on one machine:

- Host: BlackBox
- GPU: NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM

This is a consumer laptop GPU. Numbers measured on it describe this device. Consumer-GPU numbers are never presented as datacenter numbers anywhere in this repo, and every results table names the device it was measured on.

## Credits and sources

Study map source: this lab follows and cites the curriculum at BEFORE-GPU-ENGINEERING (https://github.com/BEFORE-GPU-ENGINEERING/BEFORE-GPU-ENGINEERING), published under the MIT licence. That project supplies the chapter sequence this lab studies. It is a map, not an authority: nothing is copied from it, and no claim enters this repo on its word alone.

Primary sources used for verification:

- NVIDIA CUDA C++ Programming Guide
- NVIDIA CUDA C++ Best Practices Guide
- NVIDIA architecture whitepapers and named papers, cited per unit where used

## Layout

- SPEC.md: scope, unit structure, deliverable contract, quality gates.
- STUDY-MAP.md: the unit table, source chapters, and what each unit feeds.
- PREREGISTRATION.md: the frozen protocols and verdict rules for the first micro-studies.
- units/: one folder per unit, added as units open.
- docs/research-review.md: the design graded against a research rubric, with each open gap and what closes it.
- site/: the live dashboard (React and Vite), built and published by .github/workflows/pages.yml.

## Licence

Apache-2.0. See LICENSE.
