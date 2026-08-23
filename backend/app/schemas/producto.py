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


class ProductoAjusteStock(BaseModel):
    """Suma o resta stock sin pasar por registro_compra.

    A diferencia de RegistroCompra (que lleva costo_unitario y alimenta el
    total comprado de SUNAT), esto es solo un ajuste de cantidad: reponer
    sin factura a mano, o corregir un conteo mal hecho. Por eso no está
    gateado por modulo_rus_activo — cualquier negocio necesita poder
    corregir su stock, tenga o no activado el régimen RUS.
    """

    # Positivo repone, negativo corrige (ej. se contó de más por error).
    delta: int
