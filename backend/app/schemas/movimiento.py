from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class MovimientoBase(BaseModel):
    usuario_id: int
    producto_id: int
    cliente_vehiculo_id: int | None = None
    tipo: str
    descripcion: str | None = None
    metodo_pago: str | None = None


class MovimientoCreate(MovimientoBase):
    # precio_lista y precio_final son opcionales al crear: si no llegan, el
    # endpoint los completa con el precio de catálogo vigente del producto
    # (ver create_movimiento en api/v1/movimientos.py). Dejarlos editables
    # acá es lo que permite el flujo de "precio de lista mostrado, precio
    # final negociado" que pide el negocio.
    precio_lista: Decimal | None = None
    precio_final: Decimal | None = None
    # Solo se usa para reconstruir movimientos hechos offline (cola de sync);
    # en el flujo normal se omite y el servidor pone la hora de registro.
    fecha: datetime | None = None


class Movimiento(MovimientoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
    precio_lista: Decimal
    precio_final: Decimal
    fecha: datetime
