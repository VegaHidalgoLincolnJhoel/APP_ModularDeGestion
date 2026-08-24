from datetime import date

from pydantic import BaseModel, ConfigDict

from app.schemas.usuario import UsuarioCreate


class NegocioBase(BaseModel):
    nombre: str
    rubro: str
    modulos_activos: dict = {}
    plan_estado: str = "activo"
    fecha_ultimo_pago: date | None = None
    link_sunat: str | None = None
    modulo_rus_activo: bool = False


class NegocioCreate(NegocioBase):
    # Alta de negocio es admin-only y crea el primer usuario del negocio en
    # el mismo paso — sin esto el negocio quedaría creado pero sin ninguna
    # credencial con la que entrar. UsuarioCreate ya trae username/password.
    usuario_inicial: UsuarioCreate


class NegocioUpdate(BaseModel):
    """Todo opcional: el PATCH solo toca los campos que el cliente mande.

    Pensado sobre todo para `link_sunat` (pestaña SUNAT del frontend), pero
    se deja genérico en vez de un endpoint de un solo campo — mismo patrón
    que ClienteVehiculoUpdate — para no tener que agregar otro PATCH cada
    vez que aparezca un campo más de configuración del negocio.
    """

    nombre: str | None = None
    rubro: str | None = None
    modulos_activos: dict | None = None
    plan_estado: str | None = None
    fecha_ultimo_pago: date | None = None
    link_sunat: str | None = None
    modulo_rus_activo: bool | None = None


class Negocio(NegocioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
