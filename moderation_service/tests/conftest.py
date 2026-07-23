"""
Pytest fixtures shared across all test modules.

Uses httpx.AsyncClient with ASGITransport to test the FastAPI app
without starting a real server. All ML models and DB calls are mocked.
"""

import sys
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure moderation_service/ is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from app import app


@pytest_asyncio.fixture
async def client():
    """Async test client that talks directly to the FastAPI ASGI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_db():
    """
    Patch all db module functions with sensible defaults.
    Individual tests can override specific return values.
    """
    with patch("db.get_account", new_callable=AsyncMock) as m_get_account, \
         patch("db.update_account", new_callable=AsyncMock) as m_update_account, \
         patch("db.get_post", new_callable=AsyncMock) as m_get_post, \
         patch("db.update_post", new_callable=AsyncMock) as m_update_post, \
         patch("db.get_posts_by_account", new_callable=AsyncMock) as m_get_posts, \
         patch("db.count_posts", new_callable=AsyncMock) as m_count_posts, \
         patch("db.get_following_accounts", new_callable=AsyncMock) as m_get_following, \
         patch("db.count_open_reports", new_callable=AsyncMock) as m_count_reports, \
         patch("db.insert_report", new_callable=AsyncMock) as m_insert_report:

        # Defaults
        m_get_account.return_value = {
            "id": "acc_1", "status": "active",
            "created_at": "2025-01-01T00:00:00+00:00", "spam_score": 0,
        }
        m_update_account.return_value = None
        m_get_post.return_value = {
            "id": "post_1", "account_id": "acc_1", "text": "", "visibility": "public",
        }
        m_update_post.return_value = None
        m_get_posts.return_value = []
        m_count_posts.return_value = 0
        m_get_following.return_value = []
        m_count_reports.return_value = 0
        m_insert_report.return_value = "report-uuid-1234"

        yield {
            "get_account": m_get_account,
            "update_account": m_update_account,
            "get_post": m_get_post,
            "update_post": m_update_post,
            "get_posts_by_account": m_get_posts,
            "count_posts": m_count_posts,
            "get_following_accounts": m_get_following,
            "count_open_reports": m_count_reports,
            "insert_report": m_insert_report,
        }
