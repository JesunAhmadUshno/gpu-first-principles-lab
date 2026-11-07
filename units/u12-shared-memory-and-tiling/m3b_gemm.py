"""Unit U12, micro-study M3b: naive vs tiled GEMM.

Implements PREREGISTRATION.md M3b exactly: C = A times B,
float32, square sizes 512, 1024, 2048; a naive kernel and a
shared-memory tiled kernel; 2 warmup launches then 10 timed
launches per implementation per size, CUDA events around the
kernel only; correctness against a host reference with max
absolute error below 1e-2 at size 512 before any timing
counts, and spot checks on a fixed sample at 1024 and 2048.

The two implementations, in the lab's Triton vehicle:

- Naive: one output element per thread. Each program is one
  warp producing 32 consecutive outputs in one row; every
  output is a full length-N dot product loaded element by
  element from global memory. No tiling, no shared memory
  (the compiled kernel reports 0 shared bytes), no dot unit.
- Tiled: 64 by 64 output tiles, K marched in steps of 32,
  tiles staged for tl.dot, which the compiler routes through
  shared memory (the compiled kernel's shared bytes are
  recorded in the results). Tile sizes are fixed here in
  code before the run: BLOCK_M 64, BLOCK_N 64, BLOCK_K 32.
  tl.dot runs with input_precision "ieee" so the comparison
  stays in honest float32.

Inputs are generated once per size on the host from a fixed
seed and shared by both implementations and the host
reference. Run on BlackBox (RTX 5050 Laptop GPU, 8 GB).
Writes m3b_results.json beside this file.
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

SIZES = [512, 1024, 2048]
WARMUPS = 2
TIMED = 10
SEED = 20261107
BLOCK_M = 64
BLOCK_N = 64
BLOCK_K = 32
TOL = 1e-2
SPOT_SAMPLE = 4096


@triton.jit
def gemm_naive(A, B, C, N: tl.constexpr):
    pid_m = tl.program_id(0)
    pid_n = tl.program_id(1)
    offs_n = pid_n * 32 + tl.arange(0, 32)
    zeros = tl.zeros([32], dtype=tl.int32)
    acc = tl.zeros([32], dtype=tl.float32)
    for k in range(0, N):
        a = tl.load(A + pid_m * N + k + zeros)
        b = tl.load(B + k * N + offs_n)
        acc += a * b
    tl.store(C + pid_m * N + offs_n, acc)


@triton.jit
def gemm_tiled(A, B, C, N: tl.constexpr,
               BLOCK_M: tl.constexpr, BLOCK_N: tl.constexpr,
               BLOCK_K: tl.constexpr):
    pid_m = tl.program_id(0)
    pid_n = tl.program_id(1)
    offs_m = pid_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offs_n = pid_n * BLOCK_N + tl.arange(0, BLOCK_N)
    offs_k = tl.arange(0, BLOCK_K)
    a_ptrs = A + offs_m[:, None] * N + offs_k[None, :]
    b_ptrs = B + offs_k[:, None] * N + offs_n[None, :]
    acc = tl.zeros((BLOCK_M, BLOCK_N), dtype=tl.float32)
    for _ in range(0, N, BLOCK_K):
        a = tl.load(a_ptrs)
        b = tl.load(b_ptrs)
        acc = tl.dot(a, b, acc, input_precision="ieee")
        a_ptrs += BLOCK_K
        b_ptrs += BLOCK_K * N
    tl.store(C + offs_m[:, None] * N + offs_n[None, :], acc)


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


def time_kernel(fn, warmups: int, timed: int) -> list[float]:
    for _ in range(warmups):
        fn()
    torch.cuda.synchronize()
    times = []
    for _ in range(timed):
        start = torch.cuda.Event(enable_timing=True)
        end = torch.cuda.Event(enable_timing=True)
        start.record()
        fn()
        end.record()
        torch.cuda.synchronize()
        times.append(start.elapsed_time(end))
    return times


def stats(times_ms: list[float], n: int) -> dict:
    arr = np.array(times_ms)
    med = float(np.median(arr))
    return {
        "times_ms": [float(t) for t in arr],
        "time_ms_median": med,
        "time_ms_q1": float(np.percentile(arr, 25)),
        "time_ms_q3": float(np.percentile(arr, 75)),
        "gflops_median": 2.0 * n**3 / (med / 1000.0) / 1e9,
    }


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    state_before = gpu_state()
    rng = np.random.default_rng(SEED)
    spot_rng = np.random.default_rng(SEED + 1)
    results = {}
    for n in SIZES:
        a_host = rng.standard_normal((n, n), dtype=np.float32)
        b_host = rng.standard_normal((n, n), dtype=np.float32)
        ref = a_host @ b_host
        a = torch.from_numpy(a_host).cuda()
        b = torch.from_numpy(b_host).cuda()
        c = torch.empty((n, n), dtype=torch.float32, device="cuda")

        def run_naive():
            return gemm_naive[(n, n // 32)](a, b, c, N=n, num_warps=1)

        def run_tiled():
            return gemm_tiled[(n // BLOCK_M, n // BLOCK_N)](
                a, b, c, N=n, BLOCK_M=BLOCK_M, BLOCK_N=BLOCK_N,
                BLOCK_K=BLOCK_K, num_warps=4, num_stages=3)

        entry = {}
        for name, run in (("naive", run_naive), ("tiled", run_tiled)):
            handle = run()
            torch.cuda.synchronize()
            got = c.cpu().numpy()
            if n == 512:
                max_err = float(np.abs(got - ref).max())
                checked = n * n
            else:
                idx = spot_rng.integers(0, n * n, size=SPOT_SAMPLE)
                max_err = float(np.abs(got.ravel()[idx]
                                       - ref.ravel()[idx]).max())
                checked = SPOT_SAMPLE
            if not max_err < TOL:
                raise SystemExit(
                    f"correctness failed for {name} at size {n}: "
                    f"max abs err {max_err} on {checked} elements")
            times = time_kernel(run, WARMUPS, TIMED)
            entry[name] = {
                "correct": True,
                "elements_checked": checked,
                "max_abs_err_vs_host": max_err,
                "registers_per_thread": int(handle.n_regs),
                "shared_bytes_per_block": int(handle.metadata.shared),
                **stats(times, n),
            }
            print(n, name, "median ms",
                  round(entry[name]["time_ms_median"], 4),
                  "gflops", round(entry[name]["gflops_median"], 1))
        entry["speedup_tiled_at_this_size"] = (
            entry["naive"]["time_ms_median"]
            / entry["tiled"]["time_ms_median"])
        results[str(n)] = entry
    speedup = results["1024"]["speedup_tiled_at_this_size"]
    verdict = ("SUPPORTED" if speedup >= 1.5 else
               "PARTIALLY SUPPORTED" if speedup > 1.1 else "REFUTED")
    payload = {
        "study": "M3b naive vs tiled GEMM",
        "device": torch.cuda.get_device_name(0),
        "machine": platform.node(),
        "torch": torch.__version__,
        "triton": triton.__version__,
        "sizes": SIZES,
        "warmup_launches": WARMUPS,
        "timed_launches": TIMED,
        "seed": SEED,
        "tiled_tile_sizes": {"BLOCK_M": BLOCK_M, "BLOCK_N": BLOCK_N,
                             "BLOCK_K": BLOCK_K},
        "tiled_dot_input_precision": "ieee",
        "correctness": (
            "host reference (NumPy matmul on the same host "
            "inputs); full check at size 512 with max abs error "
            "below 1e-2 required before timing; fixed seeded "
            f"sample of {SPOT_SAMPLE} elements at 1024 and 2048"),
        "gpu_state_before": state_before,
        "gpu_state_after": gpu_state(),
        "results_by_size": results,
        "speedup_at_1024": speedup,
        "verdict": verdict,
        "verdict_rule": ("supported if the tiled kernel's median "
                         "time at 1024 is at most two thirds of "
                         "the naive kernel's (speedup at least "
                         "1.5x); partially supported if the "
                         "speedup is above 1.1x and below 1.5x; "
                         "refuted at or below 1.1x "
                         "(PREREGISTRATION.md M3b, frozen)"),
    }
    out_path = Path(__file__).with_name("m3b_results.json")
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"speedup_at_1024": speedup,
                      "verdict": verdict}, indent=2))


if __name__ == "__main__":
    main()
