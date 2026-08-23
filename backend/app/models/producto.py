from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Producto(Base):
    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    medida: Mapped[str | None] = mapped_column(String(50), nullable=True)
    marca: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado_uso: Mapped[str | None] = mapped_column(String(50), nullable=True)
    precio_lista: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    precio_compra: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    clasificacion: Mapped[str | None] = mapped_column(String(100), nullable=True)
    stock_actual: Mapped[int] = mapped_column(Integer, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    negocio: Mapped["Negocio"] = relationship(back_populates="productos")
