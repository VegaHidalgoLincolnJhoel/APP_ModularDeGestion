from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import UsuarioAutenticado, verificar_acceso_negocio, verificar_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.negocio import Negocio, NegocioCreate, NegocioUpdate

router = APIRouter(prefix="/negocios", tags=["negocios"])


@router.get("", response_model=list[Negocio], dependencies=[Depends(verificar_admin)])
def list_negocios(db: Session = Depends(get_db)):
    """Admin-only: un usuario de negocio no tiene motivo para ver la lista
    completa, y con negocio_id viniendo directo del login tampoco lo
    necesita para nada (antes se usaba para "adivinar" cuál era el suyo)."""
    return db.query(NegocioModel).all()


@router.post("", response_model=Negocio, status_code=201, dependencies=[Depends(verificar_admin)])
def create_negocio(payload: NegocioCreate, db: Session = Depends(get_db)):
    """Alta de negocio nuevo, admin-only — es el endpoint que va a consumir
    el panel de admin. Crea el negocio y su primer usuario en la misma
    transacción: un negocio sin ningún usuario con credenciales quedaría
    inaccesible para siempre, no tendría sentido dejarlo a medio crear.
    """
    if payload.usuario_inicial.rol == "admin":
        raise HTTPException(
            status_code=400, detail="El usuario del negocio no puede tener rol admin"
        )

    usuario_existente = (
        db.query(UsuarioModel)
        .filter(UsuarioModel.username == payload.usuario_inicial.username)
        .first()
    )
    if usuario_existente:
        raise HTTPException(
            status_code=400, detail="El nombre de usuario ya está registrado"
        )

    datos_negocio = payload.model_dump(exclude={"usuario_inicial"})
    negocio = NegocioModel(**datos_negocio)
    db.add(negocio)
    db.flush()  # asigna negocio.id sin cerrar la transacción todavía

    datos_usuario = payload.usuario_inicial.model_dump(exclude={"password"})
    usuario = UsuarioModel(
        negocio_id=negocio.id,
        password_hash=hash_password(payload.usuario_inicial.password),
        **datos_usuario,
    )
    db.add(usuario)

    db.commit()
    db.refresh(negocio)
    return negocio


@router.get("/{negocio_id}", response_model=Negocio)
def get_negocio(
    negocio_id: int,
    db: Session = Depends(get_db),
    _usuario: UsuarioAutenticado = Depends(verificar_acceso_negocio),
):
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio


@router.patch("/{negocio_id}", response_model=Negocio)
def update_negocio(
    negocio_id: int,
    payload: NegocioUpdate,
    db: Session = Depends(get_db),
    _usuario: UsuarioAutenticado = Depends(verificar_acceso_negocio),
):
    """Edita configuración del negocio (pensado sobre todo para link_sunat).

    No hace falta ser admin: el propio negocio puede editar su config
    (ej. la vecina cargando su link de pago SUNAT), verificar_acceso_negocio
    ya garantiza que solo toque su propio negocio_id.
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
