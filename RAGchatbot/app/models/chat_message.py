import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    DateTime,
    Text,
    ForeignKey,
    JSON
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column
)

from app.core.database import Base


class ChatMessage(Base):

    __tablename__ = "rag_chat_messages"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    session_id: Mapped[str] = mapped_column(
        ForeignKey("rag_chat_sessions.id")
    )

    role: Mapped[str] = mapped_column(
        String(50)
    )

    content: Mapped[str] = mapped_column(
        Text
    )

    metadata_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )