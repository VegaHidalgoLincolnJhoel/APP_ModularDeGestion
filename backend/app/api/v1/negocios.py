from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.schemas.negocio import Negocio, NegocioCreate

router = APIRouter(prefix="/negocios", tags=["negocios"])


@router.get("", response_model=list[Negocio])
def list_negocios(db: Session = Depends(get_db)):
    return db.query(NegocioModel).all()


@router.post("", response_model=Negocio, status_code=201)
def create_negocio(payload: NegocioCreate, db: Session = Depends(get_db)):
    negocio = NegocioModel(**payload.model_dump())
    db.add(negocio)
    db.commit()
    db.refresh(negocio)
    return negocio


@router.get("/{negocio_id}", response_model=Negocio)
def get_negocio(negocio_id: int, db: Session = Depends(get_db)):
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio
