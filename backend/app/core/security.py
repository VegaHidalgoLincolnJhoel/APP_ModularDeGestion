"""Hashing de contraseñas y firma/verificación de JWT de sesión.

No hay refresh token todavía: el access token dura jwt_expira_minutos
(7 días por defecto) y al vencer el usuario se re-loguea. Es la opción
simple para la escala actual (dos negocios, un puñado de usuarios de
confianza) — si esto crece a más clientes o el requisito de seguridad
sube, lo primero que habría que sumar es un refresh token de vida más
corta para el access token.
"""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ROL_ADMIN = "admin"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def crear_access_token(usuario_id: int, rol: str, negocio_id: int | None) -> str:
    """Firma un JWT con lo mínimo que necesita cada request para autorizar:
    quién es (sub), qué puede hacer (rol) y sobre qué negocio (negocio_id,
    None para admin porque no está atado a uno solo)."""
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario_id),
        "rol": rol,
        "negocio_id": negocio_id,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=settings.jwt_expira_minutos),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decodificar_access_token(token: str) -> dict:
    """Lanza jwt.PyJWTError (o una subclase) si el token es inválido,
    está mal firmado o venció — el caller decide cómo traducir eso a HTTP."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
