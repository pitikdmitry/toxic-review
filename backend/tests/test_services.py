import pytest

from app.services.github_service import parse_pr_url
from app.services.openai_service import _build_prompt, CRINGE_LEVELS


class TestParsePrUrl:
    def test_valid_url(self):
        owner, repo, number = parse_pr_url("https://github.com/owner/repo/pull/123")
        assert owner == "owner"
        assert repo == "repo"
        assert number == 123

    def test_url_with_trailing_path(self):
        owner, repo, number = parse_pr_url(
            "https://github.com/owner/repo/pull/456/files"
        )
        assert owner == "owner"
        assert repo == "repo"
        assert number == 456

    def test_invalid_url_issues(self):
        with pytest.raises(ValueError):
            parse_pr_url("https://github.com/owner/repo/issues/123")

    def test_invalid_url_no_number(self):
        with pytest.raises(ValueError):
            parse_pr_url("https://github.com/owner/repo/pull/")

    def test_non_github_url(self):
        with pytest.raises(ValueError):
            parse_pr_url("https://gitlab.com/owner/repo/pull/123")

    def test_plain_text(self):
        with pytest.raises(ValueError):
            parse_pr_url("not a url at all")


class TestCringeLevels:
    def test_all_levels_produce_valid_prompt(self):
        for level in range(1, 6):
            prompt = _build_prompt(level)
            assert CRINGE_LEVELS[level]["persona"] in prompt
            assert "file_path" in prompt

    def test_clamps_below_min(self):
        prompt = _build_prompt(0)
        assert CRINGE_LEVELS[1]["persona"] in prompt

    def test_clamps_above_max(self):
        prompt = _build_prompt(99)
        assert CRINGE_LEVELS[5]["persona"] in prompt

    def test_temperature_increases_with_level(self):
        temps = [CRINGE_LEVELS[i]["temperature"] for i in range(1, 6)]
        assert temps == sorted(temps)
