from pydantic import BaseModel, ConfigDict


class UsuarioBase(BaseModel):
    nombre: str
    rol: str


class UsuarioCreate(UsuarioBase):
    pass


class Usuario(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
