"""Dependencies de FastAPI para autenticación y autorización por negocio.

Todo endpoint que no sea /health o /auth/login pasa por get_usuario_actual
(exige un JWT válido) y, si además cuelga de un negocio_id en la URL, por
verificar_acceso_negocio (exige que ese negocio_id sea el del token, salvo
que el usuario sea admin). El negocio_id nunca se toma como verdad solo
porque viene en el path — eso es lo que hacía que el aislamiento entre
negocios fuera, hasta ahora, una convención y no una garantía real.
"""

from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import ROL_ADMIN, decodificar_access_token

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
) -> UsuarioAutenticado:
    if credenciales is None:
        raise HTTPException(status_code=401, detail="Falta el header Authorization")

    try:
        payload = decodificar_access_token(credenciales.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from exc

    return UsuarioAutenticado(
        usuario_id=int(payload["sub"]),
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
