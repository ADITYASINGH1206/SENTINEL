"""
Deepfake / AI-generated image detection — SwinV2 via ONNX Runtime, CPU.

Model: haywoodsloan/ai-image-detector-deploy (SwinV2), converted to ONNX FP16.
Loaded from: models/swinv2_deepfake/model.onnx

Pipeline (spec §Role 3, step 3):
  Single-pass whole-image classification — no face detection, no YOLO, no
  affine-warp.  Fake confidence >65% → labels += "ai_generated_image".
"""

import io
import json
import os

import numpy as np
from PIL import Image

import onnxruntime as ort

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_VERSION = "swinv2-haywoodsloan-v1"

_MODEL_PATH = os.environ.get(
    "SWINV2_MODEL_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "swinv2_deepfake", "model.onnx"),
)
_PREPROCESSOR_PATH = os.environ.get(
    "SWINV2_PREPROCESSOR_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "swinv2_deepfake", "preprocessor_config.json"),
)
_LABELS_PATH = os.environ.get(
    "SWINV2_LABELS_PATH",
    os.path.join(os.path.dirname(__file__), "..", "models", "swinv2_deepfake", "id2label.json"),
)

# Threshold: Fake confidence above this → label as ai_generated_image
FAKE_THRESHOLD = 0.65

# ---------------------------------------------------------------------------
# Lazy-loaded session & config
# ---------------------------------------------------------------------------
_session: ort.InferenceSession | None = None
_preprocess_config: dict | None = None
_id2label: dict | None = None


def _get_session() -> ort.InferenceSession:
    global _session
    if _session is None:
        model_path = os.path.abspath(_MODEL_PATH)
        print(f"[Deepfake] Loading SwinV2 ONNX model from {model_path} ...")
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"SwinV2 ONNX model not found at {model_path}. "
                f"Run: python scripts/convert_to_onnx.py --model swinv2_deepfake"
            )
        _session = ort.InferenceSession(
            model_path, providers=["CPUExecutionProvider"]
        )
        inp = _session.get_inputs()[0]
        print(f"[Deepfake] Model loaded. Input: {inp.name} {inp.shape} {inp.type}")
    return _session


def _get_preprocess_config() -> dict:
    global _preprocess_config
    if _preprocess_config is None:
        cfg_path = os.path.abspath(_PREPROCESSOR_PATH)
        if os.path.exists(cfg_path):
            with open(cfg_path, "r") as f:
                _preprocess_config = json.load(f)
            print(f"[Deepfake] Loaded preprocessor config from {cfg_path}")
        else:
            # Sensible defaults for SwinV2
            _preprocess_config = {
                "size": {"height": 256, "width": 256},
                "image_mean": [0.485, 0.456, 0.406],
                "image_std": [0.229, 0.224, 0.225],
                "do_rescale": True,
                "rescale_factor": 1.0 / 255.0,
            }
            print(f"[Deepfake] Using default preprocessor config (file not found: {cfg_path})")
    return _preprocess_config


def _get_id2label() -> dict:
    global _id2label
    if _id2label is None:
        labels_path = os.path.abspath(_LABELS_PATH)
        if os.path.exists(labels_path):
            with open(labels_path, "r") as f:
                _id2label = json.load(f)
            print(f"[Deepfake] Loaded label mapping: {_id2label}")
        else:
            # Common default for binary deepfake classifiers
            _id2label = {"0": "Real", "1": "Fake"}
            print(f"[Deepfake] Using default label mapping (file not found: {labels_path})")
    return _id2label


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------


def _preprocess(pil_image: Image.Image) -> np.ndarray:
    """
    Resize, normalize, and convert PIL image to NCHW float32 tensor.
    Uses the model's preprocessor_config.json for exact params.
    """
    cfg = _get_preprocess_config()

    # Resize
    size = cfg.get("size", {})
    h = size.get("height", 256)
    w = size.get("width", 256)
    img = pil_image.resize((w, h), Image.BILINEAR)

    # To numpy HWC float
    arr = np.array(img, dtype=np.float32)

    # Rescale 0-255 → 0-1
    if cfg.get("do_rescale", True):
        factor = cfg.get("rescale_factor", 1.0 / 255.0)
        arr = arr * factor

    # Normalize
    mean = np.array(cfg.get("image_mean", [0.485, 0.456, 0.406]), dtype=np.float32)
    std = np.array(cfg.get("image_std", [0.229, 0.224, 0.225]), dtype=np.float32)
    arr = (arr - mean) / std

    # HWC → NCHW
    arr = arr.transpose(2, 0, 1)  # CHW
    arr = np.expand_dims(arr, axis=0)  # NCHW

    return arr


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def analyze(image_bytes: bytes) -> dict:
    """
    Full deepfake analysis — single pass on the whole image.

    Returns
    -------
    dict  { deepfake_confidence: float,
            deepfake_model_version: str,
            labels: list[str] }
    """
    print("[Deepfake] Starting SwinV2 deepfake analysis...")

    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    print(f"[Deepfake] Image size: {pil_image.size}")

    # Preprocess
    input_tensor = _preprocess(pil_image)
    print(f"[Deepfake] Input tensor shape: {input_tensor.shape}")

    # Run inference
    session = _get_session()
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    logits = outputs[0][0]  # shape: (num_classes,)
    print(f"[Deepfake] Raw logits: {logits}")

    # Softmax
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / exp_logits.sum()
    print(f"[Deepfake] Probabilities: {probs}")

    # Find "Fake" / "AI" label confidence
    id2label = _get_id2label()
    fake_conf = 0.0
    for idx, prob in enumerate(probs):
        label = id2label.get(str(idx), f"class_{idx}").lower()
        print(f"[Deepfake]   {label}: {prob:.4f}")
        if label in ("fake", "ai", "ai-generated", "artificial"):
            fake_conf = float(prob)

    print(f"[Deepfake] Final Fake confidence: {fake_conf:.4f}")

    labels: list[str] = []
    if fake_conf > FAKE_THRESHOLD:
        labels.append("ai_generated_image")
        print("[Deepfake] → label: ai_generated_image")

    return {
        "deepfake_confidence": round(fake_conf, 4),
        "deepfake_model_version": MODEL_VERSION,
        "labels": labels,
    }
