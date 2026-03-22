"""
Speech router — handles audio upload and transcription.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel

from services.speech_processor import transcribe_audio

router = APIRouter()


# ──────────────────────────────────────────────
# Response schema
# ──────────────────────────────────────────────
class TranscriptionResponse(BaseModel):
    transcript: str
    filler_words: list[str]
    filler_count: int
    duration_seconds: float


# ──────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────
@router.get("/")
async def get_speech():
    return {"status": "ok"}


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(file: UploadFile = File(...)):
    """
    Accept an audio file (.webm, .wav, .mp3, etc.), transcribe it
    via OpenAI Whisper-1, detect filler words, and return the result.
    """
    allowed_types = [
        "audio/webm",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "audio/mpeg",
        "audio/mp3",
        "audio/mp4",
        "audio/m4a",
        "audio/ogg",
        "audio/flac",
        "video/webm",           # browsers often send webm as video/webm
    ]

    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported content type '{file.content_type}'. "
                f"Upload a .webm, .wav, .mp3, .m4a, .ogg, or .flac file."
            ),
        )

    try:
        audio_bytes = await file.read()
        result = await transcribe_audio(audio_bytes, file.filename or "audio.webm")
        return result

    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during transcription: {exc}",
        )
