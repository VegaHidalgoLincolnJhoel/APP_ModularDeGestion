from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ProductoBase(BaseModel):
    nombre: str
    medida: str | None = None
    marca: str | None = None
    estado_uso: str | None = None
    # Decimal, no float: coincide con Numeric(10, 2) en el modelo SQLAlchemy
    # y evita errores de precisión al sumar montos (cierres de caja, etc.).
    precio_lista: Decimal = Decimal("0")
    precio_compra: Decimal = Decimal("0")
    clasificacion: str | None = None
    stock_actual: int = 0
    stock_minimo: int = 0
    activo: bool = True


class ProductoCreate(ProductoBase):
    pass


class Producto(ProductoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
