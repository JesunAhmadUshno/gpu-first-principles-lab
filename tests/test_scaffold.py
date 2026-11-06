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

    def test_preregistration_has_no_results(self):
        text = (REPO_ROOT / "PREREGISTRATION.md").read_text(encoding="utf-8")
        self.assertIn("RESULTS: NOT YET RUN", text)

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
