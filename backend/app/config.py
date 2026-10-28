import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "jalsetu.db"

class Settings(BaseModel):
    PROJECT_NAME: str = "JalSetu — Urban Water Crisis Decision Support System"
    API_V1_STR: str = "/api/v1"
    DEMO_MODE: bool = True
    DEMO_LABEL: str = "DEMO MODE — SIMULATED WATER NETWORK AND ILLUSTRATIVE DATA"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_FILE}")
    CORS_ORIGINS: list[str] = [
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    # Optional LLM configuration
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "deterministic")  # deterministic | mock | external
    LLM_API_KEY: str | None = os.getenv("LLM_API_KEY", None)

settings = Settings()
