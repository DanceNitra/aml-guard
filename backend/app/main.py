"""
AML Guard — FastAPI Application
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, close_db

from app.api.auth import router as auth_router
from app.api.policy import router as policy_router
from app.api.cdd import router as cdd_router
from app.api.ubo import router as ubo_router
from app.api.str import router as str_router
from app.api.training import router as training_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    print("Database initialized — tables created")
    yield
    await close_db()
    print("Database closed")


app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

# Routers
app.include_router(auth_router)
app.include_router(policy_router)
app.include_router(cdd_router)
app.include_router(ubo_router)
app.include_router(str_router)
app.include_router(training_router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION, "routes": len(app.routes)}
