"""
Sentinel — Role 3: Spam, Abuse & Visual Moderation Service.

FastAPI app with three endpoints per the Cross-Role API Contract:

  POST /moderate/image          { post_id, image_url }
    → { status, labels[], deepfake_confidence, disclosed_ai_content }

  POST /moderate/account-score  { account_id }
    → { score, band, signals }

  POST /report                  { target_type, target_id, reason, reporter_id }
    → { report_id, routed_to }

Run:  cd moderation_service && uvicorn app:app --host 0.0.0.0 --port 8002 --reload
"""

import os

from dotenv import load_dotenv

load_dotenv()  # Load .env before any other import reads env vars

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

import nsfw
import provenance
import deepfake
import spam_score
import reports
import db

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Sentinel Moderation Service",
    description="Role 3 — Spam, Abuse & Visual Moderation",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# Request / Response schemas  (fixed — matches Cross-Role API Contract)
# ---------------------------------------------------------------------------


class ModerateImageRequest(BaseModel):
    post_id: str
    image_url: str


class ModerateImageResponse(BaseModel):
    status: str                  # "allowed" | "blocked"
    labels: list[str]
    deepfake_confidence: float
    disclosed_ai_content: bool


class AccountScoreRequest(BaseModel):
    account_id: str


class AccountScoreResponse(BaseModel):
    score: float
    band: str
    signals: dict


class ReportRequest(BaseModel):
    target_type: str   # "account" | "post"
    target_id: str
    reason: str        # "spam" | "nudity" | "18+" | "misleading"
    reporter_id: str


class ReportResponse(BaseModel):
    report_id: str
    routed_to: str     # "role2" | "role3"


# ---------------------------------------------------------------------------
# POST /moderate/image
# ---------------------------------------------------------------------------


@app.post("/moderate/image", response_model=ModerateImageResponse)
async def moderate_image(req: ModerateImageRequest):
    """
    Sequential, early-exit image moderation pipeline.
    Steps: NudeNet → c2pa → Deepfake (full-image + face-level).
    """
    print(f"\n{'=' * 60}")
    print(f"[/moderate/image] post_id={req.post_id}  image_url={req.image_url}")
    print(f"{'=' * 60}")

    # ---- Download image ----
    print("[Pipeline] Downloading image...")
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(req.image_url)
            resp.raise_for_status()
            image_bytes = resp.content
        print(f"[Pipeline] Downloaded {len(image_bytes)} bytes")
    except Exception as exc:
        print(f"[Pipeline] Image download FAILED: {exc}")
        raise HTTPException(status_code=400, detail=f"Failed to download image: {exc}")

    labels: list[str] = []
    deepfake_confidence: float = 0.0
    disclosed_ai_content: bool = False

    # ---- Step 1: NudeNet ----
    print("[Pipeline] Step 1: NudeNet NSFW detection")
    nsfw_result = nsfw.analyze(image_bytes)

    if nsfw_result["status"] == "blocked":
        print("[Pipeline] EARLY EXIT — blocked by NudeNet")
        await db.update_post(req.post_id, {
            "image_moderation_status": "blocked",
            "image_labels": nsfw_result["labels"],
            "visibility": "blocked",
        })
        return ModerateImageResponse(
            status="blocked",
            labels=nsfw_result["labels"],
            deepfake_confidence=0.0,
            disclosed_ai_content=False,
        )

    labels.extend(nsfw_result["labels"])

    # ---- Step 2: c2pa provenance ----
    print("[Pipeline] Step 2: c2pa provenance check")
    has_manifest = provenance.check_provenance(image_bytes)
    if has_manifest:
        labels.append("disclosed_ai_content")
        disclosed_ai_content = True
    print(f"[Pipeline] disclosed_ai_content={disclosed_ai_content}")

    # ---- Steps 3-4: Deepfake detection ----
    print("[Pipeline] Steps 3-4: deepfake detection (full + face)")
    df_result = deepfake.analyze(image_bytes)
    deepfake_confidence = df_result["deepfake_confidence"]
    labels.extend(df_result["labels"])

    # ---- Final verdict ----
    status = "allowed"
    visibility = "labeled" if labels else "public"
    print(f"[Pipeline] DONE — status={status}, labels={labels}, "
          f"deepfake_confidence={deepfake_confidence}")

    await db.update_post(req.post_id, {
        "image_moderation_status": status,
        "image_labels": labels,
        "visibility": visibility,
    })

    return ModerateImageResponse(
        status=status,
        labels=labels,
        deepfake_confidence=deepfake_confidence,
        disclosed_ai_content=disclosed_ai_content,
    )


# ---------------------------------------------------------------------------
# POST /moderate/account-score
# ---------------------------------------------------------------------------


@app.post("/moderate/account-score", response_model=AccountScoreResponse)
async def moderate_account_score(req: AccountScoreRequest):
    """Compute spam score for an account."""
    print(f"\n{'=' * 60}")
    print(f"[/moderate/account-score] account_id={req.account_id}")
    print(f"{'=' * 60}")

    result = await spam_score.compute_score(req.account_id)
    return AccountScoreResponse(**result)


# ---------------------------------------------------------------------------
# POST /report
# ---------------------------------------------------------------------------


@app.post("/report", response_model=ReportResponse)
async def create_report(req: ReportRequest):
    """Create a report and route to the appropriate service."""
    print(f"\n{'=' * 60}")
    print(f"[/report] target_type={req.target_type}  target_id={req.target_id}  "
          f"reason={req.reason}  reporter_id={req.reporter_id}")
    print(f"{'=' * 60}")

    result = await reports.create_report(
        target_type=req.target_type,
        target_id=req.target_id,
        reason=req.reason,
        reporter_id=req.reporter_id,
    )
    return ReportResponse(**result)


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8002))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
