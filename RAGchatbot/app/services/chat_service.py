from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.message_repository import save_message
from app.services.rag_service import ask_question
from app.repositories.message_repository import get_message_from_session


def format_sse_event(event: str, data: str) -> str:
    lines = str(data).splitlines() or [""]
    payload = "\n".join(f"data: {line}" for line in lines)
    return f"event: {event}\n{payload}\n\n"


async def stream_chat(
    db: AsyncSession,
    session_id: str,
    user_message: str,
    username: str,
    user_role: str
):

    await save_message(
        db=db,
        session_id=session_id,
        role="user",
        content=user_message
    )

    history = await get_message_from_session(db, session_id)

    full_answer = ""

    async for token in ask_question(
        question=user_message,
        session_id=session_id,
        history=history,
        db=db,
        username=username,
        user_role=user_role
    ):

        full_answer += token

        yield format_sse_event("token", token)

    assistant_message = await save_message(
        db=db,
        session_id=session_id,
        role="assistant",
        content=full_answer
    )

    yield format_sse_event("done", assistant_message.id)
