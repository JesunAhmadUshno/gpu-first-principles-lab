"""Percentile bootstrap 95 percent intervals for the statistic each frozen rule reads.

Descriptive only: the frozen rules in PREREGISTRATION.md read the medians, and nothing here
changes a verdict. M2 is absent because m2_results.json stores only the median and quartiles of
its timings, not the raw arrays. Reads the recorded raw arrays in units/*/m*_results.json, uses the Python
standard library only, and writes analysis/bootstrap_medians.json.

Run: python3 analysis/bootstrap_medians.py
"""

import json
import pathlib
import random
import statistics

ROOT = pathlib.Path(__file__).resolve().parent.parent
RESAMPLES = 10_000
SEED = 20261107


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def interval(stat, *samples, resamples=RESAMPLES, seed=SEED):
    """Point estimate and percentile 95 percent interval of stat(*samples), each sample resampled independently."""
    rng = random.Random(seed)
    draws = sorted(stat(*[rng.choices(s, k=len(s)) for s in samples]) for _ in range(resamples))
    return {"point": stat(*samples), "lo": draws[int(0.025 * resamples)], "hi": draws[int(0.975 * resamples) - 1]}


def ratio_of_medians(a, b):
    return statistics.median(a) / statistics.median(b)


def compute():
    m1 = load("units/u02-feeding-the-beast/m1_results.json")
    gb = lambda times: [m1["bytes_moved_per_launch"] / 1e9 / (t / 1e3) for t in times]
    m3a = load("units/u06-hardware-hierarchy/m3a_results.json")
    m3b = load("units/u12-shared-memory-and-tiling/m3b_results.json")["results_by_size"]["1024"]
    return {
        "method": f"percentile bootstrap, {RESAMPLES} resamples, seed {SEED}, Python random.choices",
        "M1_ratio_of_median_bandwidths": interval(
            ratio_of_medians, gb(m1["variants"]["coalesced"]["times_ms"]), gb(m1["variants"]["strided"]["times_ms"])),
        "M3a_median_per_launch_us": interval(statistics.median, m3a["per_launch_us_by_repetition"]),
        "M3b_speedup_at_1024": interval(ratio_of_medians, m3b["naive"]["times_ms"], m3b["tiled"]["times_ms"]),
    }


if __name__ == "__main__":
    out = compute()
    (ROOT / "analysis" / "bootstrap_medians.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))
