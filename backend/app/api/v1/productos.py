from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import verificar_acceso_negocio
from app.core.duplicados import son_parecidos
from app.db.session import get_db
from app.models.producto import Producto as ProductoModel
from app.schemas.producto import Producto, ProductoAjusteStock, ProductoCreate

router = APIRouter(
    prefix="/negocios/{negocio_id}/productos",
    tags=["productos"],
    dependencies=[Depends(verificar_acceso_negocio)],
)


def _get_producto_o_404(negocio_id: int, producto_id: int, db: Session) -> ProductoModel:
    producto = db.get(ProductoModel, producto_id)
    if producto is None or producto.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


@router.get("", response_model=list[Producto])
def list_productos(negocio_id: int, db: Session = Depends(get_db)):
    return db.query(ProductoModel).filter(ProductoModel.negocio_id == negocio_id).all()


@router.post("", response_model=Producto, status_code=201)
def create_producto(
    negocio_id: int,
    payload: ProductoCreate,
    confirmar_nuevo: bool = False,
    db: Session = Depends(get_db),
):
    """Crea un producto o servicio de catálogo.

    Regla transversal anti-duplicados: antes de guardar, busca en el mismo
    negocio nombres parecidos al que llega (ignorando mayúsculas, espacios
    de más y variaciones menores). Si encuentra alguno y el cliente no
    mandó `confirmar_nuevo=true`, responde 409 con los candidatos para que
    el frontend ofrezca "usar el existente" o "es otro, crear nuevo".
    """
    if not confirmar_nuevo:
        existentes = db.query(ProductoModel).filter(ProductoModel.negocio_id == negocio_id).all()
        parecidos = [p for p in existentes if son_parecidos(p.nombre, payload.nombre)]
        if parecidos:
            raise HTTPException(
                status_code=409,
                detail={
                    "codigo": "posible_duplicado",
                    "mensaje": (
                        "Ya existe(n) producto(s) con nombre parecido. Reintenta con "
                        "confirmar_nuevo=true si de verdad es otro."
                    ),
                    "candidatos": [
                        {"id": p.id, "nombre": p.nombre, "medida": p.medida, "marca": p.marca}
                        for p in parecidos
                    ],
                },
            )

    producto = ProductoModel(negocio_id=negocio_id, **payload.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto


@router.post("/{producto_id}/ajustar-stock", response_model=Producto)
def ajustar_stock(
    negocio_id: int,
    producto_id: int,
    payload: ProductoAjusteStock,
    db: Session = Depends(get_db),
):
    """Suma o resta stock directo, sin costo ni impacto en SUNAT.

    Complementa a `registro-compras`: ese lleva costo_unitario y alimenta
    el total comprado del mes (gateado por modulo_rus_activo); esto es
    para reponer sin factura a mano o corregir un conteo, y está
    disponible para cualquier negocio.
    """
    producto = _get_producto_o_404(negocio_id, producto_id, db)

    if payload.delta == 0:
        raise HTTPException(status_code=400, detail="delta no puede ser 0")

    stock_resultante = producto.stock_actual + payload.delta
    if stock_resultante < 0:
        raise HTTPException(
            status_code=400,
            detail=f"El ajuste dejaría el stock en {stock_resultante}; no puede ser negativo.",
        )

    producto.stock_actual = stock_resultante
    db.commit()
    db.refresh(producto)
    return producto
