from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.usuario import Usuario, UsuarioCreate

router = APIRouter(prefix="/negocios/{negocio_id}/usuarios", tags=["usuarios"])


@router.get("", response_model=list[Usuario])
def list_usuarios(negocio_id: int, db: Session = Depends(get_db)):
    """Lista los usuarios del negocio.

    Todavía no hay login individual por empleado (ver "Fuera de alcance" en
    el CLAUDE.md raíz): cada negocio arranca con un único usuario creado
    automáticamente al crear el negocio (ver `create_negocio` en
    `negocios.py`). Este endpoint existe sobre todo para que el frontend
    pueda resolver el `usuario_id` que necesita `POST /movimientos`, en vez
    de hardcodearlo.
    """
    return db.query(UsuarioModel).filter(UsuarioModel.negocio_id == negocio_id).all()


@router.post("", response_model=Usuario, status_code=201)
def create_usuario(negocio_id: int, payload: UsuarioCreate, db: Session = Depends(get_db)):
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    usuario = UsuarioModel(negocio_id=negocio_id, **payload.model_dump())
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario
