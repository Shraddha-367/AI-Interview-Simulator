"""
Firebase Service
----------------
Initialize Firebase Admin SDK and provides Firestore CRUD helpers
and Firebase Authentication token verification.
"""

import json
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import firebase_admin
from firebase_admin import auth, credentials, firestore

load_dotenv()

# ──────────────────────────────────────────────
# Firebase initialization (runs once at import)
# ──────────────────────────────────────────────
_fb_app: firebase_admin.App | None = None
_db = None  # Firestore client


def _init_firebase() -> None:
    """Initialize the Firebase Admin SDK (idempotent)."""
    global _fb_app, _db

    if _fb_app is not None:
        return

    creds_env = os.getenv("FIREBASE_CREDENTIALS_JSON", "")

    if not creds_env:
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_JSON is not set. "
            "Add a JSON string or file path to your .env file."
        )

    # Support both raw JSON string and file path
    try:
        creds_dict = json.loads(creds_env)
        cred = credentials.Certificate(creds_dict)
    except (json.JSONDecodeError, ValueError):
        # Assume it's a file path
        if not os.path.isfile(creds_env):
            raise RuntimeError(
                f"FIREBASE_CREDENTIALS_JSON is not valid JSON and file "
                f"'{creds_env}' does not exist."
            )
        cred = credentials.Certificate(creds_env)

    bucket = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    options = {"storageBucket": bucket} if bucket else {}

    _fb_app = firebase_admin.initialize_app(cred, options)
    _db = firestore.client()


def _get_db():
    """Return (and lazily initialize) the Firestore client."""
    if _db is None:
        _init_firebase()
    return _db


# ──────────────────────────────────────────────
# Firestore helpers
# ──────────────────────────────────────────────
async def save_resume(resume_id: str, data: dict) -> None:
    """Write parsed resume data to /resumes/{resume_id}."""
    try:
        db = _get_db()
        db.collection("resumes").document(resume_id).set(data)
    except Exception as exc:
        raise RuntimeError(f"Firestore save_resume failed: {exc}") from exc


async def save_session(uid: str, session_id: str, session_data: dict) -> None:
    """Write session data to /users/{uid}/sessions/{session_id}."""
    try:
        db = _get_db()
        db.collection("users").document(uid) \
          .collection("sessions").document(session_id).set(session_data)
    except Exception as exc:
        raise RuntimeError(f"Firestore save_session failed: {exc}") from exc


async def save_answer(
    uid: str, session_id: str, question_id: int, answer_data: dict,
) -> None:
    """Write answer data to /users/{uid}/sessions/{session_id}/answers/{question_id}."""
    try:
        db = _get_db()
        db.collection("users").document(uid) \
          .collection("sessions").document(session_id) \
          .collection("answers").document(str(question_id)).set(answer_data)
    except Exception as exc:
        raise RuntimeError(f"Firestore save_answer failed: {exc}") from exc


async def get_sessions(uid: str) -> list[dict[str, Any]]:
    """
    Read all docs from /users/{uid}/sessions ordered by created_at desc.

    Returns a list of session dicts, each augmented with its document ID
    as 'session_id'.
    """
    try:
        db = _get_db()
        sessions_ref = (
            db.collection("users").document(uid)
              .collection("sessions")
              .order_by("created_at", direction=firestore.Query.DESCENDING)
        )
        docs = sessions_ref.stream()
        results: list[dict[str, Any]] = []
        for doc in docs:
            entry = doc.to_dict()
            entry["session_id"] = doc.id
            results.append(entry)
        return results
    except Exception as exc:
        raise RuntimeError(f"Firestore get_sessions failed: {exc}") from exc


# ──────────────────────────────────────────────
# Firebase Authentication
# ──────────────────────────────────────────────
async def verify_firebase_token(token: str) -> str:
    """
    Verify a Firebase ID token and return the user's UID.

    Raises HTTPException 401 if the token is invalid or expired.
    """
    try:
        if _fb_app is None:
            _init_firebase()
        decoded = auth.verify_id_token(token)
        return decoded["uid"]
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid or expired Firebase token: {exc}",
        )


# ──────────────────────────────────────────────
# FastAPI dependency: get_current_user
# ──────────────────────────────────────────────
_bearer_scheme = HTTPBearer()


async def get_current_user(request: Request) -> str:
    """
    FastAPI dependency that extracts the Bearer token from the
    Authorization header and verifies it via Firebase Auth.

    Returns the authenticated user's UID (str).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. Expected 'Bearer <token>'.",
        )
    token = auth_header.split("Bearer ", 1)[1].strip()
    uid = await verify_firebase_token(token)
    return uid
