"""
Integration Test Script — AI Interview Simulator Backend
=========================================================
Runs against http://localhost:8000.  No pytest required.

Usage:
    python test_api.py

Each test prints PASS / FAIL with a short description.
"""

import io
import json
import struct
import sys
import wave

import requests
from fpdf import FPDF

BASE = "http://localhost:8000"
passed = 0
failed = 0


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def result(label: str, ok: bool, detail: str = ""):
    global passed, failed
    tag = "\033[92mPASS\033[0m" if ok else "\033[91mFAIL\033[0m"
    suffix = f"  ({detail})" if detail else ""
    print(f"  [{tag}] {label}{suffix}")
    if ok:
        passed += 1
    else:
        failed += 1


def make_dummy_pdf() -> bytes:
    """Create a minimal 1-page PDF resume using fpdf2."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=16)
    pdf.cell(w=0, h=10, text="John Doe", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    pdf.ln(4)

    for heading, lines in [
        ("Skills", [
            "Python, React, FastAPI, Docker, PostgreSQL, Machine Learning",
        ]),
        ("Experience", [
            "Software Engineer at TechCorp - Built microservices with FastAPI and Docker",
            "Junior Developer at StartupX - Developed React dashboards",
        ]),
        ("Projects", [
            "AI Chatbot - NLP-based chatbot using Python and TensorFlow",
            "E-commerce Platform - Full-stack React and FastAPI application",
        ]),
        ("Education", [
            "B.Tech in Computer Science - MIT University 2022",
        ]),
    ]:
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(w=0, h=8, text=heading, new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=11)
        for line in lines:
            pdf.cell(w=0, h=7, text=line, new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

    return pdf.output()


def make_silent_wav(duration_s: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a valid WAV file with silence."""
    num_samples = int(sample_rate * duration_s)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(b"\x00\x00" * num_samples)
    return buf.getvalue()


