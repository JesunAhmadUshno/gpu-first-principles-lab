# 0004: M2 profiler calibration with Nsight Compute (2026-11-18)

Registered before the run, under Jesun's 2026-11-17 blanket
permission for the gap-closure BlackBox visit.

Decision 0003 left one item open: M2's achieved occupancy comes
from an instrumented twin kernel, not the timed kernel, and
nothing calibrates it against a profiler. This entry runs that
calibration.

Install route: Nsight Compute 2025.3.0, NVIDIA's official conda
package nsight-compute-2025.3.0.19 (win-64, conda.anaconda.org/
nvidia, 290,755,964 bytes), extracted into the user folder
C:\Users\Jesun\gap-closure-2026-11-17\ncu\root. No elevation,
no reboot, no service or driver change. Verified before the
run: ncu.exe --version reports 2025.3.0.0 (build 36273991).
The standalone installer route was not used; it needs an
interactive elevated session, and this route is NVIDIA's own
distribution running in the user context.

Method: a new driver, units/u03-inside-the-silicon/
m2_ncu_driver.py, imports the frozen sweep's arith_kernel
unchanged and launches it over 2^24 float32 elements at one
frozen block size per invocation (32, 64, 128, 256, 512, 1024):
3 warmup launches, then 1 measured launch. Nsight Compute
profiles each invocation with --kernel-name regex:arith_kernel,
--launch-skip 3, --launch-count 1, collecting
sm__warps_active.avg.pct_of_peak_sustained_active; if that
metric name is rejected, the fallback is --section Occupancy
and the achieved occupancy is read from the report. The driver
runs under the environment of record (the b4-pytorch-depth
venv: Python 3.14.7, torch 2.11.0+cu128, triton 3.9.0).

Output: the NEW file units/u03-inside-the-silicon/
m2_ncu_calibration_2026-11-18.json, with per block size: the
profiler achieved occupancy, the twin-kernel medians from
m2_results.json and from m2_results_gapclosure_2026-11-17.json,
and the differences. The frozen m2_results.json is not edited
and the M2 verdict (PARTIALLY SUPPORTED) is not re-issued; the
calibration is a measurement comparison. Its outcome is
appended to this entry after the run.

Addendum (2026-11-18, before the calibration run): the first
profiling attempt with Nsight Compute 2025.3.0 failed before
any collection: "Cuda driver is not compatible with Nsight
Compute" (BlackBox driver 577.05), and the profiled process
exited with an access violation. The install therefore falls
back to Nsight Compute 2025.2.1.3, the CUDA 12.9-era release
paired with this driver generation (official conda package
nsight-compute-2025.2.1.3-0, win-64, 269,898,686 bytes), same
route, same user folder. Everything else in this entry is
unchanged.

Outcome (2026-11-18): the install half of this item succeeded;
the calibration did not run, blocked at profiler
initialization on every attempt.

Install: Nsight Compute was placed on BlackBox twice, both
times from NVIDIA's official conda packages extracted into
user folders, no elevation, no reboot, nothing else disturbed:
2025.3.0.19 (290,755,964 bytes) and, after the driver pairing
failed, 2025.2.1.3 (269,898,686 bytes). Both ncu.exe binaries
run (--version: 2025.3.0.0 build 36273991; 2025.2.1.0 build
35987062).

Attempts: (1) 2025.3.0 in the SSH session: "Cuda driver is not
compatible with Nsight Compute" (BlackBox driver 577.05), the
profiled process exited 0xC0000005. (2) 2025.2.1 in the SSH
session, all six block sizes: the profiler connects, then the
counter measurement library reports "Failed to initialize the
profiler: LibraryNotLoaded. Check that a compatible driver
library is loaded", and the profiled process exits
0xC0000005. (3) 2025.2.1 again from the interactive desktop
session (a one-off scheduled task running as the signed-in
user, deleted afterwards): the identical LibraryNotLoaded
failure within seconds.

