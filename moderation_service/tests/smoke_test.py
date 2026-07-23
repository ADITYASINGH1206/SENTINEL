"""
Smoke test — hit a RUNNING moderation service and print results.

Usage:
  1. Start the service:  cd moderation_service && uvicorn app:app --port 8002
  2. In another terminal: python tests/smoke_test.py

This sends real HTTP requests to all three endpoints and prints
the responses so you can visually verify the contract shapes.
"""

import asyncio
import json
import sys

import httpx

BASE_URL = "http://localhost:8002"

# A small public-domain test image
TEST_IMAGE_URL = "https://raw.githubusercontent.com/ultralytics/yolov5/master/data/images/bus.jpg"


def pretty(label: str, resp: httpx.Response):
    status_icon = "✅" if resp.status_code == 200 else "❌"
    print(f"\n{'=' * 60}")
    print(f"{status_icon}  {label}   [{resp.status_code}]")
    print(f"{'=' * 60}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)


async def main():
    base = sys.argv[1] if len(sys.argv) > 1 else BASE_URL
    print(f"🔧  Smoke-testing moderation service at {base}\n")

    async with httpx.AsyncClient(base_url=base, timeout=60.0) as client:

        # ----- 1. POST /moderate/image -----
        try:
            r = await client.post("/moderate/image", json={
                "post_id": "smoke-test-post-001",
                "image_url": TEST_IMAGE_URL,
            })
            pretty("POST /moderate/image", r)
        except Exception as e:
            print(f"\n❌  POST /moderate/image  →  {e}")

        # ----- 2. POST /moderate/account-score -----
        try:
            r = await client.post("/moderate/account-score", json={
                "account_id": "smoke-test-account-001",
            })
            pretty("POST /moderate/account-score", r)
        except Exception as e:
            print(f"\n❌  POST /moderate/account-score  →  {e}")

        # ----- 3. POST /report (spam) -----
        try:
            r = await client.post("/report", json={
                "target_type": "account",
                "target_id": "smoke-test-account-001",
                "reason": "spam",
                "reporter_id": "smoke-test-reporter",
            })
            pretty("POST /report  (reason=spam)", r)
        except Exception as e:
            print(f"\n❌  POST /report  →  {e}")

        # ----- 4. POST /report (misleading) -----
        try:
            r = await client.post("/report", json={
                "target_type": "post",
                "target_id": "smoke-test-post-001",
                "reason": "misleading",
                "reporter_id": "smoke-test-reporter",
            })
            pretty("POST /report  (reason=misleading)", r)
        except Exception as e:
            print(f"\n❌  POST /report  →  {e}")

    print(f"\n{'=' * 60}")
    print("🏁  Smoke test complete")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
