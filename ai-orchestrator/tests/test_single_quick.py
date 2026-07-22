"""Single quick test with gemini-2.0-flash-lite to work around quota."""
import sys, os
sys.path.insert(0, ".")
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["TEXT_MODEL_NAME"] = "gemini-2.0-flash-lite"

from text_engine.sentinel_text_analyzer import analyze_text_sync

text = (
    "The Federal Reserve held interest rates steady on Wednesday, signaling "
    "that officials remain cautious about inflation. Chair Jerome Powell noted "
    "the labor market remains robust with unemployment at 3.7 percent."
)

print("Running single test with gemini-2.0-flash-lite...")
try:
    result = analyze_text_sync(text)
    print("SUCCESS!")
    print()
    print(f"AI Detection: is_ai={result.ai_detection.is_ai_generated}, "
          f"confidence={result.ai_detection.confidence_score}%")
    print(f"  Markers: {[m.value for m in result.ai_detection.detected_markers]}")
    print(f"  Reasoning: {result.ai_detection.reasoning}")
    print()
    print(f"Safety: risk_score={result.safety.risk_score}, "
          f"level={result.safety.risk_level.value}")
    print(f"  Flagged: {[c.value for c in result.safety.flagged_categories]}")
    print(f"  Summary: {result.safety.summary}")
    print()
    print(f"Domain: primary={result.domain.primary_topic.value}")
    print(f"  Sub-topics: {result.domain.sub_topics}")
    print()
    print("Full JSON:")
    print(result.model_dump_json(indent=2))
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
