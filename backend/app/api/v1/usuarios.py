from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import verificar_acceso_negocio
from app.core.security import hash_password
from app.db.session import get_db
from app.models.negocio import Negocio as NegocioModel
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.usuario import Usuario, UsuarioCreate, UsuarioUpdate

router = APIRouter(
    prefix="/negocios/{negocio_id}/usuarios",
    tags=["usuarios"],
    dependencies=[Depends(verificar_acceso_negocio)],
)


def _get_usuario_o_404(negocio_id: int, usuario_id: int, db: Session) -> UsuarioModel:
    usuario = db.get(UsuarioModel, usuario_id)
    if usuario is None or usuario.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario


@router.get("", response_model=list[Usuario])
def list_usuarios(negocio_id: int, activo: bool | None = None, db: Session = Depends(get_db)):
    """Lista los usuarios del negocio.

    Cada negocio arranca con un único usuario creado en el mismo paso que
    el negocio (ver `create_negocio` en `negocios.py`), pero este endpoint
    queda disponible para cuando haga falta sumar más — hoy sigue sin haber
    roles por empleado más allá de admin/negocio (ver "Fuera de alcance" en
    el CLAUDE.md raíz).
    """
    query = db.query(UsuarioModel).filter(UsuarioModel.negocio_id == negocio_id)
    if activo is not None:
        query = query.filter(UsuarioModel.activo == activo)
    return query.all()


@router.post("", response_model=Usuario, status_code=201)
def create_usuario(negocio_id: int, payload: UsuarioCreate, db: Session = Depends(get_db)):
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    datos = payload.model_dump(exclude={"password"})
    usuario = UsuarioModel(
        negocio_id=negocio_id,
        password_hash=hash_password(payload.password),
        **datos,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}", response_model=Usuario)
def update_usuario(
    negocio_id: int, usuario_id: int, payload: UsuarioUpdate, db: Session = Depends(get_db)
):
    """Edita un usuario del negocio: nombre/rol, resetear contraseña
    (mandando `password`) o desactivar el acceso (`activo=false`) sin
    borrarlo — pensado para el panel de admin, pero disponible también
    para que un negocio gestione sus propios accesos si algún día tiene
    más de un usuario.
    """
    usuario = _get_usuario_o_404(negocio_id, usuario_id, db)

    cambios = payload.model_dump(exclude_unset=True, exclude={"password"})
    for campo, valor in cambios.items():
        setattr(usuario, campo, valor)

    if payload.password is not None:
        usuario.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(usuario)
    return usuario
