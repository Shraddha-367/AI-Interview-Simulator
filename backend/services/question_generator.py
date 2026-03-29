"""
Question Generator Service
--------------------------
Uses Google Gemini to generate personalised interview questions
based on the candidate's parsed resume data, interviewer persona,
and difficulty level.
"""

import json
import os
import uuid
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import ValidationError

from models.question_model import GeneratedQuestion, QuestionsPayload

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
#  SYSTEM PROMPT TEMPLATES
# ══════════════════════════════════════════════

HR_PROMPT: str = (
    "You are a warm, empathetic, and approachable Human Resources interviewer "
    "conducting a screening round. Your goal is to assess the candidate's "
    "cultural alignment, communication style, and interpersonal skills.\n\n"
    "FOCUS AREAS:\n"
    "• Teamwork & collaboration — how the candidate works with cross-functional "
    "teams, handles disagreements, and supports peers.\n"
    "• Communication — clarity of thought, active listening, ability to explain "
    "ideas to non-technical stakeholders.\n"
    "• Culture fit — alignment with company values, adaptability to new "
    "environments, enthusiasm for the mission.\n"
    "• Work-life situations — how the candidate manages competing priorities, "
    "handles pressure, and maintains work-life balance.\n"
    "• Motivation & career goals — what drives the candidate, where they see "
    "themselves growing, and why they are exploring this opportunity.\n\n"
    "RULES:\n"
    "- Do NOT ask purely technical or coding questions.\n"
    "- Phrase questions in a conversational, non-intimidating tone.\n"
    "- Personalise questions using the candidate's name, listed skills, and "
    "project/experience descriptions provided in the user prompt.\n\n"
    "Return ONLY a JSON object with key 'questions' containing an array. "
    "No markdown, no explanation."
)

TECHNICAL_PROMPT: str = (
    "You are a senior software engineer conducting a rigorous technical "
    "interview. Your goal is to evaluate the candidate's depth of knowledge, "
    "problem-solving ability, and engineering judgement.\n\n"
    "FOCUS AREAS:\n"
    "• Data Structures & Algorithms (DSA) — ask about time/space complexity, "
    "optimal data-structure choices, and algorithmic trade-offs relevant to "
    "the candidate's tech stack.\n"
    "• System Design — ask the candidate to design or critique architectures "
    "(e.g. microservices, event-driven pipelines, caching layers) that relate "
    "to the projects on their resume.\n"
    "• Architecture Decisions & Trade-offs — probe why the candidate chose a "
    "particular database, framework, or protocol in their past projects; ask "
    "about scalability, fault tolerance, and consistency trade-offs.\n"
    "• Debugging & Troubleshooting — present realistic failure scenarios using "
    "the technologies listed on the candidate's resume and ask how they would "
    "diagnose and resolve them.\n\n"
    "RULES:\n"
    "- Reference the candidate's ACTUAL tech stack, frameworks, and project "
    "names from the profile provided in the user prompt.\n"
    "- Scale question depth to match the requested difficulty level.\n"
    "- Include at least one question that asks the candidate to compare two "
    "technologies they have listed.\n\n"
    "Return ONLY a JSON object with key 'questions' containing an array. "
    "No markdown, no explanation."
)

BEHAVIORAL_PROMPT: str = (
    "You are an experienced behavioral interviewer who strictly follows the "
    "STAR (Situation, Task, Action, Result) framework. Your goal is to uncover "
    "how the candidate has handled real-world challenges in the past.\n\n"
    "FOCUS AREAS:\n"
    "• Leadership & Initiative — times the candidate stepped up, led a team, "
    "or drove a project forward without being asked.\n"
    "• Conflict Resolution — how the candidate navigated disagreements with "
    "teammates, managers, or stakeholders and reached a constructive outcome.\n"
    "• Failure & Recovery — situations where something went wrong, what the "
    "candidate learned, and how they applied that lesson afterwards.\n"
    "• Initiative & Impact — examples of the candidate going beyond their "
    "defined role to deliver meaningful results.\n\n"
    "RULES:\n"
    "- Frame every question so the candidate must describe a specific past "
    "situation (not a hypothetical).\n"
    "- Reference the candidate's ACTUAL experience entries and project names "
    "from the profile provided in the user prompt so the questions feel "
    "personalised, not generic.\n"
    "- Each question should explicitly prompt for Situation, Task, Action, and "
    "Result.\n\n"
    "Return ONLY a JSON object with key 'questions' containing an array. "
    "No markdown, no explanation."
)


