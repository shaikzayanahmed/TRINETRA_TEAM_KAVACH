import asyncio
import os
import sys

# Ensure local backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import engine
from app.models import *

async def main():
    print(f"Creating all tables using engine: {engine.url}...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[+] All database tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
