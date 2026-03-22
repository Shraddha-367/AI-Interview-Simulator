"""
Resume router — handles resume upload and parsing.
"""

from fastapi import APIRouter, File, UploadFile, HTTPException

from services.resume_parser import parse_resume
from services.firebase_service import save_resume

router = APIRouter()

# Maximum upload size: 5 MB
_MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5 242 880 bytes

_ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_ALLOWED_EXTENSIONS = {".pdf", ".docx"}


@router.get("/")
async def get_resume():
    return {"status": "ok"}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    """
    Accept a resume file (.pdf or .docx), parse it, and return
    structured data matching the ResumeData schema.
    The parsed data is also persisted to Firestore.
    """
    # ── Validate content type ─────────────────
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                "Only .pdf and .docx files are accepted."
            ),
        )

    # ── Validate file extension ───────────────
    filename = file.filename or ""
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file extension '{ext}'. "
                "Only .pdf and .docx files are accepted."
            ),
        )

    # ── Read and validate file size ───────────
    file_bytes = await file.read()
    if len(file_bytes) > _MAX_FILE_SIZE:
        size_mb = round(len(file_bytes) / (1024 * 1024), 2)
        raise HTTPException(
            status_code=400,
            detail=(
                f"File too large ({size_mb} MB). "
                f"Maximum allowed size is 5 MB."
            ),
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    # ── Parse ─────────────────────────────────
    try:
        result = parse_resume(file_bytes, filename)

        # Persist to Firestore (non-blocking — don't fail the response)
        try:
            await save_resume(result["resume_id"], result)
        except Exception as fb_exc:
            print(f"⚠️  Firestore save_resume failed (non-fatal): {fb_exc}")

        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred while parsing the resume: {exc}",
        )
