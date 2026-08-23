from datetime import date

from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id"), nullable=False)
    periodo: Mapped[str] = mapped_column(String(50), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    total_bruto: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_capital: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_ganancia: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_efectivo: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total_digital: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
