"""
Pydantic models for resume data.
"""

from pydantic import BaseModel


class ResumeData(BaseModel):
    name: str
    skills: list[str]
    experience: list[dict]
    projects: list[dict]
    education: list[dict]
    raw_text: str
    resume_id: str
