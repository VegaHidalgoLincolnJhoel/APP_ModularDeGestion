from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CierreCajaCreate(BaseModel):
    # Etiqueta libre ("diario", "semanal", "mensual") que decide el negocio
    # al pedir el cierre; el rango real de fechas es el que manda el cálculo.
    periodo: str
    fecha_inicio: date
    fecha_fin: date


class CierreCaja(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
    periodo: str
    fecha_inicio: date
    fecha_fin: date
    total_bruto: Decimal
    total_capital: Decimal
    total_ganancia: Decimal
    total_efectivo: Decimal
    total_digital: Decimal
