from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.producto import Producto as ProductoModel
from app.schemas.producto import Producto, ProductoCreate

router = APIRouter(prefix="/negocios/{negocio_id}/productos", tags=["productos"])


@router.get("", response_model=list[Producto])
def list_productos(negocio_id: int, db: Session = Depends(get_db)):
    return db.query(ProductoModel).filter(ProductoModel.negocio_id == negocio_id).all()


@router.post("", response_model=Producto, status_code=201)
def create_producto(negocio_id: int, payload: ProductoCreate, db: Session = Depends(get_db)):
    producto = ProductoModel(negocio_id=negocio_id, **payload.model_dump())
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto
