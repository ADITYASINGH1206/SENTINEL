"""
NudeNet v3 wrapper — ONNX Runtime, CPU.

Thresholds (from spec):
  - Explicit-anatomy confidence >60%  → status: blocked, halt pipeline
  - Confidence 18-60% OR suggestive   → labels += "sensitive_content", continue
"""

import os
import tempfile

from nudenet import NudeDetector


# Explicit anatomy labels — high confidence triggers a block
EXPLICIT_LABELS = frozenset({
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "BUTTOCKS_EXPOSED",
    "ANUS_EXPOSED",
})

# Suggestive labels — presence adds "sensitive_content"
SUGGESTIVE_LABELS = frozenset({
    "FEMALE_BREAST_COVERED",
    "BELLY_EXPOSED",
    "BUTTOCKS_COVERED",
    "FEMALE_GENITALIA_COVERED",
    "MALE_GENITALIA_COVERED",
    "ARMPITS_EXPOSED",
})

# ---------------------------------------------------------------------------
# Lazy-loaded detector
# ---------------------------------------------------------------------------
_detector: NudeDetector | None = None


def _get_detector() -> NudeDetector:
    global _detector
    if _detector is None:
        print("[NudeNet] Loading NudeNet detector (ONNX, CPU)...")
        _detector = NudeDetector()
        print("[NudeNet] Detector loaded.")
    return _detector


def analyze(image_bytes: bytes) -> dict:
    """
    Run NudeNet on raw image bytes.

    Returns
    -------
    dict  { status: "blocked" | "continue",
            labels: list[str],
            explicit_confidence: float }
    """
    print("[NudeNet] Starting NSFW analysis...")
    detector = _get_detector()

    # NudeNet expects a file path — write to a temp file
    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(image_bytes)

        detections = detector.detect(temp_path)
        print(f"[NudeNet] Raw detections: {detections}")
    finally:
        os.unlink(temp_path)

    labels: list[str] = []
    max_explicit_conf = 0.0
    has_suggestive = False

    for det in detections:
        cls = det.get("class", "")
        score = det.get("score", 0.0)

        if cls in EXPLICIT_LABELS:
            max_explicit_conf = max(max_explicit_conf, score)
        elif cls in SUGGESTIVE_LABELS:
            has_suggestive = True

    # --- Threshold logic (spec §Role 3, step 1) ---
    if max_explicit_conf > 0.60:
        print(f"[NudeNet] BLOCKED — explicit confidence {max_explicit_conf:.2%}")
        return {
            "status": "blocked",
            "labels": ["explicit_content"],
            "explicit_confidence": max_explicit_conf,
        }

    if 0.18 <= max_explicit_conf <= 0.60 or has_suggestive:
        labels.append("sensitive_content")
        print(f"[NudeNet] Sensitive content — confidence {max_explicit_conf:.2%}, suggestive={has_suggestive}")

    print(f"[NudeNet] Analysis complete — status: continue, labels: {labels}")
    return {
        "status": "continue",
        "labels": labels,
        "explicit_confidence": max_explicit_conf,
    }
