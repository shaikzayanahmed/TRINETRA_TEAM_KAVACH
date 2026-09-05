import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Determine database URI (support PostgreSQL if configured or SQLite local database)
db_url = os.getenv("DATABASE_URL")
if not db_url:
    # If using default postgres settings, check if explicit postgres is requested or fallback to sqlite
    if os.getenv("USE_POSTGRES", "false").lower() == "true":
        db_url = settings.SQLALCHEMY_DATABASE_URI
    else:
        db_url = "sqlite+aiosqlite:///./antigravity.db"

# Create async engine
engine = create_async_engine(
    db_url,
    echo=False,
)

# Create async session maker
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

