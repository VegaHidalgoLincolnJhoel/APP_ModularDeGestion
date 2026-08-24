from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.v1.movimientos import _crear_movimiento
from app.core.auth import verificar_acceso_negocio
from app.db.session import get_db
from app.models.cola_sync import ColaSync as ColaSyncModel
from app.models.negocio import Negocio as NegocioModel
from app.schemas.cola_sync import ColaSyncItem, ColaSyncResultado
from app.schemas.movimiento import MovimientoCreate

router = APIRouter(
    prefix="/negocios/{negocio_id}/sync",
    tags=["sync"],
    dependencies=[Depends(verificar_acceso_negocio)],
)

# Entidades que ya saben aplicarse desde la cola offline. El resto del
# núcleo (producto, cliente_vehiculo, registro_compra) se va sumando acá a
# medida que el frontend offline-first (Fase 2) los empiece a encolar.
ENTIDADES_SOPORTADAS = {"movimiento"}


@router.post("", response_model=list[ColaSyncResultado])
def procesar_sync(negocio_id: int, items: list[ColaSyncItem], db: Session = Depends(get_db)):
    """Aplica la cola de cambios que el frontend hizo mientras estaba offline.

    Idempotente por `item.id` (el uuid que genera el cliente al encolar, no
    un id de base de datos): si ese id ya se procesó antes, no se vuelve a
    aplicar — se responde "duplicado". Así un reintento de red del frontend
    nunca duplica una venta ya registrada.
    """
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    return [_procesar_item(negocio, item, db) for item in items]


def _procesar_item(negocio: NegocioModel, item: ColaSyncItem, db: Session) -> ColaSyncResultado:
    ya_procesado = (
        db.query(ColaSyncModel)
        .filter(ColaSyncModel.negocio_id == negocio.id, ColaSyncModel.cliente_id == item.id)
        .first()
    )
    if ya_procesado is not None:
        return ColaSyncResultado(
            id=item.id,
            estado="duplicado",
            detalle=f"Ya se había procesado antes (resultado original: {ya_procesado.estado}).",
        )

    if item.entidad not in ENTIDADES_SOPORTADAS:
        _guardar_registro(negocio.id, item, db, estado="error")
        return ColaSyncResultado(
            id=item.id,
            estado="error",
            detalle=f"La entidad '{item.entidad}' todavía no tiene sincronización soportada.",
        )

    try:
        movimiento_payload = MovimientoCreate(**item.payload)
        # La venta ya ocurrió en la realidad mientras el negocio estaba
        # offline — no hay nadie mirando la pantalla para confirmar el aviso
        # de stock bajo mínimo, así que se aplica igual y queda para que el
        # dueño lo revise después en el reporte de stock.
        _crear_movimiento(negocio.id, movimiento_payload, confirmar_bajo_minimo=True, db=db)
    except (ValidationError, HTTPException) as exc:
        db.rollback()
        detalle = _detalle_de_error(exc)
        _guardar_registro(negocio.id, item, db, estado="error")
        return ColaSyncResultado(id=item.id, estado="error", detalle=detalle)

    _guardar_registro(negocio.id, item, db, estado="aplicado")
    return ColaSyncResultado(id=item.id, estado="aplicado", detalle=None)


def _guardar_registro(negocio_id: int, item: ColaSyncItem, db: Session, estado: str) -> None:
    registro = ColaSyncModel(
        negocio_id=negocio_id,
        cliente_id=item.id,
        entidad=item.entidad,
        payload=item.payload,
        estado=estado,
    )
    db.add(registro)
    db.commit()


def _detalle_de_error(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        return exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return str(exc)
