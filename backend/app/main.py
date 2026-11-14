import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.engine import engine
from app.offsets import convert_to_utf16_offsets
from app.schemas import CheckRequest, CheckResponse

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("grammarai")

# Comma-separated list, e.g. "https://grammarai.vercel.app,http://localhost:5173"
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
# Optional, e.g. r"https://grammarai-.*\.vercel\.app" to allow Vercel preview deployments
ALLOWED_ORIGIN_REGEX = os.getenv("ALLOWED_ORIGIN_REGEX") or None
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/minute")


def client_ip(request: Request) -> str:
    """
    Behind Cloud Run the real client address arrives in X-Forwarded-For, not in the socket address
    (which is always Google's proxy). Each proxy appends to the header, so the first entries can be
    set by the client; the last one is the address the proxy actually saw.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the models before the first request, so visitors never wait for them
    started = time.perf_counter()
    engine.warm_up()
    logger.info("Engine ready in %.1f s (model_loaded=%s)", time.perf_counter() - started, engine.is_ready())
    yield


app = FastAPI(
    title="GrammarAI Backend",
    description="Spelling, grammar and punctuation checks.",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=False,  # no cookies are used, so there is no reason to allow them
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/")
def root():
    return {"name": "GrammarAI API", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": engine.is_ready()}


@app.post("/check", response_model=CheckResponse)
@limiter.limit(RATE_LIMIT)
def check_text(request: Request, payload: CheckRequest):
    started = time.perf_counter()
    issues = engine.analyze(payload.text)
    # Convert code-point offsets to JS UTF-16 code unit offsets
    utf16_issues = convert_to_utf16_offsets(payload.text, issues)

    # Log sizes and timing only. Never log the text itself.
    logger.info(
        "check chars=%d issues=%d ms=%.0f",
        len(payload.text),
        len(utf16_issues),
        (time.perf_counter() - started) * 1000,
    )
    return CheckResponse(issues=utf16_issues)