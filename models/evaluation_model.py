"""
Pydantic models for answer evaluation responses.
"""

from pydantic import BaseModel, Field


class Scores(BaseModel):
    """Individual scoring axes (0-100)."""
    content: int = Field(..., ge=0, le=100, description="Relevance + keyword coverage")
    grammar: int = Field(..., ge=0, le=100, description="Language correctness")
    clarity: int = Field(..., ge=0, le=100, description="Structure + conciseness")
    confidence: int = Field(..., ge=0, le=100, description="Directness, hedging, filler penalty")
    overall: float = Field(..., ge=0, le=100, description="Weighted average of all axes")


class KeywordCoverage(BaseModel):
    """Which expected keywords were present / absent in the answer."""
    found: list[str] = Field(default_factory=list)
    missed: list[str] = Field(default_factory=list)


class Feedback(BaseModel):
    """Qualitative feedback from GPT."""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    improvement_tips: list[str] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    """Complete evaluation payload returned to the client."""
    scores: Scores
    keyword_coverage: KeywordCoverage
    feedback: Feedback
    next_difficulty: str = Field(
        ..., description="Adaptive difficulty for the next question: easy | medium | hard",
    )