# Map persona key → prompt constant
_PERSONA_PROMPTS: dict[str, str] = {
    "hr": HR_PROMPT,
    "technical": TECHNICAL_PROMPT,
    "behavioral": BEHAVIORAL_PROMPT,
}


# ──────────────────────────────────────────────
# Fallback generic questions
# ──────────────────────────────────────────────
def _fallback_questions(
    persona: str, difficulty: str, num_questions: int,
) -> list[dict[str, Any]]:
    """Return safe generic questions when the API call fails."""

    _GENERIC: dict[str, list[dict[str, Any]]] = {
        "hr": [
            {
                "type": "hr", "question": "Tell me about yourself and what excites you about this role.",
                "topic": "Introduction", "expected_keywords": ["motivation", "background", "goals"],
                "time_limit_seconds": 120,
            },
            {
                "type": "hr", "question": "Describe a time you resolved a conflict within your team.",
                "topic": "Conflict Resolution", "expected_keywords": ["empathy", "communication", "outcome"],
                "time_limit_seconds": 120,
            },
            {
                "type": "hr", "question": "Where do you see yourself in five years?",
                "topic": "Career Growth", "expected_keywords": ["goals", "growth", "learning"],
                "time_limit_seconds": 90,
            },
            {
                "type": "hr", "question": "Why are you looking for a change from your current role?",
                "topic": "Motivation", "expected_keywords": ["challenge", "growth", "impact"],
                "time_limit_seconds": 90,
            },
            {
                "type": "hr", "question": "How do you handle feedback and criticism?",
                "topic": "Self-awareness", "expected_keywords": ["openness", "improvement", "resilience"],
                "time_limit_seconds": 90,
            },
        ],
        "technical": [
            {
                "type": "technical", "question": "Explain the difference between SQL and NoSQL databases, and when you would choose one over the other.",
                "topic": "Databases", "expected_keywords": ["relational", "schema", "scalability", "consistency"],
                "time_limit_seconds": 150,
            },
            {
                "type": "technical", "question": "Walk me through how you would design a REST API for a to-do application.",
                "topic": "API Design", "expected_keywords": ["endpoints", "HTTP methods", "status codes", "CRUD"],
                "time_limit_seconds": 180,
            },
            {
                "type": "technical", "question": "What is the time complexity of common sorting algorithms, and which would you choose for large datasets?",
                "topic": "Algorithms", "expected_keywords": ["O(n log n)", "merge sort", "quick sort", "space complexity"],
                "time_limit_seconds": 150,
            },
            {
                "type": "technical", "question": "Describe the concept of containerisation and how Docker helps in deployment.",
                "topic": "DevOps", "expected_keywords": ["container", "image", "isolation", "reproducibility"],
                "time_limit_seconds": 150,
            },
            {
                "type": "technical", "question": "What are the key principles of object-oriented programming?",
                "topic": "OOP", "expected_keywords": ["encapsulation", "inheritance", "polymorphism", "abstraction"],
                "time_limit_seconds": 120,
            },
        ],
        "behavioral": [
            {
                "type": "behavioral", "question": "Tell me about a time you had to meet a tight deadline. What was the situation, your task, the actions you took, and the result?",
                "topic": "Time Management", "expected_keywords": ["priority", "planning", "result", "pressure"],
                "time_limit_seconds": 150,
            },
            {
                "type": "behavioral", "question": "Describe a situation where you had to learn a new technology quickly. Walk me through the STAR framework.",
                "topic": "Adaptability", "expected_keywords": ["learning", "approach", "outcome", "self-study"],
                "time_limit_seconds": 150,
            },
            {
                "type": "behavioral", "question": "Give an example of a project where you took the lead. What was the situation, your role, what you did, and the outcome?",
                "topic": "Leadership", "expected_keywords": ["initiative", "delegation", "responsibility", "result"],
                "time_limit_seconds": 150,
            },
            {
                "type": "behavioral", "question": "Tell me about a time you failed and what you learned from it. Please use the Situation-Task-Action-Result format.",
                "topic": "Resilience", "expected_keywords": ["mistake", "reflection", "improvement", "growth"],
                "time_limit_seconds": 150,
            },
            {
                "type": "behavioral", "question": "Describe a situation where you had to collaborate with difficult stakeholders. What actions did you take and what was the result?",
                "topic": "Collaboration", "expected_keywords": ["communication", "compromise", "empathy", "outcome"],
                "time_limit_seconds": 150,
            },
        ],
    }

    pool = _GENERIC.get(persona, _GENERIC["hr"])
    questions: list[dict[str, Any]] = []
    for i, q in enumerate(pool[:num_questions]):
        questions.append({
            "id": uuid.uuid4().hex[:8],
            "difficulty": difficulty,
            **q,
        })
    return questions


