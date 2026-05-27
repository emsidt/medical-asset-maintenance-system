from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatSession


async def create_session(
    db: AsyncSession,
    user_id: str,
    user_role: str,
    title: str
):

    session = ChatSession(
        user_id=user_id,
        user_role=user_role,
        title=title
    )

    db.add(session)

    await db.commit()

    await db.refresh(session)

    return session


async def get_session(
    db: AsyncSession,
    session_id: str
):

    stmt = select(ChatSession).where(
        ChatSession.id == session_id
    )

    result = await db.execute(stmt)

    return result.scalar_one_or_none()