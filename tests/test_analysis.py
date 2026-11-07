"""The committed bootstrap intervals are reproducible from the recorded raw arrays."""

import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("bootstrap_medians", ROOT / "analysis" / "bootstrap_medians.py")
boot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boot)


class TestBootstrap(unittest.TestCase):
    def test_committed_intervals_reproduce(self):
        committed = json.loads((ROOT / "analysis" / "bootstrap_medians.json").read_text(encoding="utf-8"))
        self.assertEqual(json.loads(json.dumps(boot.compute())), committed)

    def test_interval_brackets_the_point_and_is_seeded(self):
        sample = [1.0, 2.0, 3.0, 4.0, 10.0]
        a = boot.interval(boot.statistics.median, sample, resamples=500)
        self.assertEqual(a, boot.interval(boot.statistics.median, sample, resamples=500))
        self.assertLessEqual(a["lo"], a["point"])
        self.assertLessEqual(a["point"], a["hi"])


if __name__ == "__main__":
    unittest.main()
