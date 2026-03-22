"""
Resume Parser Service
---------------------
Extracts structured data from PDF / DOCX resumes using PyMuPDF, python-docx,
spaCy NER (optional), regex-based section detection, and keyword skill matching.

If spaCy is unavailable (e.g. Python 3.14 compatibility issue), the parser
falls back to regex-based name extraction instead of NER.
"""

import re
import uuid
from typing import Any

import fitz  # PyMuPDF
from docx import Document

# ──────────────────────────────────────────────
# Lazy spaCy import — may fail on some Python versions
# ──────────────────────────────────────────────
_spacy_available: bool = False
try:
    import spacy
    _spacy_available = True
except Exception:
    spacy = None  # type: ignore
    print(
        "⚠️  spaCy could not be imported (likely Python 3.14 compatibility). "
        "Resume parser will use regex fallback for name extraction."
    )

# ──────────────────────────────────────────────
# Hard-coded list of 80 common tech skills
# ──────────────────────────────────────────────
SKILLS_LIST: list[str] = [
    # Languages
    "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#", "Go",
    "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Perl",
    # Web / Frontend
    "HTML", "CSS", "React", "Angular", "Vue", "Next.js", "Svelte",
    "Tailwind CSS", "Bootstrap", "jQuery",
    # Backend / Frameworks
    "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
    "ASP.NET", "Rails",
    # Data / ML / AI
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision",
    "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy",
    "OpenCV", "Keras", "LLM",
    # Databases
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Firebase",
    "Cassandra", "DynamoDB", "SQLite",
    # Cloud / DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "CI/CD", "Jenkins", "GitHub Actions", "Linux",
    # Tools & Misc
    "Git", "REST API", "GraphQL", "gRPC", "Kafka", "RabbitMQ",
    "Elasticsearch", "Nginx", "Apache", "Selenium",
    "Power BI", "Tableau", "Excel", "Figma", "Jira",
    "Agile", "Scrum",
]

# Pre-compile lowercase lookup for case-insensitive matching
_SKILLS_LOWER: dict[str, str] = {s.lower(): s for s in SKILLS_LIST}


# ──────────────────────────────────────────────
# Text extraction helpers
# ──────────────────────────────────────────────
def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF using PyMuPDF."""
    text_parts: list[str] = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
    except Exception as exc:
        raise ValueError(f"Failed to parse PDF: {exc}") from exc
    return "\n".join(text_parts)


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all paragraph text from a DOCX file."""
    try:
        import io
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs)
    except Exception as exc:
        raise ValueError(f"Failed to parse DOCX: {exc}") from exc


# ──────────────────────────────────────────────
# spaCy NER helpers (with fallback)
# ──────────────────────────────────────────────
_nlp = None  # lazy-loaded


def _get_nlp():
    """Lazily load the spaCy model.  Returns None if spaCy is not available."""
    global _nlp
    if not _spacy_available:
        return None
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except Exception:
            print("⚠️  spaCy model 'en_core_web_sm' not found — using regex fallback.")
            return None
    return _nlp


def _extract_name_spacy(doc) -> str:
    """Return the first PERSON entity found, or 'Unknown'."""
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text.strip()
    return "Unknown"


def _extract_name_regex(text: str) -> str:
    """
    Regex fallback: assume the first non-empty line of the resume is the name.
    This covers the vast majority of real-world resumes.
    """
    for line in text.splitlines():
        cleaned = line.strip()
        if cleaned and len(cleaned) < 60:
            # Skip lines that look like section headers or metadata
            if re.match(
                r"(?i)^(skills?|experience|education|projects?|summary|"
                r"objective|certificates?|contact|address|phone|email)",
                cleaned,
            ):
                continue
            return cleaned
    return "Unknown"


def _extract_durations(doc) -> list[str]:
    """Return DATE entities that look like durations."""
    if doc is None:
        return []
    return [ent.text for ent in doc.ents if ent.label_ == "DATE"]


