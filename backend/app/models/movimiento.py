from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class Movimiento(Base):
    """Venta o servicio realizado: producto/servicio + cliente-vehículo opcional."""

    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"), nullable=False)
    cliente_vehiculo_id: Mapped[int | None] = mapped_column(
        ForeignKey("clientes_vehiculos.id"), nullable=True
    )
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(500), nullable=True)
    precio_lista: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    precio_final: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    monto_capital: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    metodo_pago: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
