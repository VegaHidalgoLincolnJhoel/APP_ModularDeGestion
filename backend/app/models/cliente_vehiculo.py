from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class ClienteVehiculo(Base):
    """Módulo opcional: requiere modulos_activos del negocio habilitado."""

    __tablename__ = "clientes_vehiculos"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    nombre_cliente: Mapped[str] = mapped_column(String(200), nullable=False)
    telefono: Mapped[str | None] = mapped_column(String(30), nullable=True)
    placa: Mapped[str | None] = mapped_column(String(20), nullable=True)
    marca_vehiculo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modelo_vehiculo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tipo_aceite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    intervalo_meses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fecha_ultimo_servicio: Mapped[date | None] = mapped_column(Date, nullable=True)
    fecha_proximo_mantenimiento: Mapped[date | None] = mapped_column(Date, nullable=True)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
