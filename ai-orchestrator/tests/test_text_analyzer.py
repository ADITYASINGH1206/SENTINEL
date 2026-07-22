"""
SENTINEL Text Engine — Isolated Verification Script
=====================================================
Per workspace rules: "Always generate an isolated verification script for
any new text pipeline features before attempting to integrate them into
the main application routing."

This script tests the text analyzer directly (no FastAPI dependency).
Run from the ai-orchestrator directory:

    python tests/test_text_analyzer.py

Requires: GOOGLE_API_KEY set in .env or environment.
"""

import sys
import os
import json
import logging

# Ensure the ai-orchestrator root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from text_engine.schemas import SentinelTextAnalysis, RiskLevel
from text_engine.sentinel_text_analyzer import analyze_text_sync

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "name": "AI-Generated Text",
        "text": (
            "It's important to note that artificial intelligence has made remarkable strides "
            "in recent years. Furthermore, the implications of these advancements are "
            "far-reaching and multifaceted. Additionally, experts suggest that the pace of "
            "innovation will only continue to accelerate. However, it should be noted that "
            "there are significant ethical considerations that must be carefully examined. "
            "In conclusion, the future of AI presents both unprecedented opportunities and "
            "considerable challenges that society must navigate thoughtfully."
        ),
        "assertions": {
            "expect_ai_generated": True,
            "min_confidence": 40,
        },
    },
    {
        "name": "Hate Speech / High Risk",
        "text": (
            "All members of [ethnic group] are criminals and should be deported immediately. "
            "They are destroying our country and poisoning our culture. "
            "Real patriots need to rise up and take action against these subhumans."
        ),
        "assertions": {
            "min_risk_score": 60,
            "min_risk_level": RiskLevel.HIGH,
            "expect_flagged": ["hate_speech"],
        },
    },
    {
        "name": "Benign News Article",
        "text": (
            "The Federal Reserve held interest rates steady on Wednesday, as widely expected, "
            "signaling that officials remain cautious about inflation trends. Chair Jerome "
            "Powell noted that the labor market remains robust, with unemployment at 3.7%, "
            "but emphasized that future decisions will depend on incoming economic data. "
            "Markets reacted positively, with the S&P 500 gaining 0.4% in afternoon trading."
        ),
        "assertions": {
            "max_risk_score": 40,
            "expect_domain": "finance",
        },
    },
]


def print_divider(char: str = "━", width: int = 70):
    print(char * width)


def print_result(name: str, result: SentinelTextAnalysis):
    """Pretty-print the analysis result."""
    print_divider()
    print(f"📋 TEST: {name}")
    print_divider("─")

    # AI Detection
    ai = result.ai_detection
    ai_icon = "🤖" if ai.is_ai_generated else "👤"
    print(f"  {ai_icon} AI Detection: is_ai_generated={ai.is_ai_generated}, "
          f"confidence={ai.confidence_score}%")
    if ai.detected_markers:
        markers = ", ".join(m.value for m in ai.detected_markers)
        print(f"     Markers: {markers}")
    print(f"     Reasoning: {ai.reasoning}")

    # Safety
    s = result.safety
    risk_icons = {
        RiskLevel.SAFE: "✅",
        RiskLevel.LOW: "🟢",
        RiskLevel.MODERATE: "🟡",
        RiskLevel.HIGH: "🟠",
        RiskLevel.CRITICAL: "🔴",
    }
    icon = risk_icons.get(s.risk_level, "❓")
    print(f"  {icon} Safety: risk_score={s.risk_score}, risk_level={s.risk_level.value}")
    if s.flagged_categories:
        cats = ", ".join(c.value for c in s.flagged_categories)
        print(f"     Flagged: {cats}")
    print(f"     Summary: {s.summary}")

    # Domain
    d = result.domain
    print(f"  🏷️  Domain: primary={d.primary_topic.value}, "
          f"sub_topics={d.sub_topics}")

    print()


