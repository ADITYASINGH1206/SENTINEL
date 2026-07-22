from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import time
import logging
import uvicorn

from text_engine.schemas import SentinelTextAnalysis
from text_engine.sentinel_text_analyzer import analyze_text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(title="Sentinel AI Engine")


# ---------------------------------------------------------------------------
# Request model for the text analysis endpoint
# ---------------------------------------------------------------------------

class TextAnalysisRequest(BaseModel):
    """Request body for the text analysis endpoint."""
    text: str


# ---------------------------------------------------------------------------
# Existing media analysis endpoint (UNTOUCHED)
# ---------------------------------------------------------------------------

@app.post("/api/v1/analyze")
async def analyze_media(file: UploadFile = File(...)):
    # Simulate processing (e.g. visual artifact metrics, audio metadata frequencies)
    print(f"[AI Engine] Received file {file.filename} for analysis")
    
    # Simulating long-running AI inference
    time.sleep(2)
    
    # Mock response format as requested
    return {
        "is_fake": False,
        "confidence": 0.94,
        "reasoning": "No structural anomalies detected"
    }


# ---------------------------------------------------------------------------
# NEW: Text analysis endpoint
# ---------------------------------------------------------------------------

@app.post("/api/v1/analyze/text", response_model=SentinelTextAnalysis)
async def analyze_text_endpoint(request: TextAnalysisRequest):
    """
    Perform single-pass multi-task text analysis.

    Returns AI generation detection, harm/safety assessment,
    and domain classification in a single structured response.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text field cannot be empty.")

    try:
        result = await analyze_text(request.text)
        return result
    except EnvironmentError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logging.getLogger("sentinel.api").error("Text analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=5000, reload=True)
