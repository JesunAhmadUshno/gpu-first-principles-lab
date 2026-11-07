"""Unit U03, micro-study M2: occupancy sweep against the theory curve.

Implements PREREGISTRATION.md M2 exactly: a simple elementwise
arithmetic kernel over 2^24 float32 elements, low register use,
no shared memory; block sizes 32, 64, 128, 256, 512, 1024
threads; grid sized to cover the array (the full device workload)
at each block size.

Per block size:
- theoretical occupancy from the CUDA occupancy API
  (cuOccupancyMaxActiveBlocksPerMultiprocessor, driver API,
  called on the compiled kernel's CUfunction handle),
- achieved occupancy from a runtime measurement: an instrumented
  twin kernel records globaltimer start and end plus the SM id
  once per block; the time-weighted mean number of resident warps
  per SM over the kernel window, divided by the device maximum
  of 48 warps per SM, is the achieved occupancy (median of 5
  instrumented launches),
- kernel time from CUDA events, median of 20 timed launches
  after 3 warmups,
- output verified on the host at each block size before any
  timing counts.

Run on BlackBox (RTX 5050 Laptop GPU, 8 GB). Writes
m2_results.json beside this file.
"""

from __future__ import annotations

import ctypes
import json
import platform
import subprocess
from pathlib import Path

import numpy as np
import torch
import triton
import triton.language as tl
from triton.language.extra import cuda as tl_cuda

N = 2**24
BLOCK_SIZES = [32, 64, 128, 256, 512, 1024]
WARMUPS = 3
TIMED = 20
PROBE_RUNS = 5


