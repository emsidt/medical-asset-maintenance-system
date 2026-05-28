from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.chat_routes import router
from app.init_db import init_models


@asynccontextmanager
async def lifespan(app: FastAPI):

    await init_models()

    yield


app = FastAPI(
    lifespan=lifespan
)

app.include_router(router)