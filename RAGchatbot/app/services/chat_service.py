from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.message_repository import save_message
from app.services.rag_service import ask_question
from app.repositories.message_repository import get_message_from_session


async def stream_chat(
    db: AsyncSession,
    session_id: str,
    user_message: str
):

    await save_message(
        db=db,
        session_id=session_id,
        role="user",
        content=user_message
    )

    history = await get_message_from_session(db, session_id)

    full_answer = ""

    async for token in ask_question(user_message, session_id, history):

        full_answer += token

        yield (
            f"event: token\n"
            f"data: {token}\n\n"
        )

    assistant_message = await save_message(
        db=db,
        session_id=session_id,
        role="assistant",
        content=full_answer
    )

    yield (
        "event: done\n"
        f"data: {assistant_message.id}\n\n"
    )