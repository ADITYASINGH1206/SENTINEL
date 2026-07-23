"""Quick offline schema validation - no API key needed."""
import sys
sys.path.insert(0, ".")

from text_engine.schemas import (
    SentinelTextAnalysis, AIGenerationDetection, HarmSafetyAssessment,
    DomainClassification, StyleMarker, RiskLevel, HarmCategory, DomainTopic,
)

print("1. All schema imports OK")

obj = SentinelTextAnalysis(
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
        sub_topics=["ai", "ml"],
    ),
)
print("2. Schema construction OK")

j = obj.model_dump_json()
rebuilt = SentinelTextAnalysis.model_validate_json(j)
assert rebuilt == obj
print("3. JSON round-trip OK")

print()
print("Sample output JSON:")
print(obj.model_dump_json(indent=2))

# Test validation constraints
try:
    bad = AIGenerationDetection(
        is_ai_generated=True, confidence_score=150,
        detected_markers=[], reasoning="Test"
    )
    print("4. FAIL: Should have rejected confidence_score=150")
    sys.exit(1)
except Exception as e:
    print(f"4. Validation constraint OK (rejected confidence_score=150)")

try:
    bad_domain = DomainClassification(primary_topic=DomainTopic.FINANCE, sub_topics=["only_one"])
    print("5. FAIL: Should have rejected sub_topics with 1 item")
    sys.exit(1)
except Exception as e:
    print(f"5. Validation constraint OK (rejected sub_topics with 1 item)")

print()
print("ALL OFFLINE SCHEMA TESTS PASSED")
