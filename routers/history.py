"""
History router — retrieves past interview sessions and results.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.firebase_service import (
    get_current_user,
    get_sessions,
    save_answer,
    save_session,
)

router = APIRouter()


# ──────────────────────────────────────────────
# Response schemas
# ──────────────────────────────────────────────
class SessionSummary(BaseModel):
    session_id: str
    date: str = ""
    persona: str = ""
    num_questions: int = 0
    avg_score: float = 0.0
    scores_breakdown: dict = Field(default_factory=dict)
    weak_areas: list[str] = Field(default_factory=list)
    resume_name: str = ""


class SessionsResponse(BaseModel):
    sessions: list[SessionSummary]


# ──────────────────────────────────────────────
# Request schemas
# ──────────────────────────────────────────────
class AnswerEntry(BaseModel):
    question_id: int
    data: dict


class SaveSessionRequest(BaseModel):
    uid: str
    session_id: str
    session_data: dict


# ──────────────────────────────────────────────
# Helper: derive summary fields from raw session data
# ──────────────────────────────────────────────
def _build_session_summary(raw: dict) -> dict:
    """
    Take a raw Firestore session document and derive summary fields
    expected by the frontend (avg_score, weak_areas, etc.).
    """
    scores = raw.get("scores_breakdown", {})
    answers = raw.get("answers", [])
    num_questions = raw.get("num_questions", len(answers))

    # Compute average score from answers if available
    all_scores = [
        a.get("overall", a.get("score", 0))
        for a in answers
        if isinstance(a, dict)
    ]
    avg_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else raw.get("avg_score", 0.0)

    # Identify weak areas — topics where score < 70
    weak_areas: list[str] = []
    for a in answers:
        if isinstance(a, dict):
            topic = a.get("topic", "")
            score = a.get("overall", a.get("score", 100))
            if topic and score < 70:
                weak_areas.append(topic)
    # De-duplicate while preserving order
    seen: set[str] = set()
    unique_weak: list[str] = []
    for w in weak_areas:
        if w not in seen:
            seen.add(w)
            unique_weak.append(w)

    return {
        "session_id": raw.get("session_id", ""),
        "date": raw.get("created_at", raw.get("date", "")),
        "persona": raw.get("persona", ""),
        "num_questions": num_questions,
        "avg_score": avg_score,
        "scores_breakdown": scores,
        "weak_areas": unique_weak,
        "resume_name": raw.get("resume_name", ""),
    }


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@router.get("/")
async def get_history():
    return {"status": "ok"}


@router.get(
    "/{user_id}",
    response_model=SessionsResponse,
)
async def get_user_sessions(
    user_id: str,
    _uid: str = Depends(get_current_user),
):
    """
    Return all past interview sessions for a given user,
    ordered by most recent first.

    Protected — requires a valid Firebase Bearer token.
    """
    try:
        raw_sessions = await get_sessions(user_id)
        summaries = [_build_session_summary(s) for s in raw_sessions]
        return SessionsResponse(sessions=summaries)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch session history: {exc}",
        )


@router.post("/save")
async def save_user_session(
    body: SaveSessionRequest,
    _uid: str = Depends(get_current_user),
):
    """
    Persist an interview session and its individual answers
    to Firestore.

    Protected — requires a valid Firebase Bearer token.
    """
    try:
        # Save the top-level session document
        await save_session(body.uid, body.session_id, body.session_data)

        # Save each answer as a sub-document
        answers = body.session_data.get("answers", [])
        for idx, answer in enumerate(answers):
            if isinstance(answer, dict):
                question_id = answer.get("question_id", idx)
                await save_answer(
                    body.uid, body.session_id, int(question_id), answer,
                )

        return {"saved": True}

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save session: {exc}",
        )
