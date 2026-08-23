from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class NotificacionWsp(Base):
    __tablename__ = "notificaciones_wsp"

    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_vehiculo_id: Mapped[int] = mapped_column(
        ForeignKey("clientes_vehiculos.id"), nullable=False
    )
    fecha_envio: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="pendiente")
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