# ──────────────────────────────────────────────
# Helper: build the user prompt
# ──────────────────────────────────────────────
def _build_user_prompt(
    resume_data: dict, persona: str, difficulty: str, num_questions: int,
) -> str:
    """Compose the user message sent to Gemini."""

    name = resume_data.get("name", "the candidate")
    skills = resume_data.get("skills", [])
    projects = resume_data.get("projects", [])[:2]
    experience = resume_data.get("experience", [])[:2]

    skills_str = ", ".join(skills) if skills else "not specified"
    projects_str = "\n".join(
        f"  - {p.get('description', p)}" for p in projects
    ) if projects else "  - No projects listed"
    experience_str = "\n".join(
        f"  - {e.get('description', e)}" for e in experience
    ) if experience else "  - No experience listed"

    return (
        f"Generate exactly {num_questions} personalised {persona} interview questions "
        f"at **{difficulty}** difficulty for a candidate named **{name}**.\n\n"
        f"### Candidate Profile\n"
        f"**Skills:** {skills_str}\n\n"
        f"**Top Projects:**\n{projects_str}\n\n"
        f"**Top Experience:**\n{experience_str}\n\n"
        f"### Requirements\n"
        f"- Reference the candidate's actual skills and project names where relevant.\n"
        f"- Each question object must have these keys:\n"
        f"  id (unique short string), type (\"{persona}\"), question, topic, "
        f"difficulty (\"{difficulty}\"), expected_keywords (list of 3-5 strings), "
        f"time_limit_seconds (int, 60-180).\n"
        f"- Return a JSON object with a single key \"questions\" containing the list.\n"
    )


# ──────────────────────────────────────────────
# Main public function
# ──────────────────────────────────────────────
async def generate_questions(
    resume_data: dict,
    persona: str,
    difficulty: str,
    num_questions: int = 5,
) -> list[dict[str, Any]]:
    """
    Generate personalised interview questions using Google Gemini.

    Parameters
    ----------
    resume_data : dict
        Parsed resume data (name, skills, projects, experience, …).
    persona : str
        Interviewer persona — one of "hr", "technical", "behavioral".
    difficulty : str
        Question difficulty — e.g. "easy", "medium", "hard".
    num_questions : int
        Number of questions to generate (default 5).

    Returns
    -------
    list[dict]
        A list of validated question dicts.
    """
    # Normalise persona
    persona = persona.strip().lower()
    if persona not in _PERSONA_PROMPTS:
        persona = "hr"

    system_prompt = _PERSONA_PROMPTS[persona]
    user_prompt = _build_user_prompt(resume_data, persona, difficulty, num_questions)

    # ── Call Gemini ────────────────────────────
    try:
        client = _get_gemini_client()
        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )

        raw_content = response.text
        data = json.loads(raw_content)

        # Validate with Pydantic
        payload = QuestionsPayload(**data)
        return [q.model_dump() for q in payload.questions]

    except (json.JSONDecodeError, ValidationError, KeyError) as exc:
        print(f"⚠️  Question generation failed ({type(exc).__name__}): {exc}")
        return _fallback_questions(persona, difficulty, num_questions)

    except Exception as exc:
        print(f"⚠️  Unexpected error in generate_questions: {exc}")
        return _fallback_questions(persona, difficulty, num_questions)