# ──────────────────────────────────────────────
# Test 1: GET /health
# ──────────────────────────────────────────────
def test_health():
    print("\n── Test 1: GET /health ──")
    try:
        r = requests.get(f"{BASE}/health", timeout=5)
        result("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        result("Has 'status' key", "status" in data)
        result("status == 'ok'", data.get("status") == "ok")
        result("Has 'timestamp'", "timestamp" in data)
    except Exception as e:
        result("Connection", False, str(e))


# ──────────────────────────────────────────────
# Test 2: POST /api/resume/upload
# ──────────────────────────────────────────────
def test_resume_upload() -> dict | None:
    print("\n── Test 2: POST /api/resume/upload ──")
    try:
        pdf_bytes = make_dummy_pdf()
        files = {"file": ("test_resume.pdf", pdf_bytes, "application/pdf")}
        r = requests.post(f"{BASE}/api/resume/upload", files=files, timeout=30)
        result("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        result("Has 'skills' key", "skills" in data)
        result("Has 'experience' key", "experience" in data)
        result("Has 'projects' key", "projects" in data)
        result("Has 'name' key", "name" in data)
        result("Has 'resume_id' key", "resume_id" in data)
        skills = data.get("skills", [])
        result("Skills detected (>0)", len(skills) > 0, f"found {len(skills)}: {skills[:5]}")
        return data
    except Exception as e:
        result("Connection", False, str(e))
        return None


# ──────────────────────────────────────────────
# Test 3: POST /api/interview/generate
# ──────────────────────────────────────────────
def test_generate_questions(resume_data: dict | None):
    print("\n── Test 3: POST /api/interview/generate ──")
    if resume_data is None:
        resume_data = {
            "name": "John Doe",
            "skills": ["Python", "React", "FastAPI"],
            "experience": [{"description": "Software Engineer at TechCorp"}],
            "projects": [{"description": "AI Chatbot using Python"}],
            "education": [{"description": "B.Tech CS"}],
            "raw_text": "John Doe Python React FastAPI",
            "resume_id": "test123",
        }
    try:
        body = {
            "resume_data": resume_data,
            "persona": "technical",
            "difficulty": "medium",
            "num_questions": 5,
        }
        r = requests.post(f"{BASE}/api/interview/generate", json=body, timeout=60)
        result("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        questions = data.get("questions", [])
        result("Has 'questions' array", isinstance(questions, list))
        result("5 questions returned", len(questions) == 5, f"got {len(questions)}")
        if questions:
            q = questions[0]
            result("Q has 'question' key", "question" in q)
            result("Q has 'expected_keywords'", "expected_keywords" in q)
            result("Q has 'topic' key", "topic" in q)
            result("Q has 'difficulty' key", "difficulty" in q)
            kw = q.get("expected_keywords", [])
            result("expected_keywords has 3-5 items", 3 <= len(kw) <= 5, f"got {len(kw)}")
    except Exception as e:
        result("Connection", False, str(e))


# ──────────────────────────────────────────────
# Test 4: POST /api/speech/transcribe
# ──────────────────────────────────────────────
def test_speech_transcribe():
    print("\n── Test 4: POST /api/speech/transcribe ──")
    try:
        wav_bytes = make_silent_wav(duration_s=1.0)
        files = {"file": ("silence.wav", wav_bytes, "audio/wav")}
        r = requests.post(f"{BASE}/api/speech/transcribe", files=files, timeout=30)
        result("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()
        result("Has 'transcript' key", "transcript" in data)
        result("Has 'filler_words' key", "filler_words" in data)
        result("Has 'filler_count' key", "filler_count" in data)
        result("Has 'duration_seconds' key", "duration_seconds" in data)
        result(
            "duration_seconds is a number",
            isinstance(data.get("duration_seconds"), (int, float)),
        )
    except Exception as e:
        result("Connection", False, str(e))


# ──────────────────────────────────────────────
# Test 5: POST /api/evaluation/evaluate
# ──────────────────────────────────────────────
def test_evaluate_answer():
    print("\n── Test 5: POST /api/evaluation/evaluate ──")
    try:
        body = {
            "question_text": "Explain the difference between SQL and NoSQL databases.",
            "answer_text": (
                "SQL databases are relational and use structured schemas with "
                "tables and rows. NoSQL databases are non-relational and offer "
                "flexible schemas, making them great for scalability. SQL is "
                "better for complex queries while NoSQL handles large volumes "
                "of unstructured data more efficiently."
            ),
            "expected_keywords": ["relational", "schema", "scalability", "consistency"],
            "current_difficulty": "medium",
            "filler_words": ["um", "like"],
        }
        r = requests.post(f"{BASE}/api/evaluation/evaluate", json=body, timeout=60)
        result("Status 200", r.status_code == 200, f"got {r.status_code}")
        data = r.json()

        # Scores
        scores = data.get("scores", {})
        result("Has 'scores' key", bool(scores))
        overall = scores.get("overall")
        result(
            "scores.overall is 0-100",
            isinstance(overall, (int, float)) and 0 <= overall <= 100,
            f"got {overall}",
        )
        for axis in ("content", "grammar", "clarity", "confidence"):
            v = scores.get(axis)
            result(
                f"scores.{axis} is 0-100",
                isinstance(v, (int, float)) and 0 <= v <= 100,
                f"got {v}",
            )

        # Keyword coverage
        kw = data.get("keyword_coverage", {})
        result("Has keyword_coverage.found", "found" in kw)
        result("Has keyword_coverage.missed", "missed" in kw)

        # Feedback
        fb = data.get("feedback", {})
        result("Has feedback.strengths", isinstance(fb.get("strengths"), list))
        result("Has feedback.improvement_tips", isinstance(fb.get("improvement_tips"), list))

        # Adaptive difficulty
        result("Has 'next_difficulty'", "next_difficulty" in data)
    except Exception as e:
        result("Connection", False, str(e))


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  AI Interview Simulator — Integration Tests")
    print(f"  Target: {BASE}")
    print("=" * 55)

    # Quick connectivity check
    try:
        requests.get(f"{BASE}/health", timeout=3)
    except requests.ConnectionError:
        print(f"\n\033[91mERROR: Cannot connect to {BASE}.\033[0m")
        print("Start the server first:  uvicorn main:app --reload")
        sys.exit(1)

    test_health()
    resume_data = test_resume_upload()
    test_generate_questions(resume_data)
    test_speech_transcribe()
    test_evaluate_answer()

    print("\n" + "=" * 55)
    total = passed + failed
    colour = "\033[92m" if failed == 0 else "\033[91m"
    print(f"  {colour}Results: {passed}/{total} passed, {failed} failed\033[0m")
    print("=" * 55)
    sys.exit(1 if failed else 0)
