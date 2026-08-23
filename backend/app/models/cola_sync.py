from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ColaSync(Base):
    """Cola de sincronización offline-first: cambios generados en el
    frontend mientras no había conexión, pendientes de aplicar en backend."""

    __tablename__ = "cola_sync"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    entidad: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    estado: Mapped[str] = mapped_column(String(50), default="pendiente")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fecha_sincronizado: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
