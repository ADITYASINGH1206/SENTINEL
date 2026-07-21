"""
Tests for POST /moderate/image

All ML models (NudeNet, deepfake, c2pa) are mocked so tests run
instantly without GPU/model downloads.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock


# ---------------------------------------------------------------------------
# 1. Clean image — passes all checks
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_clean_image_returns_allowed(client, mock_db):
    """An image that passes every check → status=allowed, no labels."""

    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 100  # minimal JPEG header

    with patch("app.httpx.AsyncClient") as MockHttpx, \
         patch("nsfw.analyze") as mock_nsfw, \
         patch("provenance.check_provenance") as mock_prov, \
         patch("deepfake.analyze") as mock_df:

        # Mock image download
        mock_resp = MagicMock()
        mock_resp.content = fake_image
        mock_resp.raise_for_status = MagicMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=MagicMock(get=AsyncMock(return_value=mock_resp)))
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        # All checks pass
        mock_nsfw.return_value = {"status": "continue", "labels": [], "explicit_confidence": 0.0}
        mock_prov.return_value = False
        mock_df.return_value = {"deepfake_confidence": 0.1, "labels": []}

        resp = await client.post("/moderate/image", json={
            "post_id": "post_1",
            "image_url": "https://example.com/clean.jpg",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "allowed"
    assert body["labels"] == []
    assert body["deepfake_confidence"] == 0.1
    assert body["disclosed_ai_content"] is False

    # Verify DB was updated
    mock_db["update_post"].assert_called_once()
    call_args = mock_db["update_post"].call_args
    assert call_args[0][1]["image_moderation_status"] == "allowed"
    assert call_args[0][1]["visibility"] == "public"


# ---------------------------------------------------------------------------
# 2. Explicit NSFW — early exit, blocked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_explicit_nsfw_blocks_early(client, mock_db):
    """NudeNet explicit >60% → status=blocked, pipeline halts."""

    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 100

    with patch("app.httpx.AsyncClient") as MockHttpx, \
         patch("nsfw.analyze") as mock_nsfw, \
         patch("provenance.check_provenance") as mock_prov, \
         patch("deepfake.analyze") as mock_df:

        mock_resp = MagicMock()
        mock_resp.content = fake_image
        mock_resp.raise_for_status = MagicMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=MagicMock(get=AsyncMock(return_value=mock_resp)))
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        # NudeNet blocks
        mock_nsfw.return_value = {
            "status": "blocked",
            "labels": ["explicit_content"],
            "explicit_confidence": 0.85,
        }

        resp = await client.post("/moderate/image", json={
            "post_id": "post_2",
            "image_url": "https://example.com/nsfw.jpg",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "blocked"
    assert "explicit_content" in body["labels"]
    assert body["deepfake_confidence"] == 0.0

    # c2pa and deepfake should NOT have been called (early exit)
    mock_prov.assert_not_called()
    mock_df.assert_not_called()

    # DB should be updated with blocked
    call_args = mock_db["update_post"].call_args
    assert call_args[0][1]["visibility"] == "blocked"


# ---------------------------------------------------------------------------
# 3. Sensitive + AI-generated image
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_sensitive_plus_deepfake(client, mock_db):
    """Suggestive NudeNet + deepfake >65% → allowed with labels."""

    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 100

    with patch("app.httpx.AsyncClient") as MockHttpx, \
         patch("nsfw.analyze") as mock_nsfw, \
         patch("provenance.check_provenance") as mock_prov, \
         patch("deepfake.analyze") as mock_df:

        mock_resp = MagicMock()
        mock_resp.content = fake_image
        mock_resp.raise_for_status = MagicMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=MagicMock(get=AsyncMock(return_value=mock_resp)))
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        mock_nsfw.return_value = {
            "status": "continue",
            "labels": ["sensitive_content"],
            "explicit_confidence": 0.35,
        }
        mock_prov.return_value = False
        mock_df.return_value = {
            "deepfake_confidence": 0.82,
            "labels": ["ai_generated_image"],
        }

        resp = await client.post("/moderate/image", json={
            "post_id": "post_3",
            "image_url": "https://example.com/ai_suggestive.jpg",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "allowed"
    assert "sensitive_content" in body["labels"]
    assert "ai_generated_image" in body["labels"]
    assert body["deepfake_confidence"] == 0.82
    assert body["disclosed_ai_content"] is False

    # visibility should be "labeled" because we have labels
    call_args = mock_db["update_post"].call_args
    assert call_args[0][1]["visibility"] == "labeled"


# ---------------------------------------------------------------------------
# 4. C2PA manifest found
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_c2pa_manifest_detected(client, mock_db):
    """c2pa manifest present → disclosed_ai_content=True, label added."""

    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 100

    with patch("app.httpx.AsyncClient") as MockHttpx, \
         patch("nsfw.analyze") as mock_nsfw, \
         patch("provenance.check_provenance") as mock_prov, \
         patch("deepfake.analyze") as mock_df:

        mock_resp = MagicMock()
        mock_resp.content = fake_image
        mock_resp.raise_for_status = MagicMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=MagicMock(get=AsyncMock(return_value=mock_resp)))
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        mock_nsfw.return_value = {"status": "continue", "labels": [], "explicit_confidence": 0.0}
        mock_prov.return_value = True  # manifest found
        mock_df.return_value = {"deepfake_confidence": 0.1, "labels": []}

        resp = await client.post("/moderate/image", json={
            "post_id": "post_4",
            "image_url": "https://example.com/c2pa.jpg",
        })

    assert resp.status_code == 200
    body = resp.json()
    assert body["disclosed_ai_content"] is True
    assert "disclosed_ai_content" in body["labels"]


# ---------------------------------------------------------------------------
# 5. Missing / bad image URL → 400
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bad_image_url_returns_400(client, mock_db):
    """Unreachable image_url → HTTP 400."""

    with patch("app.httpx.AsyncClient") as MockHttpx:
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(
            return_value=MagicMock(get=AsyncMock(side_effect=Exception("Connection refused")))
        )
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        resp = await client.post("/moderate/image", json={
            "post_id": "post_5",
            "image_url": "https://bad-host.invalid/nope.jpg",
        })

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 6. Response schema validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_response_has_all_contract_fields(client, mock_db):
    """Ensure every field in the Cross-Role API Contract is present."""

    fake_image = b"\xff\xd8\xff\xe0" + b"\x00" * 100

    with patch("app.httpx.AsyncClient") as MockHttpx, \
         patch("nsfw.analyze") as mock_nsfw, \
         patch("provenance.check_provenance") as mock_prov, \
         patch("deepfake.analyze") as mock_df:

        mock_resp = MagicMock()
        mock_resp.content = fake_image
        mock_resp.raise_for_status = MagicMock()
        mock_ctx = AsyncMock()
        mock_ctx.__aenter__ = AsyncMock(return_value=MagicMock(get=AsyncMock(return_value=mock_resp)))
        mock_ctx.__aexit__ = AsyncMock(return_value=False)
        MockHttpx.return_value = mock_ctx

        mock_nsfw.return_value = {"status": "continue", "labels": [], "explicit_confidence": 0.0}
        mock_prov.return_value = False
        mock_df.return_value = {"deepfake_confidence": 0.0, "labels": []}

        resp = await client.post("/moderate/image", json={
            "post_id": "post_6",
            "image_url": "https://example.com/img.jpg",
        })

    body = resp.json()
    required_keys = {"status", "labels", "deepfake_confidence", "disclosed_ai_content"}
    assert required_keys == set(body.keys()), f"Missing keys: {required_keys - set(body.keys())}"
