from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.models.chat_message import ChatMessage


async def save_message(
    db: AsyncSession,
    session_id: str,
    role: str,
    content: str,
    metadata: dict | None = None
):

    message = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        metadata_json=metadata
    )

    db.add(message)

    await db.commit()

    await db.refresh(message)

    return message

async def get_message_from_session(
        db: AsyncSession,
        session_id: str
):
    
    stmt = select(ChatMessage).where(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc())

    result = await db.execute(stmt)

    return result.scalars().all()

