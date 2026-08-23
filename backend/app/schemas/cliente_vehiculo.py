from datetime import date

from pydantic import BaseModel, ConfigDict


class ClienteVehiculoBase(BaseModel):
    nombre_cliente: str
    telefono: str | None = None
    placa: str | None = None
    marca_vehiculo: str | None = None
    modelo_vehiculo: str | None = None
    tipo_aceite: str | None = None
    # Intervalo en meses entre servicios (ej. cambio de aceite cada 1 mes),
    # definido a mano por el negocio — no hay cálculo por kilometraje.
    intervalo_meses: int | None = None
    fecha_ultimo_servicio: date | None = None


class ClienteVehiculoCreate(ClienteVehiculoBase):
    pass


class ClienteVehiculoUpdate(BaseModel):
    """Todos los campos opcionales: sirve tanto para editar datos puntuales
    como para archivar mandando solo `activo=false`."""

    nombre_cliente: str | None = None
    telefono: str | None = None
    placa: str | None = None
    marca_vehiculo: str | None = None
    modelo_vehiculo: str | None = None
    tipo_aceite: str | None = None
    intervalo_meses: int | None = None
    fecha_ultimo_servicio: date | None = None
    activo: bool | None = None


class ClienteVehiculo(ClienteVehiculoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    negocio_id: int
    # Derivado, no se manda al crear/editar: lo calcula el backend a partir
    # de fecha_ultimo_servicio + intervalo_meses.
    fecha_proximo_mantenimiento: date | None
    activo: bool
