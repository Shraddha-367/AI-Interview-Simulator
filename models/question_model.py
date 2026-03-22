"""
Pydantic models for interview question generation.
"""

import uuid

from pydantic import BaseModel, Field


class GeneratedQuestion(BaseModel):
    """Schema for a single interview question returned by GPT."""
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    type: str = Field(..., description="hr | technical | behavioral")
    question: str
    topic: str
    difficulty: str
    expected_keywords: list[str] = Field(
        ..., min_length=3, max_length=5,
        description="3-5 keywords the ideal answer should cover",
    )
    time_limit_seconds: int = Field(
        default=120,
        description="Recommended answer time in seconds",
    )


class QuestionsPayload(BaseModel):
    """Top-level wrapper the LLM JSON response is validated against."""
    questions: list[GeneratedQuestion]
