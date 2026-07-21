"""
Database access layer — stub implementation.
Role 0 provides the actual Supabase / Postgres client.

All table names follow the Section 0 shared data model:
  accounts, posts, follows, reports

Each function documents the expected query so Role 0 can implement it.
Stubs return safe defaults so the service can start without a live DB.
"""

import uuid
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# TODO: Role 0 — initialize the actual DB client here.
# e.g.:
#   from supabase import create_client
#   import os
#   supabase = create_client(
#       os.environ["SUPABASE_URL"],
#       os.environ["SUPABASE_SERVICE_ROLE_KEY"],
#   )
# ---------------------------------------------------------------------------


async def get_account(account_id: str) -> dict | None:
    """
    SELECT * FROM accounts WHERE id = :account_id
    Returns Account dict or None.
    """
    print(f"[DB STUB] get_account({account_id})")
    return {
        "id": account_id,
        "wallet_address": None,
        "username": "stub_user",
        "bio": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "follower_count": 0,
        "following_count": 0,
        "spam_score": 0.0,
        "status": "active",
    }


async def update_account(account_id: str, fields: dict) -> None:
    """
    UPDATE accounts SET <fields> WHERE id = :account_id
    """
    print(f"[DB STUB] update_account({account_id}, {fields})")


async def get_post(post_id: str) -> dict | None:
    """
    SELECT * FROM posts WHERE id = :post_id
    Returns Post dict or None.
    """
    print(f"[DB STUB] get_post({post_id})")
    return {
        "id": post_id,
        "account_id": "stub_account",
        "text": "",
        "media_urls": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_text_label": None,
        "ai_text_confidence": None,
        "image_moderation_status": None,
        "image_labels": [],
        "visibility": "public",
    }


async def update_post(post_id: str, fields: dict) -> None:
    """
    UPDATE posts SET <fields> WHERE id = :post_id
    """
    print(f"[DB STUB] update_post({post_id}, {fields})")


async def get_posts_by_account(account_id: str, limit: int = 50) -> list[dict]:
    """
    SELECT * FROM posts WHERE account_id = :account_id
    ORDER BY created_at DESC LIMIT :limit
    """
    print(f"[DB STUB] get_posts_by_account({account_id}, limit={limit})")
    return []


async def count_posts(account_id: str) -> int:
    """
    SELECT COUNT(*) FROM posts WHERE account_id = :account_id
    """
    print(f"[DB STUB] count_posts({account_id})")
    return 0


async def get_following_accounts(account_id: str) -> list[dict]:
    """
    SELECT a.* FROM accounts a
    JOIN follows f ON f.followee_id = a.id
    WHERE f.follower_id = :account_id

    Returns list of Account dicts (the accounts this user follows).
    """
    print(f"[DB STUB] get_following_accounts({account_id})")
    return []


async def count_open_reports(target_type: str, target_id: str) -> int:
    """
    SELECT COUNT(*) FROM reports
    WHERE target_type = :target_type AND target_id = :target_id AND status = 'open'
    """
    print(f"[DB STUB] count_open_reports({target_type}, {target_id})")
    return 0


async def insert_report(data: dict) -> str:
    """
    INSERT INTO reports (id, target_type, target_id, reason, reporter_id, status, created_at)
    VALUES (:id, :target_type, :target_id, :reason, :reporter_id, 'open', NOW())
    Returns the generated report_id (UUID).
    """
    report_id = str(uuid.uuid4())
    print(f"[DB STUB] insert_report({data}) → {report_id}")
    return report_id