def validate_assertions(name: str, result: SentinelTextAnalysis, assertions: dict) -> bool:
    """Validate assertions and return True if all pass."""
    passed = True

    if "expect_ai_generated" in assertions:
        expected = assertions["expect_ai_generated"]
        actual = result.ai_detection.is_ai_generated
        if actual != expected:
            print(f"  ❌ FAIL: Expected is_ai_generated={expected}, got {actual}")
            passed = False

    if "min_confidence" in assertions:
        min_conf = assertions["min_confidence"]
        actual = result.ai_detection.confidence_score
        if actual < min_conf:
            print(f"  ❌ FAIL: Expected confidence >= {min_conf}, got {actual}")
            passed = False

    if "min_risk_score" in assertions:
        min_risk = assertions["min_risk_score"]
        actual = result.safety.risk_score
        if actual < min_risk:
            print(f"  ❌ FAIL: Expected risk_score >= {min_risk}, got {actual}")
            passed = False

    if "max_risk_score" in assertions:
        max_risk = assertions["max_risk_score"]
        actual = result.safety.risk_score
        if actual > max_risk:
            print(f"  ❌ FAIL: Expected risk_score <= {max_risk}, got {actual}")
            passed = False

    if "min_risk_level" in assertions:
        risk_order = [RiskLevel.SAFE, RiskLevel.LOW, RiskLevel.MODERATE,
                      RiskLevel.HIGH, RiskLevel.CRITICAL]
        min_level = assertions["min_risk_level"]
        actual = result.safety.risk_level
        if risk_order.index(actual) < risk_order.index(min_level):
            print(f"  ❌ FAIL: Expected risk_level >= {min_level.value}, got {actual.value}")
            passed = False

    if "expect_flagged" in assertions:
        expected_cats = set(assertions["expect_flagged"])
        actual_cats = {c.value for c in result.safety.flagged_categories}
        missing = expected_cats - actual_cats
        if missing:
            print(f"  ❌ FAIL: Expected flagged categories {missing} not found in {actual_cats}")
            passed = False

    if "expect_domain" in assertions:
        expected = assertions["expect_domain"]
        actual = result.domain.primary_topic.value
        if actual != expected:
            print(f"  ❌ FAIL: Expected domain={expected}, got {actual}")
            passed = False

    if passed:
        print(f"  ✅ All assertions passed for: {name}")

    return passed


def main():
    print()
    print("🛡️  SENTINEL Text Engine — Verification Script")
    print_divider("═")
    print()

    # Schema validation (offline — no API call needed)
    print("📐 Schema validation: Checking Pydantic model construction...", end=" ")
    try:
        from text_engine.schemas import (
            AIGenerationDetection, HarmSafetyAssessment,
            DomainClassification, StyleMarker, HarmCategory, DomainTopic,
        )
        test_obj = SentinelTextAnalysis(
            ai_detection=AIGenerationDetection(
                is_ai_generated=False,
                confidence_score=50,
                detected_markers=[StyleMarker.LOW_PERPLEXITY],
                reasoning="Test",
            ),
            safety=HarmSafetyAssessment(
                risk_score=10,
                risk_level=RiskLevel.SAFE,
                flagged_categories=[],
                summary="Test",
            ),
            domain=DomainClassification(
                primary_topic=DomainTopic.TECHNOLOGY,
                sub_topics=["test_a", "test_b"],
            ),
        )
        # Verify JSON round-trip
        json_str = test_obj.model_dump_json()
        rebuilt = SentinelTextAnalysis.model_validate_json(json_str)
        assert rebuilt == test_obj
        print("✅ PASS")
    except Exception as e:
        print(f"❌ FAIL: {e}")
        sys.exit(1)

    print()

    # Live LLM tests
    all_passed = True
    for tc in TEST_CASES:
        try:
            result = analyze_text_sync(tc["text"])
            print_result(tc["name"], result)
            if not validate_assertions(tc["name"], result, tc["assertions"]):
                all_passed = False
        except Exception as e:
            print(f"  ❌ ERROR in '{tc['name']}': {e}")
            all_passed = False
        print()

    # Summary
    print_divider("═")
    if all_passed:
        print("🎉 All tests passed! The text engine is ready for FastAPI integration.")
    else:
        print("⚠️  Some tests failed. Review the output above.")
    print_divider("═")

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
