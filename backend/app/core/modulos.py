"""Validación de módulos opcionales por negocio.

Cada negocio activa módulos como clientes/vehículos o registro de compras de
forma independiente (ver `Negocio.modulos_activos` y `ARCHITECTURE.md`,
sección 2). Cualquier endpoint que toque datos de un módulo opcional debe
pasar por `verificar_modulo_activo` antes de leer o escribir esa tabla, para
no filtrar información de un módulo que el negocio no tiene contratado.
"""

from fastapi import HTTPException

from app.models.negocio import Negocio

# Claves usadas dentro del JSON `modulos_activos`. Centralizadas acá para que
# no se repitan strings sueltos por los routers.
MODULO_CLIENTES_VEHICULOS = "clientes_vehiculos"


def verificar_modulo_activo(negocio: Negocio, clave: str) -> None:
    """Lanza 403 si `negocio` no tiene el módulo `clave` habilitado."""
    if not negocio.modulos_activos.get(clave):
        raise HTTPException(
            status_code=403,
            detail=f"El módulo '{clave}' no está activo para este negocio.",
        )


def verificar_modulo_rus_activo(negocio: Negocio) -> None:
    """Lanza 403 si el negocio no tiene activo el régimen RUS.

    A diferencia de los demás módulos opcionales, RUS no vive dentro del
    JSON `modulos_activos` sino en su propia columna (`modulo_rus_activo`),
    porque además de gatear el registro de compras controla la pestaña de
    declaración mensual SUNAT.
    """
    if not negocio.modulo_rus_activo:
        raise HTTPException(
            status_code=403,
            detail="El módulo RUS no está activo para este negocio.",
        )
