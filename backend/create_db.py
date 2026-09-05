import asyncio
import os
import sys

sys.path.insert(0, "/app")

from app.db.base import Base
from app.core.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from app.models import *

async def main():
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=True)
    async with engine.begin() as conn:
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
