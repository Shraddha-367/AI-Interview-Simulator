"""
Answer Evaluator Service
------------------------
Uses Google Gemini to score a candidate's interview answer on four
axes, compute a weighted overall score, detect keyword coverage, and
provide qualitative feedback with adaptive difficulty adjustment.
"""

import json
import os
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import ValidationError

from models.evaluation_model import (
    EvaluationResult,
    Feedback,
    KeywordCoverage,
    Scores,
)

load_dotenv()

# ──────────────────────────────────────────────
# Gemini client (lazy-initialized)
# ──────────────────────────────────────────────
_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    """Return (and lazily create) the Gemini client."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Add it to your .env file or environment variables."
            )
        _client = genai.Client(api_key=api_key)
    return _client


# ══════════════════════════════════════════════
#  EVALUATION SYSTEM PROMPT
# ══════════════════════════════════════════════

EVALUATION_PROMPT: str = (
    "You are an expert interview coach and answer evaluator. "
    "You will receive an interview question, the candidate's spoken answer, "
    "a list of expected keywords, and any filler words detected in the answer.\n\n"
    "Score the answer on FOUR axes, each from 0 to 100:\n\n"
    "1. **content** — Relevance to the question and coverage of the expected "
    "keywords. Award higher scores when the candidate addresses the core topic "
    "and naturally incorporates the expected keywords.\n"
    "2. **grammar** — Correctness of language: proper sentence structure, "
    "tense consistency, subject-verb agreement, and appropriate vocabulary.\n"
    "3. **clarity** — How well-structured, concise, and easy to follow the "
    "answer is. Penalise rambling, repetition, and disorganised responses.\n"
    "4. **confidence** — Directness and assertiveness. Penalise excessive "
    "hedging language (e.g. 'I think maybe', 'sort of', 'kind of') and "
    "penalise heavily for each filler word provided in the filler_words list.\n\n"
    "Additionally provide:\n"
    "- **keyword_coverage** — an object with two arrays:\n"
    "  • `found`: expected keywords that appear (or are closely paraphrased) "
    "in the answer.\n"
    "  • `missed`: expected keywords that are absent from the answer.\n"
    "- **feedback** — an object with three arrays of short strings:\n"
    "  • `strengths`: 2-3 things the candidate did well.\n"
    "  • `weaknesses`: 2-3 areas for improvement.\n"
    "  • `improvement_tips`: 2-3 actionable suggestions.\n\n"
    "Return ONLY a JSON object with keys: `scores`, `keyword_coverage`, "
    "`feedback`.  The `scores` object must contain: `content`, `grammar`, "
    "`clarity`, `confidence` (all ints 0-100). Do NOT include an `overall` "
    "key — the backend will compute it.\n\n"
    "No markdown, no explanation — raw JSON only."
)


# ──────────────────────────────────────────────
# Scoring weights
# ──────────────────────────────────────────────
_WEIGHTS = {
    "content": 0.40,
    "grammar": 0.20,
    "clarity": 0.25,
    "confidence": 0.15,
}


# ──────────────────────────────────────────────
# Adaptive difficulty logic
# ──────────────────────────────────────────────
def _next_difficulty(overall: float, current_difficulty: str) -> str:
    """Return the recommended difficulty for the next question."""
    if overall >= 80 and current_difficulty != "hard":
        return "hard"
    if overall <= 50 and current_difficulty != "easy":
        return "easy"
    return current_difficulty


# ──────────────────────────────────────────────
# Fallback evaluation
# ──────────────────────────────────────────────
def _fallback_evaluation(
    expected_keywords: list[str],
    current_difficulty: str,
) -> dict[str, Any]:
    """Return a neutral evaluation when the API call fails."""
    overall = 50.0
    return {
        "scores": {
            "content": 50,
            "grammar": 50,
            "clarity": 50,
            "confidence": 50,
            "overall": overall,
        },
        "keyword_coverage": {"found": [], "missed": expected_keywords},
        "feedback": {
            "strengths": ["Answer was provided."],
            "weaknesses": ["Could not fully evaluate — please try again."],
            "improvement_tips": ["Re-submit your answer for a detailed evaluation."],
        },
        "next_difficulty": _next_difficulty(overall, current_difficulty),
    }


# ──────────────────────────────────────────────
# Build the user prompt
# ──────────────────────────────────────────────
def _build_eval_user_prompt(
    question_text: str,
    answer_text: str,
    expected_keywords: list[str],
    filler_words: list[str],
) -> str:
    keywords_str = ", ".join(expected_keywords) if expected_keywords else "none"
    fillers_str = ", ".join(filler_words) if filler_words else "none detected"

    return (
        f"### Interview Question\n{question_text}\n\n"
        f"### Candidate's Answer\n{answer_text}\n\n"
        f"### Expected Keywords\n{keywords_str}\n\n"
        f"### Filler Words Detected\n{fillers_str}\n"
    )


# ──────────────────────────────────────────────
# Main public function
# ──────────────────────────────────────────────
async def evaluate_answer(
    question_text: str,
    answer_text: str,
    expected_keywords: list[str],
    current_difficulty: str,
    filler_words: list[str] | None = None,
) -> dict[str, Any]:
    """
    Evaluate a candidate's answer using Google Gemini.

    Parameters
    ----------
    question_text : str
        The interview question that was asked.
    answer_text : str
        The candidate's transcribed answer.
    expected_keywords : list[str]
        Keywords the ideal answer should cover.
    current_difficulty : str
        Current difficulty level ("easy", "medium", or "hard").
    filler_words : list[str], optional
        Filler words detected in the candidate's speech.

    Returns
    -------
    dict
        Validated evaluation containing scores, keyword_coverage,
        feedback, and next_difficulty.
    """
    if filler_words is None:
        filler_words = []

    user_prompt = _build_eval_user_prompt(
        question_text, answer_text, expected_keywords, filler_words,
    )

    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=EVALUATION_PROMPT,
                response_mime_type="application/json",
                temperature=0.4,
                max_output_tokens=1024,
            ),
        )

        raw_content = response.text
        data: dict = json.loads(raw_content)

        # ── Extract raw scores from Gemini ────
        raw_scores = data.get("scores", {})
        content_score = int(raw_scores.get("content", 50))
        grammar_score = int(raw_scores.get("grammar", 50))
        clarity_score = int(raw_scores.get("clarity", 50))
        confidence_score = int(raw_scores.get("confidence", 50))

        # ── Compute weighted overall ──────────
        overall = round(
            content_score * _WEIGHTS["content"]
            + grammar_score * _WEIGHTS["grammar"]
            + clarity_score * _WEIGHTS["clarity"]
            + confidence_score * _WEIGHTS["confidence"],
            2,
        )

        # ── Build validated result ────────────
        scores = Scores(
            content=content_score,
            grammar=grammar_score,
            clarity=clarity_score,
            confidence=confidence_score,
            overall=overall,
        )

        kw_raw = data.get("keyword_coverage", {})
        keyword_coverage = KeywordCoverage(
            found=kw_raw.get("found", []),
            missed=kw_raw.get("missed", []),
        )

        fb_raw = data.get("feedback", {})
        feedback = Feedback(
            strengths=fb_raw.get("strengths", []),
            weaknesses=fb_raw.get("weaknesses", []),
            improvement_tips=fb_raw.get("improvement_tips", []),
        )

        result = EvaluationResult(
            scores=scores,
            keyword_coverage=keyword_coverage,
            feedback=feedback,
            next_difficulty=_next_difficulty(overall, current_difficulty),
        )

        return result.model_dump()

    except (json.JSONDecodeError, ValidationError, KeyError) as exc:
        print(f"⚠️  Evaluation failed ({type(exc).__name__}): {exc}")
        return _fallback_evaluation(expected_keywords, current_difficulty)

    except Exception as exc:
        print(f"⚠️  Unexpected error in evaluate_answer: {exc}")
        return _fallback_evaluation(expected_keywords, current_difficulty)
