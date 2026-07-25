"""
Tests for POST /report

DB and external services are mocked.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock


# ---------------------------------------------------------------------------
# 1. Misleading report → routed to role2
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_misleading_routes_to_role2(client, mock_db):
    """reason=misleading → forwards to Role 2, returns routed_to=role2."""

    with patch("reports.httpx.AsyncClient") as MockHttpx:
        mock_post_resp = MagicMock()
        mock_post_resp.status_code = 200
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(
            return_value=MagicMock(post=AsyncMock(return_value=mock_post_resp))
        )
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        resp = await client.post("/report", json={
            "target_type": "post",
            "target_id": "post_abc",
            "reason": "misleading",
            "reporter_id": "user_1",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["routed_to"] == "role2"
    assert "report_id" in body

    # Should have inserted a report
    mock_db["insert_report"].assert_called_once()


# ---------------------------------------------------------------------------
# 2. Spam report → routed to role3, triggers recompute
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_spam_routes_to_role3_and_recomputes(client, mock_db):
    """reason=spam → stays in role3, triggers account-score recompute."""

    with patch("reports.spam_score.compute_score", new_callable=AsyncMock) as mock_compute:
        mock_compute.return_value = {"score": 10, "band": "clean", "signals": {}}

        resp = await client.post("/report", json={
            "target_type": "account",
            "target_id": "acc_target",
            "reason": "spam",
            "reporter_id": "user_2",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["routed_to"] == "role3"

    # Should have triggered a recompute for the target account
    mock_compute.assert_called_once_with("acc_target")


# ---------------------------------------------------------------------------
# 3. Nudity report on a post → resolves account_id from post
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_post_report_resolves_account(client, mock_db):
    """Report on a post should look up account_id from the post row."""

    mock_db["get_post"].return_value = {
        "id": "post_xyz", "account_id": "acc_owner", "text": "",
    }

    with patch("reports.spam_score.compute_score", new_callable=AsyncMock) as mock_compute:
        mock_compute.return_value = {"score": 5, "band": "clean", "signals": {}}

        resp = await client.post("/report", json={
            "target_type": "post",
            "target_id": "post_xyz",
            "reason": "nudity",
            "reporter_id": "user_3",
        })

    assert resp.status_code == 200
    # Should recompute for the post's owner
    mock_compute.assert_called_once_with("acc_owner")


# ---------------------------------------------------------------------------
# 4. Role 2 is unreachable → report still created, no crash
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_role2_down_still_returns(client, mock_db):
    """If Role 2 service is unreachable, report is still created."""

    with patch("reports.httpx.AsyncClient") as MockHttpx:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(
            return_value=MagicMock(post=AsyncMock(side_effect=Exception("Connection refused")))
        )
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        resp = await client.post("/report", json={
            "target_type": "post",
            "target_id": "post_123",
            "reason": "misleading",
            "reporter_id": "user_4",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["routed_to"] == "role2"
    assert "report_id" in body


# ---------------------------------------------------------------------------
# 5. All valid reasons accepted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("reason,expected_route", [
    ("spam", "role3"),
    ("nudity", "role3"),
    ("18+", "role3"),
    ("misleading", "role2"),
])
async def test_all_reasons_accepted(client, mock_db, reason, expected_route):
    """Every reason from the spec should be accepted and correctly routed."""

    with patch("reports.spam_score.compute_score", new_callable=AsyncMock) as mock_compute, \
         patch("reports.httpx.AsyncClient") as MockHttpx:

        mock_compute.return_value = {"score": 0, "band": "clean", "signals": {}}

        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(
            return_value=MagicMock(post=AsyncMock(return_value=MagicMock(status_code=200)))
        )
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        resp = await client.post("/report", json={
            "target_type": "account",
            "target_id": "acc_1",
            "reason": reason,
            "reporter_id": "user_1",
        })

    assert resp.status_code == 200
    assert resp.json()["routed_to"] == expected_route


# ---------------------------------------------------------------------------
# 6. Response schema validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_response_has_all_contract_fields(client, mock_db):
    """Ensure every field in the Cross-Role API Contract is present."""

    with patch("reports.spam_score.compute_score", new_callable=AsyncMock) as mock_compute:
        mock_compute.return_value = {"score": 0, "band": "clean", "signals": {}}

        resp = await client.post("/report", json={
            "target_type": "account",
            "target_id": "acc_1",
            "reason": "spam",
            "reporter_id": "user_1",
        })

    body = resp.json()
    assert {"report_id", "routed_to"} == set(body.keys())
