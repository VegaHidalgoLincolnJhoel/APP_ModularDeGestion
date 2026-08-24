from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import verificar_acceso_negocio
from app.core.modulos import verificar_modulo_rus_activo
from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.models.producto import Producto as ProductoModel
from app.models.registro_compra import RegistroCompra as RegistroCompraModel
from app.schemas.registro_compra import RegistroCompra, RegistroCompraCreate

router = APIRouter(
    prefix="/negocios/{negocio_id}/registro-compras",
    tags=["registro-compras"],
    dependencies=[Depends(verificar_acceso_negocio)],
)


def _get_negocio_con_rus(negocio_id: int, db: Session) -> NegocioModel:
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    verificar_modulo_rus_activo(negocio)
    return negocio


@router.get("", response_model=list[RegistroCompra])
def list_registro_compras(negocio_id: int, db: Session = Depends(get_db)):
    _get_negocio_con_rus(negocio_id, db)
    return (
        db.query(RegistroCompraModel)
        .filter(RegistroCompraModel.negocio_id == negocio_id)
        .order_by(RegistroCompraModel.fecha.desc())
        .all()
    )


@router.post("", response_model=RegistroCompra, status_code=201)
def create_registro_compra(
    negocio_id: int, payload: RegistroCompraCreate, db: Session = Depends(get_db)
):
    """Registra una compra/reposición de stock.

    Suma `cantidad` al `stock_actual` del producto y deja el costo unitario
    pagado como historial — de ahí sale el total comprado del mes que pide
    la pestaña SUNAT.
    """
    _get_negocio_con_rus(negocio_id, db)

    producto = db.get(ProductoModel, payload.producto_id)
    if producto is None or producto.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if payload.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0")

    registro = RegistroCompraModel(
        negocio_id=negocio_id,
        producto_id=payload.producto_id,
        cantidad=payload.cantidad,
        costo_unitario=payload.costo_unitario,
        fecha=payload.fecha or date.today(),
    )
    db.add(registro)
    producto.stock_actual += payload.cantidad

    db.commit()
    db.refresh(registro)
    return registro
