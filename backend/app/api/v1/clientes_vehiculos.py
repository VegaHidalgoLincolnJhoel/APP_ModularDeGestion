from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.mantenimiento import calcular_proximo_mantenimiento
from app.core.modulos import MODULO_CLIENTES_VEHICULOS, verificar_modulo_activo
from app.db.session import get_db
from app.models.cliente_vehiculo import ClienteVehiculo as ClienteVehiculoModel
from app.models.negocio import Negocio as NegocioModel
from app.schemas.cliente_vehiculo import (
    ClienteVehiculo,
    ClienteVehiculoCreate,
    ClienteVehiculoUpdate,
)

router = APIRouter(prefix="/negocios/{negocio_id}/clientes-vehiculos", tags=["clientes-vehiculos"])


def _get_negocio_con_modulo(negocio_id: int, db: Session) -> NegocioModel:
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    verificar_modulo_activo(negocio, MODULO_CLIENTES_VEHICULOS)
    return negocio


def _get_cliente_vehiculo_o_404(
    negocio_id: int, cliente_vehiculo_id: int, db: Session
) -> ClienteVehiculoModel:
    cliente_vehiculo = db.get(ClienteVehiculoModel, cliente_vehiculo_id)
    if cliente_vehiculo is None or cliente_vehiculo.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Cliente/vehículo no encontrado")
    return cliente_vehiculo


@router.get("", response_model=list[ClienteVehiculo])
def list_clientes_vehiculos(
    negocio_id: int,
    activo: bool | None = Query(None, description="Filtra por activos o archivados"),
    db: Session = Depends(get_db),
):
    _get_negocio_con_modulo(negocio_id, db)
    query = db.query(ClienteVehiculoModel).filter(ClienteVehiculoModel.negocio_id == negocio_id)
    if activo is not None:
        query = query.filter(ClienteVehiculoModel.activo == activo)
    return query.order_by(ClienteVehiculoModel.nombre_cliente).all()


@router.post("", response_model=ClienteVehiculo, status_code=201)
def create_cliente_vehiculo(
    negocio_id: int, payload: ClienteVehiculoCreate, db: Session = Depends(get_db)
):
    _get_negocio_con_modulo(negocio_id, db)

    cliente_vehiculo = ClienteVehiculoModel(
        negocio_id=negocio_id,
        **payload.model_dump(),
        fecha_proximo_mantenimiento=calcular_proximo_mantenimiento(
            payload.fecha_ultimo_servicio, payload.intervalo_meses
        ),
    )
    db.add(cliente_vehiculo)
    db.commit()
    db.refresh(cliente_vehiculo)
    return cliente_vehiculo


@router.patch("/{cliente_vehiculo_id}", response_model=ClienteVehiculo)
def update_cliente_vehiculo(
    negocio_id: int,
    cliente_vehiculo_id: int,
    payload: ClienteVehiculoUpdate,
    db: Session = Depends(get_db),
):
    """Edita datos del cliente/vehículo, o lo archiva mandando `activo=false`.

    Si la actualización toca `fecha_ultimo_servicio` o `intervalo_meses`,
    recalcula `fecha_proximo_mantenimiento` en el mismo paso.
    """
    _get_negocio_con_modulo(negocio_id, db)
    cliente_vehiculo = _get_cliente_vehiculo_o_404(negocio_id, cliente_vehiculo_id, db)

    cambios = payload.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(cliente_vehiculo, campo, valor)

    if "fecha_ultimo_servicio" in cambios or "intervalo_meses" in cambios:
        cliente_vehiculo.fecha_proximo_mantenimiento = calcular_proximo_mantenimiento(
            cliente_vehiculo.fecha_ultimo_servicio, cliente_vehiculo.intervalo_meses
        )

    db.commit()
    db.refresh(cliente_vehiculo)
    return cliente_vehiculo


@router.delete("/{cliente_vehiculo_id}", status_code=204)
def delete_cliente_vehiculo(
    negocio_id: int, cliente_vehiculo_id: int, db: Session = Depends(get_db)
):
    """Elimina el registro por completo.

    Distinto de archivar (PATCH con `activo=false`): esto es para cuando de
    verdad no se quiere seguir guardando al cliente, no solo dejar de
    mostrarlo. Si tiene movimientos o notificaciones asociadas, la FK lo
    impide y se responde 409 sugiriendo archivar en su lugar.
    """
    _get_negocio_con_modulo(negocio_id, db)
    cliente_vehiculo = _get_cliente_vehiculo_o_404(negocio_id, cliente_vehiculo_id, db)

    try:
        db.delete(cliente_vehiculo)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=(
                "No se puede eliminar: tiene movimientos o notificaciones asociadas. "
                "Archívalo en su lugar (PATCH con activo=false)."
            ),
        )
