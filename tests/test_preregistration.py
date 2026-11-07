"""Checks that keep PREREGISTRATION.md, the site's threshold contract and the SPEC gates honest."""

import json
import pathlib
import re
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
PREREG = (REPO_ROOT / "PREREGISTRATION.md").read_text(encoding="utf-8")
STUDIES = ("M1", "M2", "M3a", "M3b", "M3c")
TEXT_SUFFIXES = {".md", ".py", ".yml", ".yaml", ".json", ".js", ".jsx", ".mjs", ".css", ".html", ".txt", ".toml", ".cfg"}
SKIP_DIRS = {".git", "node_modules", "dist", ".rubric", "__pycache__", ".venv"}


def study_sections():
    """Split the protocol part of the file (before any amendment) into study id -> section text."""
    body = PREREG.split("## Amendments")[0]
    parts = re.split(r"^#{2,3} (M\d[a-z]?): ", body, flags=re.M)
    return {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}


def strided_index(i, n):
    """The M1 strided mapping as pinned in the 2026-11-07 amendment."""
    s = n // 32
    return (i % s) * 32 + i // s


def number(pattern):
    match = re.search(pattern, PREREG)
    if not match:
        raise AssertionError("phrase not found in PREREGISTRATION.md: " + pattern)
    return float(match.group(1))


class TestPreregistration(unittest.TestCase):
    def test_every_study_has_a_frozen_rule_and_no_results(self):
        sections = study_sections()
        for study in STUDIES:
            self.assertIn(study, sections)
            self.assertIn("Frozen verdict rule", sections[study], study)
            self.assertIn("RESULTS: NOT YET RUN", sections[study], study)

    def test_device_of_record(self):
        self.assertIn("Device for every study below: BlackBox, NVIDIA GeForce RTX 5050 Laptop, 8 GB VRAM", PREREG)

    def test_m1_strided_mapping_is_a_bijection(self):
        n = 2 ** 10
        self.assertEqual(sorted(strided_index(i, n) for i in range(n)), list(range(n)))
        # One warp of the strided variant touches 32 addresses 32 floats apart.
        self.assertEqual([strided_index(i, n) for i in range(32)], [32 * i for i in range(32)])

    def test_amendment_pins_the_m1_mapping(self):
        self.assertIn("f(i) = (i mod (N/32)) * 32 + floor(i / (N/32))", PREREG)


class TestThresholdContract(unittest.TestCase):
    """site/src/prereg.json must say exactly what PREREGISTRATION.md says."""

    @classmethod
    def setUpClass(cls):
        cls.p = json.loads((REPO_ROOT / "site" / "src" / "prereg.json").read_text(encoding="utf-8"))

    def test_m1(self):
        m1 = self.p["M1"]
        self.assertEqual(2 ** m1["log2Elements"], 2 ** int(number(r"arrays of 2\^(\d+) elements")))
        self.assertEqual(m1["mibPerArray"], number(r"\((\d+) MiB per array\)"))
        self.assertEqual(m1["mibPerArray"], 2 ** m1["log2Elements"] * m1["bytesPerElement"] / 2 ** 20)
        self.assertEqual(m1["supportedAtLeast"], number(r"at least (\d+(?:\.\d+)?)x the median strided"))
        self.assertEqual(m1["partialAtLeast"], number(r"ratio is at least (\d+(?:\.\d+)?)x and below"))
        self.assertEqual(m1["warmup"], number(r"Runs: (\d+) warmup launches, then 20"))
        self.assertEqual(m1["timed"], number(r"then (\d+) timed launches per variant"))

    def test_m2(self):
        m2 = self.p["M2"]
        self.assertEqual(m2["withinPercentagePoints"], number(r"within (\d+) percentage points"))
        sweep = re.search(r"Sweep: block sizes ([\d, ]+) threads", PREREG).group(1)
        self.assertEqual(m2["blockSizes"], [int(x) for x in sweep.split(",")])

    def test_m3a(self):
        m3a = self.p["M3a"]
        self.assertEqual(m3a["supportedBelowMicroseconds"], number(r"per-launch overhead is below (\d+) microseconds"))
        self.assertEqual(m3a["launches"], number(r"enqueue (\d+) consecutive launches"))
        self.assertEqual(m3a["repeats"], number(r"Repeat the whole measurement (\d+) times"))

    def test_m3b(self):
        m3b = self.p["M3b"]
        sizes = re.search(r"square matrices of size (\d+), (\d+), and (\d+)", PREREG).groups()
        self.assertEqual(m3b["sizes"], [int(x) for x in sizes])
        self.assertEqual(m3b["verdictSize"], number(r"tiled GEMM is at least 1\.5 times faster .* at matrix size (\d+)"))
        self.assertEqual(m3b["supportedAtLeast"], number(r"a speedup of at least (\d+(?:\.\d+)?)x"))
        self.assertEqual(m3b["partialAbove"], number(r"speedup is above (\d+(?:\.\d+)?)x and below"))

    def test_m3c(self):
        m3c = self.p["M3c"]
        self.assertEqual(m3c["verdictSize"], number(r"with size (\d+) as the verdict size"))
        self.assertEqual(m3c["supportedAtLeast"], number(r"ratio at 2048 is at least (\d+(?:\.\d+)?)"))
        self.assertEqual(m3c["partialAtLeast"], number(r"partially supported if at least (\d+(?:\.\d+)?) and below"))


class TestSpecGates(unittest.TestCase):
    def test_no_em_dashes_anywhere(self):
        offenders = []
        for path in REPO_ROOT.rglob("*"):
            if any(part in SKIP_DIRS for part in path.relative_to(REPO_ROOT).parts) or not path.is_file():
                continue
            if path.suffix in TEXT_SUFFIXES or path.name == "LICENSE":
                if chr(0x2014) in path.read_text(encoding="utf-8", errors="ignore"):
                    offenders.append(str(path.relative_to(REPO_ROOT)))
        self.assertEqual(offenders, [], "SPEC gate: em dash count must be 0")


if __name__ == "__main__":
    unittest.main()
