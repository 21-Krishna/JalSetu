from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.seed import seed_database

# Routers
from app.routes.health import router as health_router
from app.routes.cities import router as cities_router
from app.routes.dashboard import router as dashboard_router
from app.routes.network import router as network_router
from app.routes.incidents import router as incidents_router
from app.routes.plans import router as plans_router
from app.routes.allocations import router as allocations_router
from app.routes.audit import router as audit_router
from app.routes.demo import router as demo_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created and initial data seeded
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend decision-support API and multi-agent system for simulated urban water crises.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers under /api/v1
for r in [
    health_router,
    cities_router,
    dashboard_router,
    network_router,
    incidents_router,
    plans_router,
    allocations_router,
    audit_router,
    demo_router,
]:
    app.include_router(r, prefix=settings.API_V1_STR)
    # Also alias under /api for seamless cross-compatibility
    app.include_router(r, prefix="/api")


@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "demo_mode": settings.DEMO_MODE,
        "notice": settings.DEMO_LABEL,
        "api_v1": settings.API_V1_STR,
        "docs": "/docs",
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )
