"""
AML Guard — Async Database Engine
SQLite pre local dev, PostgreSQL pre produkciu.
"""

import json
from datetime import datetime
from typing import Optional

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


# ─── Database Engine ───

def create_db_engine():
    """Create async engine based on DATABASE_URL from settings."""
    url = settings.DATABASE_URL
    
    # SQLite needs special config for async
    if url.startswith("sqlite"):
        engine = create_async_engine(
            url,
            echo=settings.DEBUG,
            connect_args={"check_same_thread": False}
        )
    else:
        engine = create_async_engine(url, echo=settings.DEBUG)
    
    return engine


engine = create_db_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """FastAPI dependency — yields an async DB session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables. Call on app startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Dispose engine. Call on app shutdown."""
    await engine.dispose()


# ─── Mixins ───

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(nullable=False, default=lambda: datetime.utcnow())
    updated_at: Mapped[datetime] = mapped_column(nullable=False, default=lambda: datetime.utcnow(), onupdate=lambda: datetime.utcnow())


class JSONSerializable:
    """Helper to serialize models to dicts for API responses."""
    
    def to_dict(self, exclude: set = None) -> dict:
        exclude = exclude or set()
        result = {}
        for column in self.__table__.columns:
            if column.name in exclude:
                continue
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result
