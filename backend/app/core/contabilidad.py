"""Regla de clasificación contable compartida entre movimientos y cierres.

Según el CLAUDE.md raíz del proyecto: los productos físicos (llantas,
filtros, accesorios) se clasifican como capital, los servicios (parchado,
cambio de aceite, lavado de motor) como ganancia directa. Esa distinción
decide tanto si una venta descuenta stock (`api/v1/movimientos.py`) como en
qué columna cae el monto al cerrar caja (`api/v1/cierres_caja.py`).
"""

CLASIFICACION_CAPITAL = "capital"


def es_capital(clasificacion: str | None) -> bool:
    """True si el ítem de catálogo es inventario físico (capital)."""
    return clasificacion == CLASIFICACION_CAPITAL
