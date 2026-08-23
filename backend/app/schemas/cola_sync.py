from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel


class ColaSyncItem(BaseModel):
    """Item tal como lo arma el frontend offline-first al encolarlo.

    `id` es el uuid generado en el cliente en el momento de encolar, no un
    id de base de datos — es lo que permite que un reintento de red no
    duplique la operación.
    """

    id: str
    entidad: str
    payload: dict[str, Any]
    fecha_creacion: datetime | None = None


class ColaSyncResultado(BaseModel):
    id: str
    estado: Literal["aplicado", "error", "duplicado"]
    detalle: str | None = None
