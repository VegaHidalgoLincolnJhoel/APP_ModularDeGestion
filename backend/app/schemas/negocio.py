from datetime import date

from pydantic import BaseModel, ConfigDict


class NegocioBase(BaseModel):
    nombre: str
    rubro: str
    modulos_activos: dict = {}
    plan_estado: str = "activo"
    fecha_ultimo_pago: date | None = None
    link_sunat: str | None = None
    modulo_rus_activo: bool = False


class NegocioCreate(NegocioBase):
    pass


class Negocio(NegocioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
