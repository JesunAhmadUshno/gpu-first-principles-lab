import pathlib
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent


class TestScaffold(unittest.TestCase):
    def test_study_map_exists(self):
        self.assertTrue((REPO_ROOT / "STUDY-MAP.md").is_file())

    def test_study_map_lists_all_units(self):
        text = (REPO_ROOT / "STUDY-MAP.md").read_text(encoding="utf-8")
        for n in range(1, 15):
            self.assertIn("U%02d" % n, text)

    def test_core_files_exist(self):
        for name in ("README.md", "SPEC.md", "PREREGISTRATION.md", "LICENSE"):
            self.assertTrue((REPO_ROOT / name).is_file(), name)

    def test_preregistration_records_every_micro_study(self):
        # Scaffold-era form of this test asserted that no study
        # had results yet. The last unrun study (M3c) was
        # measured on 2026-11-08, so the assertion now runs the
        # other way: every micro-study carries a results line
        # and no study is left marked unrun.
        text = (REPO_ROOT / "PREREGISTRATION.md").read_text(encoding="utf-8")
        self.assertNotIn("NOT YET RUN", text)
        for marker in ("## M1", "## M2", "### M3a", "### M3b", "### M3c"):
            self.assertIn(marker, text)
        self.assertEqual(text.count("RESULTS (2026-"), 5)

    def test_unit_stubs_exist(self):
        for folder in (
            "u01-architecture",
            "u02-feeding-the-beast",
            "u03-inside-the-silicon",
        ):
            self.assertTrue(
                (REPO_ROOT / "units" / folder / "STUDY.md").is_file(), folder
            )


if __name__ == "__main__":
    unittest.main()