@triton.jit
def arith_kernel(x, out, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    idx = pid * BLOCK + tl.arange(0, BLOCK)
    v = tl.load(x + idx)
    tl.store(out + idx, v * v + v)


@triton.jit
def arith_probe(x, out, starts, ends, sms, BLOCK: tl.constexpr):
    pid = tl.program_id(0)
    offs = tl.arange(0, BLOCK)
    t0 = tl_cuda.globaltimer()
    sm = tl_cuda.smid()
    idx = pid * BLOCK + offs
    v = tl.load(x + idx)
    tl.store(out + idx, v * v + v)
    t1 = tl_cuda.globaltimer()
    first = offs == 0
    anchor = pid + tl.zeros([BLOCK], dtype=tl.int32)
    tl.store(starts + anchor, t0, mask=first)
    tl.store(ends + anchor, t1, mask=first)
    tl.store(sms + anchor, sm, mask=first)


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


def occupancy_api() -> ctypes.CDLL:
    cuda = ctypes.CDLL("nvcuda.dll")
    cuda.cuOccupancyMaxActiveBlocksPerMultiprocessor.argtypes = [
        ctypes.POINTER(ctypes.c_int), ctypes.c_void_p,
        ctypes.c_int, ctypes.c_size_t]
    cuda.cuOccupancyMaxActiveBlocksPerMultiprocessor.restype = ctypes.c_int
    cuda.cuDeviceGetAttribute.argtypes = [
        ctypes.POINTER(ctypes.c_int), ctypes.c_int, ctypes.c_int]
    cuda.cuDeviceGetAttribute.restype = ctypes.c_int
    cuda.cuDeviceGet.argtypes = [ctypes.POINTER(ctypes.c_int), ctypes.c_int]
    cuda.cuDeviceGet.restype = ctypes.c_int
    return cuda


def achieved_occupancy(starts: np.ndarray, ends: np.ndarray,
                       sms: np.ndarray, warps_per_block: int,
                       num_sms: int, max_warps_per_sm: int) -> float:
    window = float(ends.max() - starts.min())
    if window <= 0:
        raise ValueError("non-positive probe window")
    warp_time = 0.0
    for sm in np.unique(sms):
        m = sms == sm
        s = starts[m].astype(np.float64)
        e = ends[m].astype(np.float64)
        times = np.concatenate([s, e])
        deltas = np.concatenate([np.ones_like(s), -np.ones_like(e)])
        order = np.argsort(times, kind="stable")
        times = times[order]
        deltas = deltas[order]
        active = np.cumsum(deltas)
        dt = np.diff(times)
        warp_time += float(np.sum(active[:-1] * dt)) * warps_per_block
    return warp_time / (num_sms * max_warps_per_sm * window)


def main() -> None:
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    props = torch.cuda.get_device_properties(0)
    num_sms = props.multi_processor_count
    max_threads_per_sm = props.max_threads_per_multi_processor
    max_warps_per_sm = max_threads_per_sm // props.warp_size

    cuda = occupancy_api()
    dev = ctypes.c_int(0)
    if cuda.cuDeviceGet(ctypes.byref(dev), 0) != 0:
        raise SystemExit("cuDeviceGet failed")
    max_blocks_attr = ctypes.c_int(0)
    # CU_DEVICE_ATTRIBUTE_MAX_BLOCKS_PER_MULTIPROCESSOR = 106
    if cuda.cuDeviceGetAttribute(ctypes.byref(max_blocks_attr), 106,
                                 dev) != 0:
        raise SystemExit("cuDeviceGetAttribute(106) failed")

    state_before = gpu_state()
    x = torch.randn(N, dtype=torch.float32, device="cuda")
    out = torch.empty(N, dtype=torch.float32, device="cuda")
    x_host = x.cpu().numpy()
    expected = x_host * x_host + x_host

    rows = []
    for block in BLOCK_SIZES:
        warps = block // props.warp_size
        grid = (N // block,)
        handle = arith_kernel[grid](x, out, BLOCK=block, num_warps=warps)
        torch.cuda.synchronize()
        got = out.cpu().numpy()
        max_err = float(np.abs(got - expected).max())
        correct = bool(np.allclose(got, expected, rtol=1e-5, atol=1e-5))
        if not correct:
            raise SystemExit(
                f"correctness failed at block size {block}: "
                f"max abs err {max_err}")

        n_regs = int(handle.n_regs)
        n_spills = int(handle.n_spills)
        shared = int(handle.metadata.shared)
        num_blocks = ctypes.c_int(0)
        ret = cuda.cuOccupancyMaxActiveBlocksPerMultiprocessor(
            ctypes.byref(num_blocks), ctypes.c_void_p(handle.function),
            block, shared)
        if ret != 0:
            raise SystemExit(f"cuOccupancy call failed with code {ret}")
        theoretical = (num_blocks.value * block
                       / max_threads_per_sm * 100.0)

        # instrumented twin: achieved occupancy from warp residency
        starts = torch.empty(grid[0], dtype=torch.int64, device="cuda")
        ends = torch.empty(grid[0], dtype=torch.int64, device="cuda")
        sms = torch.empty(grid[0], dtype=torch.int32, device="cuda")
        achieved_runs = []
        for _ in range(PROBE_RUNS):
            arith_probe[grid](x, out, starts, ends, sms,
                              BLOCK=block, num_warps=warps)
            torch.cuda.synchronize()
            achieved_runs.append(achieved_occupancy(
                starts.cpu().numpy(), ends.cpu().numpy(),
                sms.cpu().numpy(), warps, num_sms, max_warps_per_sm))
        achieved = float(np.median(achieved_runs)) * 100.0

        for _ in range(WARMUPS):
            arith_kernel[grid](x, out, BLOCK=block, num_warps=warps)
        torch.cuda.synchronize()
        times = []
        for _ in range(TIMED):
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)
            start.record()
            arith_kernel[grid](x, out, BLOCK=block, num_warps=warps)
            end.record()
            torch.cuda.synchronize()
            times.append(start.elapsed_time(end) / 1000.0)
        times_ms = np.array([t * 1000 for t in times])
        row = {
            "block_size": block,
            "warps_per_block": warps,
            "grid_blocks": grid[0],
            "registers_per_thread": n_regs,
            "register_spills": n_spills,
            "shared_bytes_per_block": shared,
            "api_max_active_blocks_per_sm": num_blocks.value,
            "theoretical_occupancy_pct": theoretical,
            "achieved_occupancy_pct_runs": [a * 100.0
                                            for a in achieved_runs],
            "achieved_occupancy_pct_median": achieved,
            "time_ms_median": float(np.median(times_ms)),
            "time_ms_q1": float(np.percentile(times_ms, 25)),
            "time_ms_q3": float(np.percentile(times_ms, 75)),
            "correct": correct,
            "max_abs_err_vs_host": max_err,
        }
        rows.append(row)
        print(block, "theoretical", round(theoretical, 1),
              "achieved", round(achieved, 1),
              "time_ms", round(row["time_ms_median"], 4))

    fastest = min(rows, key=lambda r: r["time_ms_median"])
    plateau = max(r["theoretical_occupancy_pct"] for r in rows)
    onset_idx = next(i for i, r in enumerate(rows)
                     if r["theoretical_occupancy_pct"] == plateau)
    fastest_idx = rows.index(fastest)
    cond1 = (abs(fastest["achieved_occupancy_pct_median"]
                 - fastest["theoretical_occupancy_pct"]) <= 10.0)
    cond2 = abs(fastest_idx - onset_idx) <= 1
    verdict = ("SUPPORTED" if cond1 and cond2 else
               "PARTIALLY SUPPORTED" if cond1 or cond2 else "REFUTED")
    payload = {
        "study": "M2 occupancy sweep against the theory curve",
        "device": torch.cuda.get_device_name(0),
        "machine": platform.node(),
        "torch": torch.__version__,
        "triton": triton.__version__,
        "n_elements": N,
        "kernel": "out[i] = x[i] * x[i] + x[i], one element per thread",
        "warmup_launches": WARMUPS,
        "timed_launches": TIMED,
        "probe_launches_per_block_size": PROBE_RUNS,
        "device_limits": {
            "multiprocessors": num_sms,
            "max_threads_per_sm": max_threads_per_sm,
            "max_warps_per_sm": max_warps_per_sm,
            "max_blocks_per_sm": max_blocks_attr.value,
            "registers_per_sm": props.regs_per_multiprocessor,
            "shared_memory_per_sm": props.shared_memory_per_multiprocessor,
        },
        "theoretical_occupancy_method": (
            "cuOccupancyMaxActiveBlocksPerMultiprocessor (CUDA driver "
            "occupancy API) on the compiled kernel handle, times block "
            "size, divided by max threads per SM"),
        "achieved_occupancy_method": (
            "instrumented twin kernel records globaltimer start and "
            "end and the SM id once per block; time-weighted mean "
            "resident warps per SM over the kernel window divided by "
            "the 48 warp per SM device maximum; median of 5 launches; "
            "no profiler (Nsight Compute) is installed on this "
            "machine, so the protocol's runtime measurement route "
            "was used"),
        "gpu_state_before": state_before,
        "gpu_state_after": gpu_state(),
        "rows": rows,
        "plateau_theoretical_occupancy_pct": plateau,
        "plateau_onset_block_size": BLOCK_SIZES[onset_idx],
        "fastest_block_size": fastest["block_size"],
        "condition_1_achieved_within_10pp_at_best": cond1,
        "condition_2_fastest_within_one_step_of_plateau_onset": cond2,
        "verdict": verdict,
        "verdict_rule": (
            "supported if achieved occupancy is within 10 percentage "
            "points of theoretical at the best (fastest measured) "
            "block size AND the fastest block size lies within one "
            "sweep step of the onset of the theoretical plateau; "
            "partially supported if only one holds; refuted if "
            "neither (PREREGISTRATION.md M2, frozen)"),
    }
    out_path = Path(__file__).with_name("m2_results.json")
    out_path.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"fastest": fastest["block_size"],
                      "verdict": verdict}, indent=2))


if __name__ == "__main__":
    main()
