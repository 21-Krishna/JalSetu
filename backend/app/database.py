from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# For SQLite, check_same_thread=False allows FastAPI request threads
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db():
    from sqlalchemy import text
    from app.models.entities import Base
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(response_plans)")).fetchall()
            cols = [r[1] for r in res]
            if cols and "metadata_json" not in cols:
                conn.execute(text("ALTER TABLE response_plans ADD COLUMN metadata_json TEXT DEFAULT '{}'"))
                conn.commit()
        except Exception:
            pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

