from datetime import date

from sqlalchemy import Boolean, Date, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base


class Negocio(Base):
    """Tenant raíz: todo lo demás cuelga de negocio_id."""

    __tablename__ = "negocios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    rubro: Mapped[str] = mapped_column(String(100), nullable=False)
    modulos_activos: Mapped[dict] = mapped_column(JSON, default=dict)
    plan_estado: Mapped[str] = mapped_column(String(50), default="activo")
    fecha_ultimo_pago: Mapped[date | None] = mapped_column(Date, nullable=True)
    link_sunat: Mapped[str | None] = mapped_column(String(255), nullable=True)
    modulo_rus_activo: Mapped[bool] = mapped_column(Boolean, default=False)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="negocio")
    productos: Mapped[list["Producto"]] = relationship(back_populates="negocio")
