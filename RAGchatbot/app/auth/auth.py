import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer()


class RagPrincipal:
    def __init__(self, username: str, role: str, scope: str):
        self.username = username
        self.role = role
        self.scope = scope


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]
) -> RagPrincipal:
    try:
        payload = jwt.decode(
            credentials.credentials,
            os.environ["RAG_JWT_SECRET"],
            algorithms=["HS256"],
            issuer=os.getenv("RAG_JWT_ISSUER", "medical-backend"),
            audience=os.getenv("RAG_JWT_AUDIENCE", "rag-service"),
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid RAG token") from exc

    scope = payload.get("scope")
    if scope != "rag:chat":
        raise HTTPException(status_code=403, detail="Missing rag:chat scope")

    return RagPrincipal(
        username=payload["sub"],
        role=payload["role"],
        scope=scope,
    )