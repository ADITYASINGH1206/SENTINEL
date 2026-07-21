"""
Tests for POST /moderate/account-score

DB is mocked via the mock_db fixture. No ML models involved.
"""

import pytest
from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# 1. Brand-new account, no data → score ≈ 0, band = clean
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_new_account_is_clean(client, mock_db):
    """Fresh account with no posts, follows, or reports → clean."""

    resp = await client.post("/moderate/account-score", json={
        "account_id": "acc_new",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["band"] == "clean"
    assert body["score"] < 40
    assert "follow_spam_ratio" in body["signals"]
    assert "age_velocity" in body["signals"]
    assert "duplicate_ratio" in body["signals"]
    assert "report_count" in body["signals"]


# ---------------------------------------------------------------------------
# 2. High spam signals → auto_suspend
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_spammy_account_auto_suspends(client, mock_db):
    """Account with all bad signals → score >75 → auto_suspend."""

    # All followed accounts are suspended
    mock_db["get_following_accounts"].return_value = [
        {"id": "x1", "status": "suspended"},
        {"id": "x2", "status": "suspended"},
        {"id": "x3", "status": "flagged"},
    ]

    # Very new account with lots of posts
    mock_db["get_account"].return_value = {
        "id": "acc_spam",
        "status": "active",
        "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        "spam_score": 0,
    }
    mock_db["count_posts"].return_value = 100  # 100 posts in 0.25 days

    # Lots of duplicate posts
    mock_db["get_posts_by_account"].return_value = [
        {"text": "Buy crypto now! Best deal ever!"},
        {"text": "Buy crypto now! Best deal ever!"},
        {"text": "Buy crypto now! Best deal ever!!"},
        {"text": "Buy crypto now! Best deal ever!!!"},
        {"text": "Buy crypto now! Amazing deal!"},
    ]

    # 10+ open reports
    mock_db["count_open_reports"].return_value = 15

    resp = await client.post("/moderate/account-score", json={
        "account_id": "acc_spam",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert body["score"] > 75
    assert body["band"] == "auto_suspend"

    # Should have set status = suspended in DB
    mock_db["update_account"].assert_called_once()
    call_args = mock_db["update_account"].call_args
    assert call_args[0][1]["status"] == "suspended"


# ---------------------------------------------------------------------------
# 3. Moderate signals → flagged_for_review
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_moderate_signals_flagged(client, mock_db):
    """Mix of some bad signals → score 40-75 → flagged_for_review."""

    # Half of followed accounts are inactive
    mock_db["get_following_accounts"].return_value = [
        {"id": "a1", "status": "active"},
        {"id": "a2", "status": "suspended"},
    ]

    # Somewhat new account
    mock_db["get_account"].return_value = {
        "id": "acc_mid",
        "status": "active",
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        "spam_score": 0,
    }
    mock_db["count_posts"].return_value = 20  # 10/day

    # Some duplicates
    mock_db["get_posts_by_account"].return_value = [
        {"text": "Hello world"},
        {"text": "Hello world"},
        {"text": "Something different"},
        {"text": "Another unique post"},
    ]

    mock_db["count_open_reports"].return_value = 5

    resp = await client.post("/moderate/account-score", json={
        "account_id": "acc_mid",
    })

    assert resp.status_code == 200
    body = resp.json()
    assert 40 <= body["score"] <= 75
    assert body["band"] == "flagged_for_review"

    # Should NOT set status = suspended
    call_args = mock_db["update_account"].call_args
    assert "suspended" not in str(call_args)


# ---------------------------------------------------------------------------
# 4. Signals are within [0, 1] range
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_signals_are_normalized(client, mock_db):
    """All signal values should be between 0 and 1."""

    resp = await client.post("/moderate/account-score", json={
        "account_id": "acc_any",
    })

    assert resp.status_code == 200
    signals = resp.json()["signals"]
    for key in ("follow_spam_ratio", "age_velocity", "duplicate_ratio"):
        assert 0.0 <= signals[key] <= 1.0, f"{key} out of range: {signals[key]}"


# ---------------------------------------------------------------------------
# 5. Response schema validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_response_has_all_contract_fields(client, mock_db):
    """Ensure every field in the Cross-Role API Contract is present."""

    resp = await client.post("/moderate/account-score", json={
        "account_id": "acc_check",
    })

    body = resp.json()
    assert {"score", "band", "signals"} == set(body.keys())
    assert {"follow_spam_ratio", "age_velocity", "duplicate_ratio", "report_count"} <= set(body["signals"].keys())
