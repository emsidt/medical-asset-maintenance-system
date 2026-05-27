import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker
)

from sqlalchemy.orm import DeclarativeBase

# Force override existing environment variables to ensure local .env values are used
current_dir = os.path.dirname(os.path.abspath(__file__))
rag_root = os.path.dirname(os.path.dirname(current_dir))
env_path = os.path.join(rag_root, ".env")

load_dotenv(dotenv_path=env_path, override=True)


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+aiomysql://root:160220057a@localhost:3306/medical_system"
)

# Print a masked version of the database URL for debug purposes and check the password
try:
    url_parts = DATABASE_URL.split("@")
    host_part = url_parts[1]
    credentials_part = url_parts[0].split("://")[1]
    db_driver = DATABASE_URL.split("://")[0]
    username = credentials_part.split(":")[0]
    password = credentials_part.split(":")[1]
    db_name = host_part.split("/")[-1]
    print(f"DB CONFIG: Connecting using {db_driver} with user '{username}' to host '{host_part.split('/')[0]}' database '{db_name}'")
    print(f"DB CONFIG DEBUG: Password matches '160220057a' = {password == '160220057a'}")
    print(f"DB CONFIG DEBUG: Password matches '123456' = {password == '123456'}")
except Exception as e:
    print(f"DB CONFIG: Connecting using custom DATABASE_URL configuration. Error: {e}")


engine = create_async_engine(
    DATABASE_URL,
    echo=True
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
