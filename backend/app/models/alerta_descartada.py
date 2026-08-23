from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class AlertaDescartada(Base):
    """Registro de que un usuario descartó una alerta (ej. de mantenimiento)."""

    __tablename__ = "alertas_descartadas"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    referencia_id: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_descarte: Mapped[date] = mapped_column(Date, nullable=False)
