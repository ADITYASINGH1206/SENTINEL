"""
Deepfake detection — SigLIP2 image classifier + YOLOv8n-face crop logic.

All inference runs locally on CPU.  device="cpu" is explicit on every model load.

Pipeline (spec §Role 3, steps 3-4):
  3. prithivMLmods/deepfake-detector-model-v1 on full image.
     Fake confidence >65% → labels += "ai_generated_image".
  4. YOLOv8n-face (conf 0.25). If keypoints: affine-warp to level eyes,
     crop 20% margin. If no keypoints: standard box crop.
     Run cropped face(s) through same deepfake model.
     Final deepfake_confidence = max(full-image, face-level).
"""

import io
import math
import os

import cv2
import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Lazy-loaded models
# ---------------------------------------------------------------------------
_deepfake_classifier = None
_face_model = None


def _get_deepfake_classifier():
    """Load SigLIP2 deepfake classifier (transformers pipeline, CPU)."""
    global _deepfake_classifier
    if _deepfake_classifier is None:
        print("[Deepfake] Loading prithivMLmods/deepfake-detector-model-v1 (CPU)...")
        from transformers import pipeline as hf_pipeline

        _deepfake_classifier = hf_pipeline(
            "image-classification",
            model="prithivMLmods/deepfake-detector-model-v1",
            device="cpu",
        )
        print("[Deepfake] Deepfake classifier loaded.")
    return _deepfake_classifier


def _get_face_model():
    """Load YOLOv8n-face via ultralytics (CPU)."""
    global _face_model
    if _face_model is None:
        print("[Deepfake] Loading YOLOv8n-face (CPU)...")
        try:
            from ultralytics import YOLO

            model_path = os.environ.get("YOLO_FACE_MODEL", "yolov8n-face.pt")
            _face_model = YOLO(model_path)
            print("[Deepfake] YOLOv8n-face loaded.")
        except Exception as exc:
            print(f"[Deepfake] WARNING — could not load YOLOv8n-face: {exc}")
            _face_model = None
    return _face_model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _classify_image(pil_image: Image.Image) -> float:
    """
    Run deepfake classifier on a single PIL image.
    Returns confidence for the 'Fake' label (0.0 on failure).
    """
    try:
        classifier = _get_deepfake_classifier()
        results = classifier(pil_image)
        print(f"[Deepfake]   classification → {results}")
        for r in results:
            if r["label"].lower() in ("fake", "ai"):
                return float(r["score"])
        return 0.0
    except Exception as exc:
        print(f"[Deepfake]   classification FAILED: {exc}")
        return 0.0


def _extract_faces(image_np: np.ndarray) -> list[Image.Image]:
    """
    Detect faces with YOLOv8n-face.
    For each face:
      - If keypoints (left_eye, right_eye) found → cv2.warpAffine to level
        eyes, then crop with 20 % margin.
      - If keypoints missing → standard box crop with 20 % margin.
    Returns list of cropped face PIL images.
    """
    model = _get_face_model()
    if model is None:
        print("[Deepfake] Face model unavailable — skipping face detection")
        return []

    try:
        results = model(image_np, conf=0.25, verbose=False, device="cpu")
        n_faces = len(results[0].boxes)
        print(f"[Deepfake] Face detection: {n_faces} face(s) found")
    except Exception as exc:
        print(f"[Deepfake] Face detection FAILED: {exc}")
        return []

    faces: list[Image.Image] = []
    h, w = image_np.shape[:2]
    boxes = results[0].boxes
    keypoints = results[0].keypoints

    for i, box in enumerate(boxes):
        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
        bw, bh = x2 - x1, y2 - y1

        # Check for usable keypoints (at least left_eye + right_eye)
        has_kp = (
            keypoints is not None
            and keypoints.xy is not None
            and len(keypoints.xy) > i
            and keypoints.xy[i].shape[0] >= 2
        )

        if has_kp:
            kps = keypoints.xy[i].cpu().numpy()
            left_eye, right_eye = kps[0], kps[1]

            dx = right_eye[0] - left_eye[0]
            dy = right_eye[1] - left_eye[1]
            angle = math.degrees(math.atan2(dy, dx))

            cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
            M = cv2.getRotationMatrix2D((cx, cy), angle, 1.0)
            warped = cv2.warpAffine(image_np, M, (w, h))

            print(f"[Deepfake]   face {i}: keypoints found, affine-warp angle={angle:.1f}°")
            source = warped
        else:
            print(f"[Deepfake]   face {i}: no keypoints, using box crop")
            source = image_np

        # Crop with 20 % margin
        margin = 0.20
        mx, my = int(bw * margin), int(bh * margin)
        cx1 = max(0, x1 - mx)
        cy1 = max(0, y1 - my)
        cx2 = min(w, x2 + mx)
        cy2 = min(h, y2 + my)

        crop = source[cy1:cy2, cx1:cx2]
        if crop.size > 0:
            face_pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            faces.append(face_pil)

    return faces


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze(image_bytes: bytes) -> dict:
    """
    Full deepfake analysis pipeline.

    Returns
    -------
    dict  { deepfake_confidence: float, labels: list[str] }
    """
    print("[Deepfake] Starting deepfake analysis...")

    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_np = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    # --- Step 3: full-image classification ---
    print("[Deepfake] Step 3: full-image classification")
    full_conf = _classify_image(pil_image)
    print(f"[Deepfake] Full-image Fake confidence: {full_conf:.4f}")

    # --- Step 4: face-level classification ---
    print("[Deepfake] Step 4: face detection + per-face classification")
    faces = _extract_faces(image_np)

    max_face_conf = 0.0
    for idx, face in enumerate(faces):
        print(f"[Deepfake]   classifying face {idx}...")
        conf = _classify_image(face)
        print(f"[Deepfake]   face {idx} Fake confidence: {conf:.4f}")
        max_face_conf = max(max_face_conf, conf)

    # Final confidence = max of full-image and all face-level results
    final_conf = max(full_conf, max_face_conf)
    print(f"[Deepfake] Final deepfake_confidence: {final_conf:.4f}")

    labels: list[str] = []
    if final_conf > 0.65:
        labels.append("ai_generated_image")
        print("[Deepfake] → label: ai_generated_image")

    return {
        "deepfake_confidence": round(final_conf, 4),
        "labels": labels,
    }
