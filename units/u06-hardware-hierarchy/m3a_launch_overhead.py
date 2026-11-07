"""Unit U06, micro-study M3a: kernel launch overhead.

Implements PREREGISTRATION.md M3a exactly: an empty kernel
(immediate return), 1000 consecutive launches timed as one
sequence with CUDA events on the stream, total divided by
1000, the whole measurement repeated 10 times; the median
per-launch figure and the spread are reported. A few warmup
launches precede the repetitions and are never timed (lab
convention, PREREGISTRATION.md header). No data movement; no
correctness output.

What the events measure: the launches are enqueued back to
back from the host with no synchronization in between, and an
empty kernel finishes almost immediately, so the stream
elapsed time is the launch path cost a program on this
device and stack actually pays per launch, host dispatch
included. That is the quantity the frozen verdict rule
judges against 10 microseconds.

Run on BlackBox (RTX 5050 Laptop GPU, 8 GB). Writes
m3a_results.json beside this file.
"""

from __future__ import annotations

import json
import platform
import subprocess
from pathlib import Path

import numpy as np
import torch
import triton
import triton.language as tl

LAUNCHES_PER_REP = 1000
REPETITIONS = 10
WARMUPS = 10


@triton.jit
def empty_kernel():
    pass


def gpu_state() -> dict:
    try:
        out = subprocess.run(
            ["nvidia-smi",
             "--query-gpu=clocks.sm,clocks.mem,utilization.gpu,"
             "temperature.gpu,power.draw",
             "--format=csv,noheader"],
            capture_output=True, text=True, timeout=30)
        return {"nvidia_smi": out.stdout.strip()}
    except Exception as exc:  # context only, never fatal
        return {"nvidia_smi_error": repr(exc)}


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    state_before = gpu_state()
    for _ in range(WARMUPS):
        empty_kernel[(1,)]()
    torch.cuda.synchronize()
    per_launch_us = []
    for _ in range(REPETITIONS):
        start = torch.cuda.Event(enable_timing=True)
        end = torch.cuda.Event(enable_timing=True)
        start.record()
        for _ in range(LAUNCHES_PER_REP):
            empty_kernel[(1,)]()
        end.record()
        torch.cuda.synchronize()
        per_launch_us.append(start.elapsed_time(end))  # ms per 1000
    arr = np.array(per_launch_us)
    median = float(np.median(arr))
    verdict = "SUPPORTED" if median < 10.0 else "REFUTED"
    payload = {
        "study": "M3a kernel launch overhead",
        "device": torch.cuda.get_device_name(0),
        "machine": platform.node(),
        "torch": torch.__version__,
        "triton": triton.__version__,
        "kernel": "empty kernel (immediate return), grid (1,)",
        "launches_per_repetition": LAUNCHES_PER_REP,
        "repetitions": REPETITIONS,
        "warmup_launches_untimed": WARMUPS,
        "per_launch_us_by_repetition": [float(v) for v in arr],
        "per_launch_us_median": median,
        "per_launch_us_min": float(arr.min()),
        "per_launch_us_max": float(arr.max()),
        "per_launch_us_q1": float(np.percentile(arr, 25)),
        "per_launch_us_q3": float(np.percentile(arr, 75)),
        "measurement_note": (
            "CUDA events bracket 1000 back-to-back enqueued "
            "launches on the stream; an empty kernel drains "
            "faster than the host can enqueue, so the figure is "
            "the launch path cost per launch on this device and "
            "stack, host dispatch included"),
        "gpu_state_before": state_before,
        "gpu_state_after": gpu_state(),
        "verdict": verdict,
        "verdict_rule": ("supported if the median per-launch "
                         "overhead is below 10 microseconds; "
                         "refuted otherwise (PREREGISTRATION.md "
                         "M3a, frozen)"),
    }
    out_path = Path(__file__).with_name("m3a_results.json")
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"per_launch_us_median": median,
                      "per_launch_us_min": float(arr.min()),
                      "per_launch_us_max": float(arr.max()),
                      "verdict": verdict}, indent=2))


if __name__ == "__main__":
    main()
