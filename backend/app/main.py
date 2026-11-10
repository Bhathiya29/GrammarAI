from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import CheckRequest, CheckResponse
from app.engine import engine

app = FastAPI(title = "GrammarAI Backend", description = "API for the Grammar Clone project")

# Adding CORS MIDDLEWARE FOR VITE FRONTEND
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Adding GET /health endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}

# Post Endpoint
@app.post("/check", response_model = CheckResponse)
def check_text(payload: CheckRequest):
    issues = engine.analyze(payload.text)
    # Convert code-point offsets to JS UTF-16 code unit offsets
    utf16_issues = convert_to_utf16_offsets(payload.text, issues)
    return CheckResponse(issues=utf16_issues)