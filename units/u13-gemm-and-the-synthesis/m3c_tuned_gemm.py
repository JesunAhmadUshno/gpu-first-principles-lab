"""Unit U13, micro-study M3c: tuned tiled GEMM vs the library call.

Implements PREREGISTRATION.md M3c exactly: C = A times B,
float32, square sizes 512, 1024, 2048 with 2048 as the verdict
size; the lab's tuned kernel against cuBLAS SGEMM on identical
inputs; 2 warmup launches then 10 timed launches per
implementation per size, CUDA events around the kernel or
library call only (handle creation excluded); correctness
against a host reference with max absolute error below 1e-2
at size 512 before any timing counts, and spot checks on a
fixed sample at 1024 and 2048, as in M3b.

The tuned configuration, recorded here in code before the
run, as the protocol requires:

- Tiles: BLOCK_M 128, BLOCK_N 128, BLOCK_K 32. Each program
  owns a 128 by 128 output tile, four times the outputs of
  the M3b tile (64 by 64).
- Register-level reuse: the 128 by 128 accumulator tile lives
  in registers across the whole K march, so every staged A
  element is reused across 128 outputs and every staged B
  element across 128 outputs (64 in M3b). Launch: 8 warps,
  3 pipeline stages.
- Program order: grouped launch order (GROUP_M 8), the
  standard tile-grouping that keeps neighbouring programs on
  neighbouring tiles so staged data is likelier to still be
  in L2 when reused.
- The dot product runs with input_precision "ieee", honest
  float32, as in M3b and as SGEMM itself computes.

The library arm is cuBLAS SGEMM reached through PyTorch's
matmul dispatch on the same device tensors, with TF32
explicitly disabled so the library call is the float32
SGEMM the protocol names, not a tensor-core reduced
precision path. Warmup calls create the cuBLAS handle and
workspace outside the timed region.

Inputs are generated once per size on the host from a fixed
seed and shared by both implementations and the host
reference. Run on BlackBox (RTX 5050 Laptop GPU, 8 GB).
Writes m3c_results.json beside this file.
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
BLOCK_M = 128
BLOCK_N = 128
BLOCK_K = 32
GROUP_M = 8
NUM_WARPS = 8
NUM_STAGES = 3
TOL = 1e-2
SPOT_SAMPLE = 4096


@triton.jit
def gemm_tuned(A, B, C, M, N, K,
               BLOCK_M: tl.constexpr, BLOCK_N: tl.constexpr,
               BLOCK_K: tl.constexpr, GROUP_M: tl.constexpr):
    pid = tl.program_id(0)
    num_pid_m = tl.cdiv(M, BLOCK_M)
    num_pid_n = tl.cdiv(N, BLOCK_N)
    num_pid_in_group = GROUP_M * num_pid_n
    group_id = pid // num_pid_in_group
    first_pid_m = group_id * GROUP_M
    group_size_m = min(num_pid_m - first_pid_m, GROUP_M)
    pid_m = first_pid_m + ((pid % num_pid_in_group) % group_size_m)
    pid_n = (pid % num_pid_in_group) // group_size_m
    offs_m = pid_m * BLOCK_M + tl.arange(0, BLOCK_M)
    offs_n = pid_n * BLOCK_N + tl.arange(0, BLOCK_N)
    offs_k = tl.arange(0, BLOCK_K)
    a_ptrs = A + offs_m[:, None] * K + offs_k[None, :]
    b_ptrs = B + offs_k[:, None] * N + offs_n[None, :]
    acc = tl.zeros((BLOCK_M, BLOCK_N), dtype=tl.float32)
    for _ in range(0, K, BLOCK_K):
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


def check(c: torch.Tensor, ref: np.ndarray, n: int,
          spot_rng: np.random.Generator) -> tuple[float, int]:
    got = c.cpu().numpy()
    if n == 512:
        return float(np.abs(got - ref).max()), n * n
    idx = spot_rng.integers(0, n * n, size=SPOT_SAMPLE)
    return (float(np.abs(got.ravel()[idx] - ref.ravel()[idx]).max()),
            SPOT_SAMPLE)


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    torch.backends.cuda.matmul.allow_tf32 = False
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

        grid = (triton.cdiv(n, BLOCK_M) * triton.cdiv(n, BLOCK_N),)

        def run_tuned():
            return gemm_tuned[grid](
                a, b, c, n, n, n, BLOCK_M=BLOCK_M, BLOCK_N=BLOCK_N,
                BLOCK_K=BLOCK_K, GROUP_M=GROUP_M,
                num_warps=NUM_WARPS, num_stages=NUM_STAGES)

        def run_cublas():
            torch.matmul(a, b, out=c)

        entry = {}
        for name, run in (("tuned", run_tuned), ("cublas", run_cublas)):
            handle = run()
            torch.cuda.synchronize()
            max_err, checked = check(c, ref, n, spot_rng)
            if not max_err < TOL:
                raise SystemExit(
                    f"correctness failed for {name} at size {n}: "
                    f"max abs err {max_err} on {checked} elements")
            times = time_kernel(run, WARMUPS, TIMED)
            record = {
                "correct": True,
                "elements_checked": checked,
                "max_abs_err_vs_host": max_err,
                **stats(times, n),
            }
            if name == "tuned":
                record["registers_per_thread"] = int(handle.n_regs)
                record["shared_bytes_per_block"] = int(
                    handle.metadata.shared)
            entry[name] = record
            print(n, name, "median ms",
                  round(record["time_ms_median"], 4),
                  "gflops", round(record["gflops_median"], 1))
        entry["ratio_tuned_over_cublas"] = (
            entry["tuned"]["gflops_median"]
            / entry["cublas"]["gflops_median"])
        results[str(n)] = entry
    ratio = results["2048"]["ratio_tuned_over_cublas"]
    verdict = ("SUPPORTED" if ratio >= 0.25 else
               "PARTIALLY SUPPORTED" if ratio >= 0.10 else "REFUTED")
    payload = {
        "study": "M3c tuned tiled GEMM vs cuBLAS SGEMM",
        "device": torch.cuda.get_device_name(0),
        "machine": platform.node(),
        "torch": torch.__version__,
        "triton": triton.__version__,
        "sizes": SIZES,
        "warmup_launches": WARMUPS,
        "timed_launches": TIMED,
        "seed": SEED,
        "tuned_config": {
            "BLOCK_M": BLOCK_M, "BLOCK_N": BLOCK_N,
            "BLOCK_K": BLOCK_K, "GROUP_M": GROUP_M,
            "num_warps": NUM_WARPS, "num_stages": NUM_STAGES,
            "dot_input_precision": "ieee",
        },
        "library_call": (
            "cuBLAS SGEMM through PyTorch matmul dispatch on the "
            "same device tensors, TF32 disabled "
            f"(allow_tf32 read back as "
            f"{torch.backends.cuda.matmul.allow_tf32}); handle "
            "creation and workspace setup fall in the warmup "
            "launches, outside the timed region"),
        "correctness": (
            "host reference (NumPy matmul on the same host "
            "inputs); full check at size 512 with max abs error "
            "below 1e-2 required before timing; fixed seeded "
            f"sample of {SPOT_SAMPLE} elements at 1024 and 2048; "
            "both implementations checked"),
        "gpu_state_before": state_before,
        "gpu_state_after": gpu_state(),
        "results_by_size": results,
        "ratio_at_2048": ratio,
        "verdict": verdict,
        "verdict_rule": ("supported if the ratio of tuned-kernel "
                         "GFLOP/s to cuBLAS GFLOP/s at 2048 is at "
                         "least 0.25; partially supported if at "
                         "least 0.10 and below 0.25; refuted below "
                         "0.10 (PREREGISTRATION.md M3c, frozen)"),
    }
    out_path = Path(__file__).with_name("m3c_results.json")
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"ratio_at_2048": ratio,
                      "verdict": verdict}, indent=2))


if __name__ == "__main__":
    main()
