from pydantic import BaseModel

class CreateSessionResponse(BaseModel):

    sessionId: str
    title: str
    createdAt: str