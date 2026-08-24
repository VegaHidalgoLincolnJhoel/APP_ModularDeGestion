from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.negocio import Negocio, NegocioCreate, NegocioUpdate

router = APIRouter(prefix="/negocios", tags=["negocios"])


@router.get("", response_model=list[Negocio])
def list_negocios(db: Session = Depends(get_db)):
    return db.query(NegocioModel).all()


@router.post("", response_model=Negocio, status_code=201)
def create_negocio(payload: NegocioCreate, db: Session = Depends(get_db)):
    """Crea el negocio y le deja sembrado un usuario por defecto.

    Todavía no hay login individual por empleado (fuera de alcance por
    ahora, ver CLAUDE.md raíz), pero movimientos.usuario_id es obligatorio
    — así el negocio siempre tiene al menos un usuario válido para operar
    sin que el frontend tenga que adivinar o hardcodear un id.
    """
    negocio = NegocioModel(**payload.model_dump())
    db.add(negocio)
    db.flush()  # asigna negocio.id sin cerrar la transacción todavía

    usuario_por_defecto = UsuarioModel(negocio_id=negocio.id, nombre="Usuario principal", rol="dueño")
    db.add(usuario_por_defecto)

    db.commit()
    db.refresh(negocio)
    return negocio


@router.get("/{negocio_id}", response_model=Negocio)
def get_negocio(negocio_id: int, db: Session = Depends(get_db)):
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio


@router.patch("/{negocio_id}", response_model=Negocio)
def update_negocio(negocio_id: int, payload: NegocioUpdate, db: Session = Depends(get_db)):
    """Edita configuración del negocio (pensado sobre todo para link_sunat).

    No se toca modulos_activos/modulo_rus_activo/plan_estado desde acá con
    ninguna validación especial todavía — hoy solo hay una vecina y un papá,
    así que activar/desactivar módulos es manual y de confianza. Si esto
    se vuelve self-service para más negocios, va a necesitar sus propias
    reglas (ej. no bajar de plan con deuda pendiente).
    """
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    cambios = payload.model_dump(exclude_unset=True)
    for campo, valor in cambios.items():
        setattr(negocio, campo, valor)

    db.commit()
    db.refresh(negocio)
    return negocio
