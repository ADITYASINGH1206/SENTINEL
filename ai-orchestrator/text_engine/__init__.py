"""
SENTINEL Text Engine
====================
LangChain-powered text analysis module for AI generation detection,
harm/safety assessment, and domain classification.

All inference is routed through Cloud LLM APIs — no local model loading.
"""

from text_engine.schemas import (
    SentinelTextAnalysis,
    AIGenerationDetection,
    HarmSafetyAssessment,
    DomainClassification,
    StyleMarker,
    RiskLevel,
    HarmCategory,
    DomainTopic,
)
from text_engine.sentinel_text_analyzer import analyze_text

__all__ = [
    "analyze_text",
    "SentinelTextAnalysis",
    "AIGenerationDetection",
    "HarmSafetyAssessment",
    "DomainClassification",
    "StyleMarker",
    "RiskLevel",
    "HarmCategory",
    "DomainTopic",
]
