"""
Interview router — manages AI interview sessions.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from models.question_model import GeneratedQuestion
from services.question_generator import generate_questions
from utils.sanitize import sanitize_text, sanitize_dict_texts

router = APIRouter()


# ──────────────────────────────────────────────
# Request / Response schemas
# ──────────────────────────────────────────────
class GenerateRequest(BaseModel):
    """Body for POST /generate."""
    resume_data: dict = Field(
        ..., description="Parsed resume dict (name, skills, experience, projects, …)",
    )
    persona: str = Field(
        default="hr",
        description="Interviewer persona: hr | technical | behavioral",
    )
    difficulty: str = Field(
        default="medium",
        description="Question difficulty: easy | medium | hard",
    )
    num_questions: int = Field(
        default=5, ge=1, le=15,
        description="Number of questions to generate (1-15)",
    )


class GenerateResponse(BaseModel):
    questions: list[GeneratedQuestion]
    count: int


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@router.get("/")
async def get_interview():
    return {"status": "ok"}


@router.post("/generate", response_model=GenerateResponse)
async def generate_interview_questions(body: GenerateRequest):
    """
    Generate personalised interview questions using GPT-4o.

    Accepts parsed resume data, an interviewer persona, difficulty level,
    and the desired number of questions. Returns a list of structured
    question objects.
    """
    try:
        # Sanitise all text fields before sending to GPT
        clean_data = sanitize_dict_texts(body.resume_data)
        clean_persona = sanitize_text(body.persona, max_chars=50)
        clean_difficulty = sanitize_text(body.difficulty, max_chars=20)

        questions = await generate_questions(
            resume_data=clean_data,
            persona=clean_persona,
            difficulty=clean_difficulty,
            num_questions=body.num_questions,
        )
        return GenerateResponse(questions=questions, count=len(questions))

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate interview questions: {exc}",
        )
