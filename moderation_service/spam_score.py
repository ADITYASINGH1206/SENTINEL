"""
Spam scoring — hand-written weighted heuristic (no external model for v1).

Formula (spec §Role 3):
  spam_score = 0.40 * follow_spam_ratio
             + 0.25 * age_velocity
             + 0.20 * duplicate_ratio
             + 0.15 * report_count_normalized

All signals are 0-1; final score is scaled to 0-100.

Bands:
  score < 40   → clean
  40 – 75      → flagged_for_review
  > 75         → auto_suspend  (sets Account.status = suspended)
"""

import difflib
from datetime import datetime, timezone

import db


async def compute_score(account_id: str) -> dict:
    """
    Compute the spam score for *account_id*.

    Returns
    -------
    dict  { score: float, band: str,
            signals: { follow_spam_ratio, age_velocity,
                       duplicate_ratio, report_count } }
    """
    print(f"[SpamScore] Computing score for account {account_id}...")

    # ------------------------------------------------------------------
    # Signal 1 — follow_spam_ratio
    #   % of followed accounts whose status != "active"
    # ------------------------------------------------------------------
    print("[SpamScore] Signal 1: follow_spam_ratio")
    following = await db.get_following_accounts(account_id)
    if following:
        inactive = sum(1 for a in following if a.get("status") != "active")
        follow_spam_ratio = inactive / len(following)
    else:
        follow_spam_ratio = 0.0
    print(f"[SpamScore]   follow_spam_ratio = {follow_spam_ratio:.4f}")

    # ------------------------------------------------------------------
    # Signal 2 — age_velocity
    #   post_count / account_age_days, normalized (10 posts/day ≙ 1.0)
    # ------------------------------------------------------------------
    print("[SpamScore] Signal 2: age_velocity")
    account = await db.get_account(account_id)
    post_count = await db.count_posts(account_id)

    age_velocity = 0.0
    if account and account.get("created_at"):
        created = account["created_at"]
        if isinstance(created, str):
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        age_days = max(
            (datetime.now(timezone.utc) - created).total_seconds() / 86400, 1.0
        )
        # Normalize: 10 posts/day → 1.0
        age_velocity = min(post_count / age_days / 10.0, 1.0)
    print(f"[SpamScore]   age_velocity = {age_velocity:.4f}")

    # ------------------------------------------------------------------
    # Signal 3 — duplicate_ratio
    #   Near-duplicate posts via text similarity (difflib, no ML model)
    #   Pair similarity > 0.80 counts as "near-duplicate"
    # ------------------------------------------------------------------
    print("[SpamScore] Signal 3: duplicate_ratio")
    posts = await db.get_posts_by_account(account_id, limit=50)
    texts = [p["text"] for p in posts if p.get("text")]

    duplicate_ratio = 0.0
    if len(texts) >= 2:
        pair_count = 0
        dup_count = 0
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                pair_count += 1
                sim = difflib.SequenceMatcher(None, texts[i], texts[j]).ratio()
                if sim > 0.80:
                    dup_count += 1
        duplicate_ratio = dup_count / pair_count if pair_count else 0.0
    print(f"[SpamScore]   duplicate_ratio = {duplicate_ratio:.4f}")

    # ------------------------------------------------------------------
    # Signal 4 — report_count_normalized
    #   open reports / 10, capped at 1.0
    # ------------------------------------------------------------------
    print("[SpamScore] Signal 4: report_count")
    report_count = await db.count_open_reports("account", account_id)
    report_count_normalized = min(report_count / 10.0, 1.0)
    print(f"[SpamScore]   report_count = {report_count}, normalized = {report_count_normalized:.4f}")

    # ------------------------------------------------------------------
    # Weighted formula  → 0-100 scale
    # ------------------------------------------------------------------
    score = (
        0.40 * follow_spam_ratio
        + 0.25 * age_velocity
        + 0.20 * duplicate_ratio
        + 0.15 * report_count_normalized
    ) * 100

    score = round(min(score, 100.0), 2)

    # Band assignment
    if score < 40:
        band = "clean"
    elif score <= 75:
        band = "flagged_for_review"
    else:
        band = "auto_suspend"

    print(f"[SpamScore] Final score: {score}, band: {band}")

    # Persist
    if band == "auto_suspend":
        print(f"[SpamScore] AUTO-SUSPENDING account {account_id}")
        await db.update_account(account_id, {"status": "suspended", "spam_score": score})
    else:
        await db.update_account(account_id, {"spam_score": score})

    return {
        "score": score,
        "band": band,
        "signals": {
            "follow_spam_ratio": round(follow_spam_ratio, 4),
            "age_velocity": round(age_velocity, 4),
            "duplicate_ratio": round(duplicate_ratio, 4),
            "report_count": report_count,
        },
    }
