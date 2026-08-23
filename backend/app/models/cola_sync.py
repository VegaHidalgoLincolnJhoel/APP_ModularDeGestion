from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ColaSync(Base):
    """Cola de sincronización offline-first: cambios generados en el
    frontend mientras no había conexión, pendientes de aplicar en backend."""

    __tablename__ = "cola_sync"
    __table_args__ = (
        # Garantiza la idempotencia a nivel de base de datos, no solo en el
        # endpoint: dos requests con el mismo cliente_id para el mismo
        # negocio no pueden insertarse dos veces aunque lleguen en paralelo.
        UniqueConstraint("negocio_id", "cliente_id", name="uq_cola_sync_negocio_cliente_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    # uuid generado en el frontend al encolar el cambio offline. Es la clave
    # de idempotencia real: `id` de acá arriba es solo el PK interno.
    cliente_id: Mapped[str] = mapped_column(String(64), nullable=False)
    entidad: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    estado: Mapped[str] = mapped_column(String(50), default="pendiente")
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fecha_sincronizado: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
