import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .content.routes import router as content_router
from .analytics.routes import router as analytics_router

app = FastAPI(title="NEPSE MTA Content Engine", version="10.0.0")


def _cors_origins():
    raw = os.environ.get("CORS_ALLOW_ORIGINS", "")
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    for origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5185",
        "http://127.0.0.1:5185",
    ):
        if origin not in origins:
            origins.append(origin)
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"ok": True, "service": "nepse-mta-content-engine"}

app.include_router(content_router, prefix="/api/content", tags=["content"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
