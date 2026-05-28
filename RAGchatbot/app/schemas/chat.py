from pydantic import BaseModel

class ChatStreamRequest(BaseModel):

    sessionId: str
    message: str
    context: dict | None = None