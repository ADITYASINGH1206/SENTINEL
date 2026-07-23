"""
NudeNet v3 wrapper — ONNX Runtime, CPU.
Loads model from: models/nsfw_nudenet/detector.onnx (or NudeNet default).

Content policy:
  - Private parts exposed (explicit anatomy) → BLOCKED (visibility: blocked)
  - Too much revealing / suggestive content  → BLOCKED (visibility: blocked)
  - Sexy but not revealing content           → LABELED as "18+" / "sensitive_content"
  - Clean content                            → ALLOWED
"""

import os
import tempfile

from nudenet import NudeDetector


# Explicit anatomy labels — any detection at medium-high confidence → BLOCK
EXPLICIT_LABELS = frozenset({
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "BUTTOCKS_EXPOSED",
    "ANUS_EXPOSED",
})

# Highly revealing labels — presence above threshold → BLOCK
REVEALING_LABELS = frozenset({
    "FEMALE_GENITALIA_COVERED",
    "MALE_GENITALIA_COVERED",
})

# Suggestive labels — labeled as 18+ / sensitive but not blocked
SUGGESTIVE_LABELS = frozenset({
    "FEMALE_BREAST_COVERED",
    "BELLY_EXPOSED",
    "BUTTOCKS_COVERED",
    "ARMPITS_EXPOSED",
})

# Thresholds
EXPLICIT_BLOCK_THRESHOLD = 0.60      # Explicit → block
REVEALING_BLOCK_THRESHOLD = 0.50     # Too revealing → block
SUGGESTIVE_LABEL_THRESHOLD = 0.40    # Sexy/suggestive → label as 18+

# ---------------------------------------------------------------------------
# Lazy-loaded detector
# ---------------------------------------------------------------------------
_detector: NudeDetector | str | None = None


def _get_detector() -> NudeDetector | str:
    global _detector
    if _detector is None:
        model_path = os.getenv("NUDENET_MODEL_PATH", "models/nsfw_nudenet/detector.onnx")
        print(f"[NudeNet] Initializing detector with path: {model_path}")
        try:
            if os.path.exists(model_path):
                print(f"[NudeNet] Loading from custom path: {model_path}")
                _detector = NudeDetector(model_path)
            else:
                print(f"[NudeNet] Custom path not found: {model_path}, using default")
                _detector = NudeDetector()
        except Exception as e:
            print(f"[NudeNet] WARNING: Failed to initialize NudeNet (likely model download failed): {e}")
            _detector = "DISABLED"
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
    if detector == "DISABLED":
        print("[NudeNet] Model unavailable, skipping NSFW check.")
        return {
            "status": "continue",
            "labels": [],
            "explicit_confidence": 0.0,
        }

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
    max_revealing_conf = 0.0
    has_suggestive = False

    for det in detections:
        cls = det.get("class", "")
        score = det.get("score", 0.0)

        if cls in EXPLICIT_LABELS:
            max_explicit_conf = max(max_explicit_conf, score)
        elif cls in REVEALING_LABELS:
            max_revealing_conf = max(max_revealing_conf, score)
        elif cls in SUGGESTIVE_LABELS:
            if score >= SUGGESTIVE_LABEL_THRESHOLD:
                has_suggestive = True

    # --- Decision logic ---

    # 1. Private parts exposed → BLOCK
    if max_explicit_conf > EXPLICIT_BLOCK_THRESHOLD:
        print(f"[NudeNet] BLOCKED — explicit content, confidence {max_explicit_conf:.2%}")
        return {
            "status": "blocked",
            "labels": ["explicit_content"],
            "explicit_confidence": max_explicit_conf,
        }

    # 2. Too much revealing (covered genitalia at high confidence) → BLOCK
    if max_revealing_conf > REVEALING_BLOCK_THRESHOLD:
        print(f"[NudeNet] BLOCKED — too revealing, confidence {max_revealing_conf:.2%}")
        return {
            "status": "blocked",
            "labels": ["too_revealing"],
            "explicit_confidence": max_revealing_conf,
        }

    # 3. Sexy / suggestive content → LABEL as 18+ sensitive but allow
    if has_suggestive or (0.18 <= max_explicit_conf <= EXPLICIT_BLOCK_THRESHOLD):
        labels.append("sensitive_content")
        labels.append("18+")
        print(f"[NudeNet] Labeled 18+ — explicit_conf={max_explicit_conf:.2%}, "
              f"suggestive={has_suggestive}")

    print(f"[NudeNet] Analysis complete — status: continue, labels: {labels}")
    return {
        "status": "continue",
        "labels": labels,
        "explicit_confidence": max_explicit_conf,
    }
