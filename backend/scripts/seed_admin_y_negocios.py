"""Seed de las cuentas reales necesarias para arrancar con auth activado.

Corre una sola vez (es idempotente: si algo ya existe no lo toca) para
dejar creadas las tres cuentas que van a necesitar login desde el día
uno: el admin (Lincoln) y el usuario de cada uno de los dos negocios
reales — la llantería del papá y el lubricentro de la vecina. Los
negocios que se den de alta después de este arranque inicial salen del
panel de admin (POST /negocios, admin-only), no de este script.

Uso:
    python scripts/seed_admin_y_negocios.py

Las contraseñas se generan al azar y se imprimen UNA sola vez al final,
por consola — no quedan en ningún lado en texto plano (ni acá, ni en la
DB, que solo guarda el hash). Copiarlas antes de cerrar la terminal; si
se pierden, la única forma de recuperarlas es dar de baja ese usuario y
crear uno nuevo, no hay "recuperar contraseña" todavía.

Si los defaults de nombre/username no sirven, se pisan por variable de
entorno antes de correr el script (ver los os.environ.get() de abajo).
"""

import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import base as _base  # noqa: E402, F401 — registra todos los modelos antes de mapear relationships (mismo motivo que en app/main.py)
from app.core.security import ROL_ADMIN, hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models.negocio import Negocio  # noqa: E402
from app.models.usuario import Usuario  # noqa: E402


def generar_password() -> str:
    return secrets.token_urlsafe(9)


def crear_usuario_si_no_existe(db, *, username: str, nombre: str, rol: str, negocio_id: int | None):
    """Devuelve la password generada, o None si el username ya existía
    (en ese caso no se toca nada — la cuenta existente sigue con su clave
    de siempre, este script nunca resetea contraseñas por las suyas)."""
    existente = db.query(Usuario).filter(Usuario.username == username).first()
    if existente is not None:
        print(f"  ya existe usuario '{username}' (id={existente.id}) — no se toca")
        return None

    password = generar_password()
    usuario = Usuario(
        negocio_id=negocio_id,
        nombre=nombre,
        rol=rol,
        username=username,
        password_hash=hash_password(password),
    )
    db.add(usuario)
    db.flush()
    return password


def crear_negocio_si_no_existe(db, *, nombre: str, rubro: str, plan_estado: str, modulos_activos: dict, modulo_rus_activo: bool) -> Negocio:
    negocio = db.query(Negocio).filter(Negocio.nombre == nombre).first()
    if negocio is not None:
        print(f"  ya existe negocio '{nombre}' (id={negocio.id}) — no se toca")
        return negocio

    negocio = Negocio(
        nombre=nombre,
        rubro=rubro,
        plan_estado=plan_estado,
        modulos_activos=modulos_activos,
        modulo_rus_activo=modulo_rus_activo,
    )
    db.add(negocio)
    db.flush()
    return negocio


def main() -> None:
    db = SessionLocal()
    credenciales_generadas: list[tuple[str, str]] = []

    try:
        print("Admin:")
        admin_username = os.environ.get("ADMIN_USERNAME", "lincoln")
        password = crear_usuario_si_no_existe(
            db,
            username=admin_username,
            nombre=os.environ.get("ADMIN_NOMBRE", "Lincoln Vega Hidalgo"),
            rol=ROL_ADMIN,
            negocio_id=None,
        )
        if password:
            credenciales_generadas.append((admin_username, password))

        print("Llantería (papá):")
        llanteria = crear_negocio_si_no_existe(
            db,
            nombre=os.environ.get("LLANTERIA_NOMBRE", "Llantería"),
            rubro="llanteria",
            plan_estado="exento",  # gratis siempre, nunca se degrada — ver CLAUDE.md
            modulos_activos={},
            modulo_rus_activo=True,  # negocio A lleva declaración RUS mensual
        )
        llanteria_username = os.environ.get("LLANTERIA_USERNAME", "llanteria")
        password = crear_usuario_si_no_existe(
            db,
            username=llanteria_username,
            nombre=os.environ.get("LLANTERIA_NOMBRE_USUARIO", "Llantería"),
            rol="dueño",
            negocio_id=llanteria.id,
        )
        if password:
            credenciales_generadas.append((llanteria_username, password))

        print("Lubricentro (vecina):")
        lubricentro = crear_negocio_si_no_existe(
            db,
            nombre=os.environ.get("LUBRICENTRO_NOMBRE", "Lubricentro"),
            rubro="lubricentro",
            plan_estado="prueba",  # 1 mes de prueba gratis antes de la cuota mensual
            modulos_activos={"clientes_vehiculos": True},
            modulo_rus_activo=False,
        )
        lubricentro_username = os.environ.get("LUBRICENTRO_USERNAME", "lubricentro")
        password = crear_usuario_si_no_existe(
            db,
            username=lubricentro_username,
            nombre=os.environ.get("LUBRICENTRO_NOMBRE_USUARIO", "Lubricentro"),
            rol="dueño",
            negocio_id=lubricentro.id,
        )
        if password:
            credenciales_generadas.append((lubricentro_username, password))

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    if credenciales_generadas:
        print("\nCredenciales nuevas — copiarlas ahora, no se vuelven a mostrar:")
        for username, password in credenciales_generadas:
            print(f"  {username} / {password}")
    else:
        print("\nNada nuevo que crear: las tres cuentas ya existían.")


if __name__ == "__main__":
    main()
