"""Dependencies de FastAPI para autenticación y autorización por negocio.

Todo endpoint que no sea /health o /auth/login pasa por get_usuario_actual
(exige un JWT válido) y, si además cuelga de un negocio_id en la URL, por
verificar_acceso_negocio (exige que ese negocio_id sea el del token, salvo
que el usuario sea admin). El negocio_id nunca se toma como verdad solo
porque viene en el path — eso es lo que hacía que el aislamiento entre
negocios fuera, hasta ahora, una convención y no una garantía real.

get_usuario_actual también valida contra la DB que el usuario siga activo,
no solo el JWT — es lo que hace que desactivar un acceso (PATCH
.../usuarios/{id} con activo=false) corte el acceso al toque, en vez de
esperar a que un token de hasta 7 días expire solo. Cuesta una consulta
extra por request, aceptable a esta escala (un puñado de usuarios).
"""

from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ROL_ADMIN, decodificar_access_token
from app.db.session import get_db
from app.models.usuario import Usuario as UsuarioModel

# auto_error=False porque con el default (True), HTTPBearer devuelve 403
# cuando falta el header — semánticamente está mal para "no autenticado"
# (403 es "autenticado pero sin permiso", 401 es "no sé quién sos"). Con
# esto en False, el caso "sin header" se maneja a mano más abajo.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class UsuarioAutenticado:
    usuario_id: int
    rol: str
    negocio_id: int | None

    @property
    def es_admin(self) -> bool:
        return self.rol == ROL_ADMIN


def get_usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> UsuarioAutenticado:
    if credenciales is None:
        raise HTTPException(status_code=401, detail="Falta el header Authorization")

    try:
        payload = decodificar_access_token(credenciales.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc

    # No alcanza con confiar en lo que dice el payload del token: si el
    # usuario fue desactivado (PATCH .../usuarios/{id} con activo=false)
    # después de emitido, un token de hasta 7 días seguiría siendo válido
    # y dejaría "desactivar acceso" sin efecto real hasta que expire solo.
    # Esta consulta es la forma de que la baja sea inmediata.
    usuario_id = int(payload["sub"])
    usuario_db = db.get(UsuarioModel, usuario_id)
    if usuario_db is None or not usuario_db.activo:
        raise HTTPException(status_code=401, detail="Usuario deshabilitado")

    return UsuarioAutenticado(
        usuario_id=usuario_id,
        rol=payload["rol"],
        negocio_id=payload.get("negocio_id"),
    )


def verificar_acceso_negocio(
    negocio_id: int,
    usuario: UsuarioAutenticado = Depends(get_usuario_actual),
) -> UsuarioAutenticado:
    """Para rutas /negocios/{negocio_id}/...: el negocio_id de la URL debe
    coincidir con el del token, salvo que el usuario sea admin (puede
    operar sobre cualquier negocio)."""
    if not usuario.es_admin and usuario.negocio_id != negocio_id:
        raise HTTPException(status_code=403, detail="No autorizado para este negocio")
    return usuario


def verificar_admin(usuario: UsuarioAutenticado = Depends(get_usuario_actual)) -> UsuarioAutenticado:
    """Para rutas que no cuelgan de un negocio puntual (alta de negocios
    nuevos, listado global): exige rol admin."""
    if not usuario.es_admin:
        raise HTTPException(status_code=403, detail="Requiere rol admin")
    return usuario
