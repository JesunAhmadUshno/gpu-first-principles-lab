"""Portfolio standard checks: the lock holds, the required files exist, no public grade."""

import hashlib
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
# SHA-256 of PREREGISTRATION.md as committed in a04d4ac (tag proposal-v1), before any code or run.
LOCKED_SHA256 = "dae1d8057ab36d093cd6db348fdffb39aa784108f043f0871ebf07f0dfdbf12d"
RECORDED = re.compile(r"^RESULTS \(.*$", re.M)
PUBLIC = ["README.md", "REPORT.md", "PREREGISTRATION.md", "SPEC.md", "STUDY-MAP.md", "CHANGELOG.md",
          "site/src/App.jsx", "site/index.html"]


def as_locked(text):
    """PREREGISTRATION.md with every recorded RESULTS line put back to its locked form."""
    return RECORDED.sub("RESULTS: NOT YET RUN", text)


class TestLayout(unittest.TestCase):
    def test_preregistration_is_unchanged_since_the_lock_except_results_lines(self):
        text = (ROOT / "PREREGISTRATION.md").read_text(encoding="utf-8")
        self.assertEqual(hashlib.sha256(as_locked(text).encode("utf-8")).hexdigest(), LOCKED_SHA256,
                         "PREREGISTRATION.md changed beyond its RESULTS lines; add a dated amendment under a new tag")

    def test_lock_check_catches_an_edited_rule(self):
        text = (ROOT / "PREREGISTRATION.md").read_text(encoding="utf-8").replace("at least 5x", "at least 4x", 1)
        self.assertNotEqual(hashlib.sha256(as_locked(text).encode("utf-8")).hexdigest(), LOCKED_SHA256)

    def test_required_files_exist(self):
        need = ["README.md", "PREREGISTRATION.md", "SPEC.md", "STUDY-MAP.md", "REPORT.md", "CHANGELOG.md",
                "CITATION.cff", "SECURITY.md", "LICENSE", "analysis/bootstrap_medians.py",
                "analysis/bootstrap_medians.json", "docs/decisions/0001-lock-is-the-scaffold-commit.md",
                "docs/decisions/0002-withdraw-amendment-1.md"]
        missing = [p for p in need if not (ROOT / p).is_file()]
        self.assertEqual(missing, [])

    def test_readme_opens_with_the_abstract(self):
        text = (ROOT / "README.md").read_text(encoding="utf-8")
        for key in ("**Question.**", "**Headline.**", "**Field.**", "**Job family.**", "**Verdict.**", "## Lifecycle"):
            self.assertIn(key, text)
        stages = re.findall(r"^- (\w+): (?:DONE \d{4}-\d{2}-\d{2}|OPEN)$", text, re.M)
        self.assertEqual(stages, ["Question", "Proposal", "Baseline", "Build", "Evaluate", "Report", "Review", "Release"])

    def test_no_public_grade(self):
        grade = re.compile(r"of 10,000|/ ?10,?000|Grade:|<th>Grade</th>|\| Grade \|", re.I)
        offenders = [p for p in PUBLIC if grade.search((ROOT / p).read_text(encoding="utf-8"))]
        self.assertEqual(offenders, [], "grades are internal only")


if __name__ == "__main__":
    unittest.main()
