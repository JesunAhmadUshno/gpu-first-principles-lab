"""M2 Nsight Compute calibration driver (decision 0004, 2026-11-18).

Launches the frozen M2 sweep's arith_kernel unchanged over 2^24
float32 elements at ONE block size given as argv[1]: 3 warmup
launches, then 1 measured launch. Nsight Compute profiles this
process with --launch-skip 3 --launch-count 1 so the measured
launch is the one collected. The sweep module is imported, never
modified; its main() does not run on import.
"""
import importlib.util
import sys
from pathlib import Path

import torch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location(
    "m2_sweep", HERE / "m2_occupancy_sweep.py")
sweep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sweep)


def main() -> None:
    block = int(sys.argv[1])
    if not torch.cuda.is_available():
        raise SystemExit("CUDA not available on this machine")
    props = torch.cuda.get_device_properties(0)
    x = torch.randn(sweep.N, dtype=torch.float32, device="cuda")
    out = torch.empty(sweep.N, dtype=torch.float32, device="cuda")
    warps = block // props.warp_size
    grid = (sweep.N // block,)
    for _ in range(3):
        sweep.arith_kernel[grid](x, out, BLOCK=block, num_warps=warps)
    torch.cuda.synchronize()
    sweep.arith_kernel[grid](x, out, BLOCK=block, num_warps=warps)
    torch.cuda.synchronize()
    print("driver done block", block)


if __name__ == "__main__":
    main()
