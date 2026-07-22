"""
Database access layer — live Supabase implementation.

Connects to the shared Supabase/Postgres instance using the Service Role Key
so it can bypass RLS for moderation writes.

Table mapping (spec → actual):
  accounts → users
  posts    → posts
  follows  → follows
  reports  → reports
"""

import os
import uuid
from datetime import datetime, timezone

from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Supabase client initialization
# ---------------------------------------------------------------------------
_supabase: Client | None = None


def _get_client() -> Client:
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            print("[DB] WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.")
            print("[DB] Falling back to stub mode — DB writes will be no-ops.")
            return None
        _supabase = create_client(url, key)
        print(f"[DB] Supabase client initialized: {url}")
    return _supabase


# ---------------------------------------------------------------------------
# Account (users table) operations
# ---------------------------------------------------------------------------


async def get_account(account_id: str) -> dict | None:
    """SELECT * FROM users WHERE id = :account_id"""
    print(f"[DB] get_account({account_id})")
    client = _get_client()
    if client is None:
        return _stub_account(account_id)
    try:
        result = client.table("users").select("*").eq("id", account_id).maybe_single().execute()
        if result.data:
            return result.data
        return None
    except Exception as e:
        print(f"[DB] get_account error: {e}")
        return _stub_account(account_id)


async def update_account(account_id: str, fields: dict) -> None:
    """UPDATE users SET <fields> WHERE id = :account_id"""
    print(f"[DB] update_account({account_id}, {fields})")
    client = _get_client()
    if client is None:
        return
    try:
        client.table("users").update(fields).eq("id", account_id).execute()
        print(f"[DB] Account {account_id} updated successfully")
    except Exception as e:
        print(f"[DB] update_account error: {e}")


# ---------------------------------------------------------------------------
# Post operations
# ---------------------------------------------------------------------------


async def get_post(post_id: str) -> dict | None:
    """SELECT * FROM posts WHERE id = :post_id"""
    print(f"[DB] get_post({post_id})")
    client = _get_client()
    if client is None:
        return _stub_post(post_id)
    try:
        result = client.table("posts").select("*").eq("id", post_id).maybe_single().execute()
        if result.data:
            return result.data
        return None
    except Exception as e:
        print(f"[DB] get_post error: {e}")
        return _stub_post(post_id)


async def update_post(post_id: str, fields: dict) -> None:
    """UPDATE posts SET <fields> WHERE id = :post_id"""
    print(f"[DB] update_post({post_id}, {fields})")
    client = _get_client()
    if client is None:
        return
    try:
        client.table("posts").update(fields).eq("id", post_id).execute()
        print(f"[DB] Post {post_id} updated successfully")
    except Exception as e:
        print(f"[DB] update_post error: {e}")


async def get_posts_by_account(account_id: str, limit: int = 50) -> list[dict]:
    """SELECT * FROM posts WHERE user_id = :account_id ORDER BY created_at DESC LIMIT :limit"""
    print(f"[DB] get_posts_by_account({account_id}, limit={limit})")
    client = _get_client()
    if client is None:
        return []
    try:
        result = (
            client.table("posts")
            .select("*")
            .eq("user_id", account_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[DB] get_posts_by_account error: {e}")
        return []


async def count_posts(account_id: str) -> int:
    """SELECT COUNT(*) FROM posts WHERE user_id = :account_id"""
    print(f"[DB] count_posts({account_id})")
    client = _get_client()
    if client is None:
        return 0
    try:
        result = (
            client.table("posts")
            .select("id", count="exact")
            .eq("user_id", account_id)
            .execute()
        )
        return result.count or 0
    except Exception as e:
        print(f"[DB] count_posts error: {e}")
        return 0


# ---------------------------------------------------------------------------
# Follow operations
# ---------------------------------------------------------------------------


async def get_following_accounts(account_id: str) -> list[dict]:
    """
    Get all accounts that this user follows, with their status.
    JOIN follows f ON f.following_id = users.id WHERE f.follower_id = :account_id
    """
    print(f"[DB] get_following_accounts({account_id})")
    client = _get_client()
    if client is None:
        return []
    try:
        # Get following IDs
        follows_result = (
            client.table("follows")
            .select("following_id")
            .eq("follower_id", account_id)
            .execute()
        )
        following_ids = [f["following_id"] for f in (follows_result.data or [])]
        if not following_ids:
            return []

        # Get user details
        users_result = (
            client.table("users")
            .select("id, status")
            .in_("id", following_ids)
            .execute()
        )
        return users_result.data or []
    except Exception as e:
        print(f"[DB] get_following_accounts error: {e}")
        return []


# ---------------------------------------------------------------------------
# Report operations
# ---------------------------------------------------------------------------


async def count_open_reports(target_type: str, target_id: str) -> int:
    """SELECT COUNT(*) FROM reports WHERE target_type = :target_type AND target_id = :target_id AND status = 'open'"""
    print(f"[DB] count_open_reports({target_type}, {target_id})")
    client = _get_client()
    if client is None:
        return 0
    try:
        result = (
            client.table("reports")
            .select("id", count="exact")
            .eq("target_type", target_type)
            .eq("target_id", target_id)
            .eq("status", "open")
            .execute()
        )
        return result.count or 0
    except Exception as e:
        print(f"[DB] count_open_reports error: {e}")
        return 0


async def insert_report(data: dict) -> str:
    """INSERT INTO reports (...) VALUES (...). Returns report_id (UUID)."""
    report_id = str(uuid.uuid4())
    print(f"[DB] insert_report({data}) → {report_id}")
    client = _get_client()
    if client is None:
        return report_id
    try:
        row = {
            "id": report_id,
            "target_type": data["target_type"],
            "target_id": data["target_id"],
            "reason": data["reason"],
            "reporter_id": data["reporter_id"],
            "status": "open",
        }
        client.table("reports").insert(row).execute()
        print(f"[DB] Report {report_id} inserted successfully")
    except Exception as e:
        print(f"[DB] insert_report error: {e}")
    return report_id


# ---------------------------------------------------------------------------
# Stub fallbacks (used when Supabase is not configured)
# ---------------------------------------------------------------------------


def _stub_account(account_id: str) -> dict:
    return {
        "id": account_id,
        "wallet_address": None,
        "username": "stub_user",
        "bio": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "spam_score": 0.0,
        "status": "active",
    }


def _stub_post(post_id: str) -> dict:
    return {
        "id": post_id,
        "user_id": "stub_account",
        "content": "",
        "media_url": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "image_moderation_status": None,
        "image_labels": [],
        "visibility": "public",
    }