Reading: on Windows, GPU performance counters are restricted
to administrators unless the driver setting "allow access to
GPU performance counters to all users" is enabled in NVIDIA
Control Panel; both attempts ran with a limited token, which
matches the failure. The exact remaining step is therefore
Jesun's, at the machine: run the calibration command from an
elevated session, or enable that Control Panel setting (itself
an elevated change), then re-run the driver invocations in
this entry. A driver update may also be required for the
2025.3.0 pairing; 2025.2.1 pairs with this driver generation
but is stopped by the same counter access failure.

No calibration numbers exist and none were estimated:
units/u03-inside-the-silicon/m2_ncu_calibration_2026-11-18.json
was not created. The driver (m2_ncu_driver.py) is committed
with this entry and is ready to run. The twin-kernel achieved
occupancy figures in m2_results.json remain uncalibrated, and
the M2 profiler item stays open with the blocker narrowed from
"not installed" to "installed; counter access needs an
elevated session".

Outcome addendum 2 (2026-11-18, after the counter-access
setting was enabled): Jesun enabled "allow access to GPU
performance counters to all users" in NVIDIA Control Panel at
about 02:48 EST. Two smoke profiles (block 128, Nsight Compute
2025.2.1.3, otherwise exactly the method in this entry) ran at
02:51 and 02:52 EST, the second from a detached scheduled task
so the intermittent SSH route could not kill it. Both failed
identically to the attempts above: the profiler connects, then
"Failed to initialize the profiler: LibraryNotLoaded. Check
that a compatible driver library is loaded", and the profiled
process exits 0xC0000005.

Machine state at the time: last boot 2026-11-14 18:20 EST, so
the driver has not reloaded since the setting was changed.
The Control Panel counter setting is read by the driver when
it loads, so the still-running driver enforces the old
restriction. The one remaining step is a reboot of BlackBox,
which is Jesun's action at the machine and was not done by the
agent. After a reboot, the six invocations in this entry can
be re-run as written; nothing else needs to change.

No calibration numbers exist and none were estimated:
units/u03-inside-the-silicon/m2_ncu_calibration_2026-11-18.json
was not created. The M2 profiler item stays open, with the
blocker narrowed to: counter setting enabled, awaiting a
driver reload (reboot).
Outcome addendum 3 (2026-11-19, after the reboot): BlackBox
was rebooted on Jesun's action; last boot 2026-11-19 04:01
EST, so the driver has reloaded since the counter setting
was enabled. The setting was verified in the registry before
the run: RmProfilingAdminOnly is 0 under HKLM\SYSTEM\
CurrentControlSet\Services\nvlddmkm\Global\NVTweak (driver
577.05, GeForce RTX 5050 Laptop GPU), so GPU performance
counters are open to all users. The calibration was then
re-run exactly as written in this entry, three attempts:
(1) Nsight Compute 2025.2.1.3 in the SSH session, block 128
smoke, the primary metric; (2) the same invocation from the
interactive desktop session (a one-off scheduled task running
as the signed-in user, deleted afterwards); (3) this entry's
fallback, --section Occupancy in place of the metric, block
128, in the SSH session. All three failed identically at
profiler initialization: the profiler connects, then "Failed
to initialize the profiler: LibraryNotLoaded. Check that a
compatible driver library is loaded", and the profiled
process exited 0xC0000005 where its exit was observed. The
counter-access and not-yet-reloaded causes named in addendum
2 are both cleared and the failure persists unchanged, so
the blocker is narrowed again: with counters open to all
users and the driver reloaded, the 2025.2.1.3 counter
measurement library does not load against driver 577.05 on
this machine. The one remaining step is Jesun's, at the
machine: a driver update to the generation paired with a
current Nsight Compute (2025.3.0, already placed in the user
folder by this entry, reported "Cuda driver is not
compatible with Nsight Compute" against 577.05). After that
update the six invocations in this entry re-run unchanged.

No calibration numbers exist and none were estimated:
units/u03-inside-the-silicon/m2_ncu_calibration_2026-11-18.json
was not created. The twin-kernel achieved occupancy figures
in m2_results.json remain uncalibrated, and the M2 profiler
item stays open with the blocker narrowed to the driver
pairing.
