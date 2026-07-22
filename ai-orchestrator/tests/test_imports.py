"""Verify the full import chain loads without errors (no API key needed)."""
import sys
sys.path.insert(0, ".")

# 1. Schemas
from text_engine.schemas import SentinelTextAnalysis
print("1. text_engine.schemas OK")

# 2. Prompts
from text_engine.prompts import SENTINEL_TEXT_PROMPT
messages = SENTINEL_TEXT_PROMPT.format_messages(text="Hello world")
assert len(messages) == 2
assert "SENTINEL" in messages[0].content
assert "Hello world" in messages[1].content
print("2. text_engine.prompts OK (template renders correctly)")

# 3. Analyzer module (import only — chain build requires API key)
from text_engine.sentinel_text_analyzer import analyze_text, analyze_text_sync
print("3. text_engine.sentinel_text_analyzer OK (functions importable)")

# 4. Package-level imports
from text_engine import analyze_text, SentinelTextAnalysis, StyleMarker, RiskLevel
print("4. text_engine.__init__ OK (all public exports work)")

# 5. FastAPI app imports
from app import app, TextAnalysisRequest, analyze_text_endpoint, analyze_media
routes = [r.path for r in app.routes]
assert "/api/v1/analyze" in routes, f"/api/v1/analyze not found in {routes}"
assert "/api/v1/analyze/text" in routes, f"/api/v1/analyze/text not found in {routes}"
print(f"5. FastAPI app OK (routes: {[r for r in routes if '/api/' in r]})")

print()
print("ALL IMPORT CHAIN TESTS PASSED")
