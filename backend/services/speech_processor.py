"""
Speech Processor Service
------------------------
Transcribes audio using OpenAI Whisper and performs filler-word
analysis on the resulting transcript.
"""

import os
import re
import tempfile
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI, APIError

load_dotenv()

# ──────────────────────────────────────────────
# OpenAI client (async, lazy-initialized)
# ──────────────────────────────────────────────
_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    """Return (and lazily create) the async OpenAI client."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. "
                "Add it to your .env file or environment variables."
            )
        _client = AsyncOpenAI(api_key=api_key)
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
_SUPPORTED_EXTENSIONS: set[str] = {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".flac", ".mp4"}


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
    Transcribe audio bytes via OpenAI Whisper-1 and analyse the result.

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
        If the Whisper API call fails.
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

    # ── Write to temp file ────────────────────
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=ext, delete=False,
        ) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        # ── Call Whisper API ──────────────────
        client = _get_openai_client()
        with open(tmp_path, "rb") as audio_file:
            transcription = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )

        transcript: str = transcription.text.strip()

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

    except APIError as exc:
        raise RuntimeError(
            f"Whisper API error: {exc.message}"
        ) from exc

    except ValueError:
        # Re-raise validation errors as-is
        raise

    except Exception as exc:
        raise RuntimeError(
            f"Unexpected error during transcription: {exc}"
        ) from exc

    finally:
        # ── Clean up temp file ────────────────
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass
