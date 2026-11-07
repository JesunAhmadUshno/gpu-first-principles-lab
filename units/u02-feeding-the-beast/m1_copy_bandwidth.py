"""Unit U02, micro-study M1: coalesced vs strided bandwidth.

Implements PREREGISTRATION.md M1 exactly: float32 arrays of
2^24 elements, a copy kernel out[i] = in[f(i)] in two compiled
variants (Triton), 3 warmup launches then 20 timed launches per
variant, CUDA events around the kernel only, full host
correctness check before any timing counts.

Variant A: f(i) = i (stride 1, coalesced).
Variant B: f(i) = (i mod (N/32)) * 32 + i / (N/32) (stride 32).

Run on BlackBox (RTX 5050 Laptop GPU, 8 GB). Writes
m1_results.json beside this file.
"""

from __future__ import annotations

import json
import platform
from pathlib import Path

import numpy as np
import torch
import triton
import triton.language as tl

N = 2**24
BLOCK = 1024
M = N // 32
WARMUPS = 3
TIMED = 20


@triton.jit
def copy_coalesced(inp, out, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    idx = pid * BLOCK + tl.arange(0, BLOCK)
    tl.store(out + idx, tl.load(inp + idx))


@triton.jit
def copy_strided(inp, out, MVAL: tl.constexpr, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    idx = pid * BLOCK + tl.arange(0, BLOCK)
    src = (idx % MVAL) * 32 + idx // MVAL
    tl.store(out + idx, tl.load(inp + src))


def bandwidth_stats(times_s: list[float]) -> dict:
    bws = np.array([2 * N * 4 / t / 1e9 for t in times_s])
    return {
        "times_ms": [round(t * 1000, 4) for t in times_s],
        "bandwidth_gb_s_median": float(np.median(bws)),
        "bandwidth_gb_s_q1": float(np.percentile(bws, 25)),
        "bandwidth_gb_s_q3": float(np.percentile(bws, 75)),
    }


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    dev = "cuda"
    inp = torch.arange(N, dtype=torch.float32, device=dev)
    out = torch.empty(N, dtype=torch.float32, device=dev)
    grid = (N // BLOCK,)
    variants = {
        "coalesced": (copy_coalesced, (inp, out), {"BLOCK": BLOCK},
                      np.arange(N, dtype=np.float32)),
        "strided": (copy_strided, (inp, out), {"MVAL": M, "BLOCK": BLOCK},
                    ((np.arange(N) % M) * 32 + np.arange(N) // M)
                    .astype(np.float32)),
    }
    results = {}
    for name, (kernel, args, kwargs, expected) in variants.items():
        kernel[grid](*args, **kwargs)
        torch.cuda.synchronize()
        got = out.cpu().numpy()
        correct = bool(np.array_equal(got, expected))
        if not correct:
            raise SystemExit(f"correctness failed for variant {name}")
        for _ in range(WARMUPS):
            kernel[grid](*args, **kwargs)
        torch.cuda.synchronize()
        times = []
        for _ in range(TIMED):
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)
            start.record()
            kernel[grid](*args, **kwargs)
            end.record()
            torch.cuda.synchronize()
            times.append(start.elapsed_time(end) / 1000.0)
        results[name] = {"correct": correct, **bandwidth_stats(times)}
        print(name, results[name]["bandwidth_gb_s_median"])
    ratio = (results["coalesced"]["bandwidth_gb_s_median"]
             / results["strided"]["bandwidth_gb_s_median"])
    verdict = ("SUPPORTED" if ratio >= 5 else
               "PARTIALLY SUPPORTED" if ratio >= 2 else "REFUTED")
    payload = {
        "study": "M1 coalesced vs strided global-memory bandwidth",
        "device": torch.cuda.get_device_name(0),
        "machine": platform.node(),
        "torch": torch.__version__,
        "triton": triton.__version__,
        "n_elements": N,
        "bytes_moved_per_launch": 2 * N * 4,
        "warmup_launches": WARMUPS,
        "timed_launches": TIMED,
        "variants": results,
        "ratio_median_coalesced_over_strided": ratio,
        "verdict": verdict,
        "verdict_rule": ("supported at ratio >= 5, partially "
                         "supported at >= 2, refuted below 2 "
                         "(PREREGISTRATION.md M1, frozen)"),
    }
    out_path = Path(__file__).with_name("m1_results.json")
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"ratio": ratio, "verdict": verdict}, indent=2))


if __name__ == "__main__":
    main()
