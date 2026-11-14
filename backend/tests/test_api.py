import pytest
from fastapi.testclient import TestClient

from app import main
from app.checkers.grammar_ml import GrammarModelChecker

client = TestClient(main.app)


def test_health_reports_model_flag():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert isinstance(body["model_loaded"], bool)


def test_cors_allows_the_configured_origin_only():
    allowed = client.options(
        "/check",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:5173"

    blocked = client.options(
        "/check",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert blocked.headers.get("access-control-allow-origin") is None


def test_rate_limit(monkeypatch):
    monkeypatch.setattr(main.engine, "analyze", lambda text: [])  # keep the test fast, no model
    main.limiter.reset()
    codes = [client.post("/check", json={"text": "hello"}).status_code for _ in range(31)]
    main.limiter.reset()
    assert codes[:30] == [200] * 30
    assert codes[30] == 429


@pytest.mark.slow
def test_ml_offsets_after_blank_line():
    checker = GrammarModelChecker()
    text = "Hello there.\n\nShe go to school."
    issues = checker.check(text)
    # `original` is sliced from the text at the issue's offsets, so this fails if they are misaligned
    assert any(issue.original == "go" for issue in issues)