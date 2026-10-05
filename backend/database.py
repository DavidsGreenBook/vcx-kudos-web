from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

db_url = os.environ.get("POSTGRES_URL") or os.environ.get("DATABASE_URL")

if db_url:
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    # Ensure compatibility with psycopg2 if psycopg (v3) is not installed
    try:
        import psycopg  # noqa: F401
    except (ImportError, Exception):
        try:
            import psycopg2  # noqa: F401
            if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
                db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            pass
    SQLALCHEMY_DATABASE_URL = db_url
elif os.getenv("VERCEL"):
    SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/app.db"
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DB_PATH = os.path.join(BASE_DIR, "recognition.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
