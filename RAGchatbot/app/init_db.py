from app.core.database import engine, Base

from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage


async def init_models():

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)