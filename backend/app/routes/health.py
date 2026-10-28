from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.schemas.pydantic_models import HealthStatus

router = APIRouter()


@router.get("/health", response_model=HealthStatus)
def get_health(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    return HealthStatus(
        status="healthy" if db_status == "connected" else "degraded",
        database=db_status,
        demo_mode=settings.DEMO_MODE,
        version="1.0.0",
        notice=settings.DEMO_LABEL,
    )