# ──────────────────────────────────────────────
# Skill extraction
# ──────────────────────────────────────────────
def _extract_skills(text: str) -> list[str]:
    """Match text against SKILLS_LIST (case-insensitive)."""
    text_lower = text.lower()
    found: list[str] = []
    for skill_lower, skill_original in _SKILLS_LOWER.items():
        # word-boundary check to avoid partial matches
        pattern = re.compile(r"(?<![a-zA-Z])" + re.escape(skill_lower) + r"(?![a-zA-Z])")
        if pattern.search(text_lower):
            found.append(skill_original)
    return sorted(set(found))


# ──────────────────────────────────────────────
# Section extraction via regex
# ──────────────────────────────────────────────
_EXPERIENCE_HEADER = re.compile(
    r"(?:^|\n)\s*(?:work\s+)?experience[s]?\s*[\n:\-—]",
    re.IGNORECASE,
)
_PROJECT_HEADER = re.compile(
    r"(?:^|\n)\s*projects?\s*[\n:\-—]",
    re.IGNORECASE,
)
_EDUCATION_HEADER = re.compile(
    r"(?:^|\n)\s*education\s*[\n:\-—]",
    re.IGNORECASE,
)
_SECTION_HEADER = re.compile(
    r"(?:^|\n)\s*(?:skills?|certificates?|certifications?|awards?|achievements?"
    r"|publications?|hobbies|interests?|references?|summary|objective"
    r"|work\s+experience|experience|projects?|education)\s*[\n:\-—]",
    re.IGNORECASE,
)


def _extract_section(text: str, header_re: re.Pattern) -> str:
    """Pull raw text between a section header and the next section header."""
    match = header_re.search(text)
    if not match:
        return ""
    start = match.end()
    # Find the next section header after this one
    next_header = _SECTION_HEADER.search(text, start)
    end = next_header.start() if next_header else len(text)
    return text[start:end].strip()


def _lines_to_dicts(section_text: str, label: str = "description") -> list[dict[str, Any]]:
    """
    Split a raw section into a list of dicts.
    Each non-empty line or bullet becomes one dict entry.
    """
    items: list[dict[str, Any]] = []
    for line in section_text.splitlines():
        cleaned = line.strip().lstrip("•-–—*▪►").strip()
        if cleaned:
            items.append({label: cleaned})
    return items


# ──────────────────────────────────────────────
# Main entry-point
# ──────────────────────────────────────────────
def parse_resume(file_bytes: bytes, filename: str) -> dict[str, Any]:
    """
    Parse a resume from raw file bytes and return a dict matching
    the ResumeData Pydantic schema.

    Supported formats: .pdf, .docx
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # 1. Extract raw text ──────────────────────
    if ext == "pdf":
        raw_text = _extract_text_from_pdf(file_bytes)
    elif ext == "docx":
        raw_text = _extract_text_from_docx(file_bytes)
    else:
        raise ValueError(
            f"Unsupported file type '.{ext}'. Only .pdf and .docx are supported."
        )

    if not raw_text.strip():
        raise ValueError("The uploaded resume appears to be empty or unreadable.")

    # 2. Name & duration extraction ────────────
    nlp = _get_nlp()
    if nlp is not None:
        doc = nlp(raw_text[:100_000])  # cap to avoid memory issues
        name = _extract_name_spacy(doc)
        durations = _extract_durations(doc)
    else:
        # Regex fallback when spaCy is unavailable
        doc = None
        name = _extract_name_regex(raw_text)
        durations = []

    # 3. Skill matching ────────────────────────
    skills = _extract_skills(raw_text)

    # 4. Section extraction ────────────────────
    experience_text = _extract_section(raw_text, _EXPERIENCE_HEADER)
    projects_text = _extract_section(raw_text, _PROJECT_HEADER)
    education_text = _extract_section(raw_text, _EDUCATION_HEADER)

    experience = _lines_to_dicts(experience_text, "description")
    projects = _lines_to_dicts(projects_text, "description")
    education = _lines_to_dicts(education_text, "description")

    # If durations were found, attach them to experience entries
    for i, dur in enumerate(durations):
        if i < len(experience):
            experience[i]["duration"] = dur

    # 5. Build response dict ───────────────────
    return {
        "name": name,
        "skills": skills,
        "experience": experience,
        "projects": projects,
        "education": education,
        "raw_text": raw_text,
        "resume_id": uuid.uuid4().hex,
    }
