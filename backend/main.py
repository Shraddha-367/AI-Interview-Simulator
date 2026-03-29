"""
AI Interview Simulator — FastAPI Backend
"""

import time
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import resume, interview, evaluation, history, speech


# --------------- Lifespan handler ---------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load models, connect to DB, etc.
    print("🚀 Starting AI Interview Simulator backend …")
    yield
    # Shutdown: release resources
    print("👋 Shutting down …")


# --------------- App instance ---------------
app = FastAPI(
    title="AI Interview Simulator",
    description="Backend API for resume parsing, AI-driven interviews, evaluation, and history.",
    version="0.1.0",
    lifespan=lifespan,
)


# ═══════════════════════════════════════════════
#  GLOBAL EXCEPTION HANDLERS
# ═══════════════════════════════════════════════

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Return clear, field-level validation messages on 422.
    Never expose raw Pydantic internals to the client.
    """
    errors = []
    for err in exc.errors():
        field = " → ".join(str(loc) for loc in err.get("loc", []))
        errors.append({
            "field": field,
            "message": err.get("msg", "Invalid value"),
            "type": err.get("type", "value_error"),
        })
    return JSONResponse(
        status_code=422,
        content={"error": "Validation failed", "details": errors},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler — return a safe JSON error without leaking
    stack traces or internal details.
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
        },
    )


# ═══════════════════════════════════════════════
#  IN-MEMORY RATE LIMITER MIDDLEWARE
# ═══════════════════════════════════════════════

# {ip: [timestamp, timestamp, ...]}
_rate_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT: int = 60          # max requests
_RATE_WINDOW: float = 60.0     # per 60 seconds


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Simple per-IP rate limiter.
    Allows up to _RATE_LIMIT requests per _RATE_WINDOW seconds.
    """
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    cutoff = now - _RATE_WINDOW

    # Prune old timestamps
    _rate_store[client_ip] = [
        ts for ts in _rate_store[client_ip] if ts > cutoff
    ]

    if len(_rate_store[client_ip]) >= _RATE_LIMIT:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too many requests",
                "detail": f"Rate limit exceeded. Max {_RATE_LIMIT} requests per {int(_RATE_WINDOW)}s.",
            },
        )

    _rate_store[client_ip].append(now)
    response = await call_next(request)
    return response


# --------------- CORS ---------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------- Routers ---------------
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(interview.router, prefix="/api/interview", tags=["Interview"])
app.include_router(evaluation.router, prefix="/api/evaluation", tags=["Evaluation"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])


# --------------- Root ---------------
@app.get("/")
async def root():
    return {"message": "AI Interview Simulator API is running"}


# --------------- Health check ---------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
