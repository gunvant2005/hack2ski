import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL

# Fallback to /tmp if current directory is read-only (e.g. Vercel serverless functions)
if db_url.startswith("sqlite") and not db_url.startswith("sqlite:////tmp"):
    try:
        test_file = "./.write_test"
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
    except (OSError, PermissionError):
        db_url = "sqlite:////tmp/legallens.db"

connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {
        "check_same_thread": False,
        "timeout": 30.0,
    }
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )

    # SQLite pragmas with safety fallbacks
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL;")
            except Exception:
                cursor.execute("PRAGMA journal_mode=DELETE;")
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.execute("PRAGMA synchronous=NORMAL;")
            cursor.close()
        except Exception:
            pass

else:
    # Production PostgreSQL / MySQL connection pool settings
    engine = create_engine(
        db_url,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
