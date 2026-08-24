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


class Usuario(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # None para admin (no está atado a un negocio); requerido para el resto.
    negocio_id: int | None
