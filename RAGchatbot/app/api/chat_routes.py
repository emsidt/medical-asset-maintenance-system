from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.chat import ChatStreamRequest
from app.schemas.session import CreateSessionResponse

from app.repositories.session_repository import create_session

from app.services.chat_service import stream_chat

from app.auth import (
    RagPrincipal,
    get_current_principal
)

router = APIRouter()

@router.post(
    "/sessions",
    response_model=CreateSessionResponse
)
async def create_chat_session(
    principal: Annotated[
        RagPrincipal,
        Depends(get_current_principal)
    ],
    db: AsyncSession = Depends(get_db)
):

    session = await create_session(
        db=db,
        user_id=principal.username,
        user_role=principal.role,
        title="New Chat"
    )

    return CreateSessionResponse(
        sessionId=session.id,
        title=session.title,
        createdAt=session.created_at.isoformat()
    )


@router.post("/stream")
async def stream_endpoint(
    request: ChatStreamRequest,
    principal: Annotated[
        RagPrincipal,
        Depends(get_current_principal)
    ],
    db: AsyncSession = Depends(get_db)
):

    return StreamingResponse(
        stream_chat(
            db=db,
            session_id=request.sessionId,
            user_message=request.message
        ),
        media_type="text/event-stream"
    )