from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class RegistroCompraCreate(BaseModel):
    producto_id: int
    cantidad: int
    costo_unitario: Decimal
    # Si no llega, el endpoint usa la fecha del día (compra recién hecha).
    fecha: date | None = None


class RegistroCompra(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
    producto_id: int
    cantidad: int
    costo_unitario: Decimal
    fecha: date
