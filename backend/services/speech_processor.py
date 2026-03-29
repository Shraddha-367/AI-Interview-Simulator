"""
Speech Processor Service
------------------------
Transcribes audio using Google Gemini's multimodal capabilities
and performs filler-word analysis on the resulting transcript.
"""

import os
import re
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

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


# ──────────────────────────────────────────────
# Filler-word detection
# ──────────────────────────────────────────────
FILLER_PHRASES: list[str] = [
    "um", "uh", "like", "you know", "basically",
    "literally", "actually", "right", "okay so",
]

# Pre-compile one regex that matches any filler (case-insensitive,
# word-boundary aware).  Multi-word fillers are checked first so
# "okay so" isn't partially consumed by a single-word pattern.
_FILLER_PATTERN: re.Pattern = re.compile(
    r"\b(?:" + "|".join(re.escape(f) for f in
        sorted(FILLER_PHRASES, key=len, reverse=True)) + r")\b",
    re.IGNORECASE,
)

# Mime-type mapping for Gemini audio upload
_MIME_TYPES: dict[str, str] = {
    ".webm": "audio/webm",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".mp4": "audio/mp4",
}
_SUPPORTED_EXTENSIONS: set[str] = set(_MIME_TYPES.keys())


def _detect_fillers(text: str) -> dict[str, Any]:
    """
    Scan *text* for filler words / phrases.

    Returns
    -------
    dict  {"filler_words": [...], "filler_count": int}
    """
    matches = _FILLER_PATTERN.findall(text)
    # Normalise to lowercase for consistency
    found = [m.lower() for m in matches]
    return {"filler_words": found, "filler_count": len(found)}


# ──────────────────────────────────────────────
# Main public function
# ──────────────────────────────────────────────
async def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
) -> dict[str, Any]:
    """
    Transcribe audio bytes via Google Gemini and analyse the result.

    Parameters
    ----------
    audio_bytes : bytes
        Raw audio file content.
    filename : str
        Original filename (used to infer the extension).

    Returns
    -------
    dict
        {
            "transcript": str,
            "filler_words": list[str],
            "filler_count": int,
            "duration_seconds": float,
        }

    Raises
    ------
    ValueError
        If audio is empty or the format is unsupported.
    RuntimeError
        If the Gemini API call fails.
    """
    # ── Validate input ────────────────────────
    if not audio_bytes:
        raise ValueError("Audio data is empty.")

    ext = Path(filename).suffix.lower() if "." in filename else ""
    if ext not in _SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported audio format '{ext}'. "
            f"Accepted formats: {', '.join(sorted(_SUPPORTED_EXTENSIONS))}"
        )

    mime_type = _MIME_TYPES[ext]

    # ── Call Gemini for transcription ─────────
    try:
        client = _get_gemini_client()

        # Upload audio as inline data for Gemini multimodal
        audio_part = types.Part.from_bytes(
            data=audio_bytes,
            mime_type=mime_type,
        )

        response = await client.aio.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                audio_part,
                "Transcribe this audio exactly as spoken. "
                "Return ONLY the raw transcript text, no formatting, no timestamps, no markdown.",
            ],
            config=types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=4096,
            ),
        )

        transcript: str = response.text.strip()

        # ── Filler-word analysis ──────────────
        filler_info = _detect_fillers(transcript)

        # ── Duration estimate ─────────────────
        # Rough heuristic: 16 000 bytes ≈ 1 second of 16-bit mono 8 kHz audio.
        duration_seconds = round(len(audio_bytes) / 16_000, 2)

        return {
            "transcript": transcript,
            "filler_words": filler_info["filler_words"],
            "filler_count": filler_info["filler_count"],
            "duration_seconds": duration_seconds,
        }

    except ValueError:
        # Re-raise validation errors as-is
        raise

    except Exception as exc:
        raise RuntimeError(
            f"Gemini transcription error: {exc}"
        ) from exc
