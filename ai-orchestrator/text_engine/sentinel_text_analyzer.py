"""
SENTINEL Text Analyzer — Core LangChain Module
================================================
Single-pass multi-task text analysis using structured output.

All inference is routed through Cloud LLM APIs (Google Gemini by default).
No local model loading — preserves GPU VRAM for the vision engine.
"""

import os
import logging
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

from text_engine.schemas import SentinelTextAnalysis
from text_engine.prompts import SENTINEL_TEXT_PROMPT

# Load .env from the ai-orchestrator root
load_dotenv()

logger = logging.getLogger("sentinel.text_engine")


from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

def _build_chain():
    """
    Construct the LangChain analysis chain with 3-tier fallbacks:
    Gemini 2.0 Flash -> Groq Llama 3.1 8B -> OpenAI GPT-4o-mini
    """
    google_key = os.getenv("GOOGLE_API_KEY")
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if not google_key:
        logger.warning("GOOGLE_API_KEY is not set.")

    # 1. Primary Engine: Gemini
    primary_llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=google_key,
        temperature=0.0,
        max_retries=0, # Fail instantly on 429 to trigger Groq fallback
    ).with_structured_output(SentinelTextAnalysis)

    # 2. First Fallback: Groq
    fallback_groq = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=groq_key,
        temperature=0.0,
    ).with_structured_output(SentinelTextAnalysis)

    # 3. Second Fallback: OpenAI
    fallback_openai = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=openai_key,
        temperature=0.0,
    ).with_structured_output(SentinelTextAnalysis)

    # Combine with fallbacks
    robust_llm = primary_llm.with_fallbacks([fallback_groq, fallback_openai])

    chain = SENTINEL_TEXT_PROMPT | robust_llm
    return chain


# Module-level chain singleton (lazy-initialized)
_chain = None


def _get_chain():
    """Return the cached chain, building it on first access."""
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain


async def analyze_text(text: str) -> SentinelTextAnalysis:
    """
    Perform single-pass multi-task analysis on the provided text.

    Args:
        text: The raw text content to analyze.

    Returns:
        SentinelTextAnalysis: Validated Pydantic model containing:
            - ai_detection: AI generation detection results
            - safety: Harm & safety assessment results
            - domain: Domain classification results

    Raises:
        EnvironmentError: If GOOGLE_API_KEY is not configured.
        ValueError: If the text is empty.
    """
    if not text or not text.strip():
        raise ValueError("Cannot analyze empty text.")

    logger.info("Starting text analysis (%d characters)", len(text))

    chain = _get_chain()
    result = await chain.ainvoke({"text": text})

    logger.info(
        "Analysis complete — AI: %s (conf=%d), Risk: %s (%d), Domain: %s",
        result.ai_detection.is_ai_generated,
        result.ai_detection.confidence_score,
        result.safety.risk_level.value,
        result.safety.risk_score,
        result.domain.primary_topic.value,
    )

    return result


def analyze_text_sync(text: str) -> SentinelTextAnalysis:
    """
    Synchronous wrapper for analyze_text.
    Useful for standalone test scripts outside of an async context.

    Args:
        text: The raw text content to analyze.

    Returns:
        SentinelTextAnalysis: Validated analysis results.
    """
    if not text or not text.strip():
        raise ValueError("Cannot analyze empty text.")

    logger.info("Starting text analysis [sync] (%d characters)", len(text))

    chain = _get_chain()
    result = chain.invoke({"text": text})

    logger.info(
        "Analysis complete — AI: %s (conf=%d), Risk: %s (%d), Domain: %s",
        result.ai_detection.is_ai_generated,
        result.ai_detection.confidence_score,
        result.safety.risk_level.value,
        result.safety.risk_score,
        result.domain.primary_topic.value,
    )

    return result
