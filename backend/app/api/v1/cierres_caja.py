from datetime import datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.contabilidad import es_capital
from app.db.session import get_db
from app.models.cierre_caja import CierreCaja as CierreCajaModel
from app.models.movimiento import Movimiento as MovimientoModel
from app.models.negocio import Negocio as NegocioModel
from app.models.producto import Producto as ProductoModel
from app.schemas.cierre_caja import CierreCaja, CierreCajaCreate

router = APIRouter(prefix="/negocios/{negocio_id}/cierres-caja", tags=["cierres-caja"])

METODO_EFECTIVO = "efectivo"
METODO_DIGITAL = "digital"


def _get_negocio_o_404(negocio_id: int, db: Session) -> NegocioModel:
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio


@router.get("", response_model=list[CierreCaja])
def list_cierres_caja(negocio_id: int, db: Session = Depends(get_db)):
    _get_negocio_o_404(negocio_id, db)
    return (
        db.query(CierreCajaModel)
        .filter(CierreCajaModel.negocio_id == negocio_id)
        .order_by(CierreCajaModel.fecha_fin.desc())
        .all()
    )


@router.post("", response_model=CierreCaja, status_code=201)
def create_cierre_caja(negocio_id: int, payload: CierreCajaCreate, db: Session = Depends(get_db)):
    """Cierra caja para un rango de fechas.

    Suma los movimientos del negocio dentro del rango y guarda el desglose
    (capital vs ganancia, efectivo vs digital) como un registro fijo: el
    cierre queda como una foto del período, no se recalcula después aunque
    esos movimientos cambien.
    """
    _get_negocio_o_404(negocio_id, db)

    if payload.fecha_fin < payload.fecha_inicio:
        raise HTTPException(status_code=400, detail="fecha_fin no puede ser anterior a fecha_inicio")

    # movimiento.fecha es datetime; el rango debe cubrir el día completo de
    # fecha_fin, no solo la medianoche.
    inicio = datetime.combine(payload.fecha_inicio, time.min)
    fin = datetime.combine(payload.fecha_fin, time.max)

    filas = (
        db.query(MovimientoModel.precio_final, MovimientoModel.metodo_pago, ProductoModel.clasificacion)
        .join(ProductoModel, MovimientoModel.producto_id == ProductoModel.id)
        .filter(
            MovimientoModel.negocio_id == negocio_id,
            MovimientoModel.fecha >= inicio,
            MovimientoModel.fecha <= fin,
        )
        .all()
    )

    total_bruto = Decimal("0")
    total_capital = Decimal("0")
    total_ganancia = Decimal("0")
    total_efectivo = Decimal("0")
    total_digital = Decimal("0")

    for precio_final, metodo_pago, clasificacion in filas:
        monto = Decimal(precio_final)
        total_bruto += monto
        if es_capital(clasificacion):
            total_capital += monto
        else:
            total_ganancia += monto

        if metodo_pago == METODO_EFECTIVO:
            total_efectivo += monto
        elif metodo_pago == METODO_DIGITAL:
            total_digital += monto

    cierre = CierreCajaModel(
        negocio_id=negocio_id,
        periodo=payload.periodo,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        total_bruto=total_bruto,
        total_capital=total_capital,
        total_ganancia=total_ganancia,
        total_efectivo=total_efectivo,
        total_digital=total_digital,
    )
    db.add(cierre)
    db.commit()
    db.refresh(cierre)
    return cierre
