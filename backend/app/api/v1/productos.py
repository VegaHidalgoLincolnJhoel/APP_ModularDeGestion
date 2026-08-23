from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.duplicados import son_parecidos
from app.db.session import get_db
from app.models.producto import Producto as ProductoModel
from app.schemas.producto import Producto, ProductoCreate

router = APIRouter(prefix="/negocios/{negocio_id}/productos", tags=["productos"])


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
