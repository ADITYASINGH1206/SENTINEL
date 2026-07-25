"""
Report queue + routing.

Spec §Role 3 — POST /report:
  1. Insert Report row, status: open.
  2. reason = "misleading" → forward to Role 2's service.
  3. Any other reason → trigger account-score recompute.
  4. Return { report_id, routed_to: "role2" | "role3" }.
"""

import os

import httpx

import db
import spam_score

ROLE2_SERVICE_URL = os.environ.get("ROLE2_SERVICE_URL", "http://localhost:8001")


async def create_report(
    target_type: str,
    target_id: str,
    reason: str,
    reporter_id: str,
) -> dict:
    """
    Insert a report and route it.

    Returns
    -------
    dict  { report_id: str, routed_to: "role2" | "role3" }
    """
    print(f"[Reports] Creating report: target_type={target_type}, "
          f"target_id={target_id}, reason={reason}, reporter_id={reporter_id}")

    # 1. Insert Report row
    report_id = await db.insert_report({
        "target_type": target_type,
        "target_id": target_id,
        "reason": reason,
        "reporter_id": reporter_id,
        "status": "open",
    })
    print(f"[Reports] Report {report_id} inserted")

    # 2. Route based on reason
    if reason == "misleading":
        print(f"[Reports] Routing to Role 2 ({ROLE2_SERVICE_URL})")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{ROLE2_SERVICE_URL}/analyze/text",
                    json={
                        "target_type": target_type,
                        "target_id": target_id,
                        "reason": reason,
                        "reporter_id": reporter_id,
                    },
                )
                print(f"[Reports] Role 2 responded: {resp.status_code}")
        except Exception as exc:
            print(f"[Reports] Failed to forward to Role 2: {exc}")

        return {"report_id": report_id, "routed_to": "role2"}

    # 3. Any other reason → recompute account-score
    print("[Reports] Triggering account-score recompute")

    if target_type == "account":
        account_id = target_id
    else:
        # Target is a post — look up the owning account
        post = await db.get_post(target_id)
        account_id = post.get("account_id") if post else None

    if account_id:
        await spam_score.compute_score(account_id)
    else:
        print(f"[Reports] Could not resolve account_id for target {target_id}")

    return {"report_id": report_id, "routed_to": "role3"}
