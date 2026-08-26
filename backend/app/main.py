from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa app.db.base para registrar TODOS los modelos en el registry de
# SQLAlchemy antes de que se configure cualquier mapper (los `relationship`
# entre modelos se resuelven por nombre de clase). Sin este import, un
# router que solo referencia un par de modelos puede fallar en runtime si
# esos modelos tienen relationship() hacia clases que nadie más importó.
from app.db import base as _base  # noqa: F401

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(title="APP_ModularDeGestion API", version="0.1.0")

is_wildcard = "*" in settings.cors_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
