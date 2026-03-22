"""
Evaluation router — scores and evaluates interview responses.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models.evaluation_model import EvaluationResult
from services.answer_evaluator import evaluate_answer
from utils.sanitize import sanitize_dict_texts

router = APIRouter()


# ──────────────────────────────────────────────
# Request schema
# ──────────────────────────────────────────────
class EvaluateRequest(BaseModel):
    """Body for POST /evaluate."""
    question_text: str = Field(
        ..., description="The interview question that was asked",
    )
    answer_text: str = Field(
        ..., description="The candidate's transcribed answer",
    )
    expected_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords the ideal answer should cover",
    )
    current_difficulty: str = Field(
        default="medium",
        description="Current difficulty level: easy | medium | hard",
    )
    filler_words: list[str] = Field(
        default_factory=list,
        description="Filler words detected in the candidate's speech",
    )


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@router.get("/")
async def get_evaluation():
    return {"status": "ok"}


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate(body: EvaluateRequest):
    """
    Evaluate a candidate's interview answer using GPT-4o.

    Scores on 4 axes (content, grammar, clarity, confidence),
    computes a weighted overall score, checks keyword coverage,
    provides qualitative feedback, and recommends the next
    difficulty level.
    """
    try:
        # Sanitise text inputs before sending to GPT
        clean_body = sanitize_dict_texts(body.model_dump())

        result = await evaluate_answer(
            question_text=clean_body.get("question_text", ""),
            answer_text=clean_body.get("answer_text", ""),
            expected_keywords=clean_body.get("expected_keywords", []),
            current_difficulty=clean_body.get("current_difficulty", "medium"),
            filler_words=clean_body.get("filler_words"),
        )
        return result

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to evaluate answer: {exc}",
        )
