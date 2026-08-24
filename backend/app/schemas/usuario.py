from pydantic import BaseModel, ConfigDict


class UsuarioBase(BaseModel):
    nombre: str
    rol: str
    username: str


class UsuarioCreate(UsuarioBase):
    # Plaintext solo de paso: el router la hashea antes de tocar la DB y
    # nunca la vuelve a devolver — por eso no está en UsuarioBase ni en el
    # schema de respuesta.
    password: str


class UsuarioUpdate(BaseModel):
    """Update parcial (exclude_unset): mismo criterio que NegocioUpdate y
    ClienteVehiculoUpdate. Pensado para el panel de admin — resetear
    contraseña y desactivar un acceso son la misma operación (un PATCH),
    no dos endpoints separados."""

    nombre: str | None = None
    rol: str | None = None
    password: str | None = None
    # False = revoca el login sin borrar el usuario (el historial que lo
    # referencia, ej. movimientos, no se rompe).
    activo: bool | None = None


class Usuario(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # None para admin (no está atado a un negocio); requerido para el resto.
    negocio_id: int | None
    activo: bool
