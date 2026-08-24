from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import crear_access_token, verificar_password
from app.db.session import get_db
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Único endpoint público además de /health.

    El username es global (no se busca por negocio_id) porque en el
    momento del login todavía no sabemos a qué negocio pertenece el
    usuario — de hecho, el negocio_id de la respuesta es la forma en la
    que el frontend se entera. Un admin no tiene negocio_id.
    """
    usuario = db.query(UsuarioModel).filter(UsuarioModel.username == payload.username).first()

    # Mismo mensaje de error exista o no el username: no le regalamos a un
    # atacante la posibilidad de enumerar usuarios válidos por prueba y error.
    credenciales_invalidas = HTTPException(
        status_code=401, detail="Usuario o contraseña incorrectos"
    )
    if usuario is None or not verificar_password(payload.password, usuario.password_hash):
        raise credenciales_invalidas

    # A diferencia de "usuario o contraseña incorrectos", decir que la
    # cuenta está deshabilitada no ayuda a un atacante a adivinar nada (ya
    # sabe que el username existe y que la contraseña era correcta) — pero
    # sí evita que el dueño de un negocio se quede sin entender por qué de
    # golpe no puede entrar más.
    if not usuario.activo:
        raise HTTPException(status_code=401, detail="Usuario deshabilitado")

    token = crear_access_token(usuario.id, usuario.rol, usuario.negocio_id)
    return LoginResponse(
        access_token=token,
        rol=usuario.rol,
        negocio_id=usuario.negocio_id,
        nombre=usuario.nombre,
    )
