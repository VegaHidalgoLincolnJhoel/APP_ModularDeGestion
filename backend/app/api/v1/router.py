from fastapi import APIRouter

from app.api.v1 import (
    auth,
    cierres_caja,
    clientes_vehiculos,
    health,
    movimientos,
    negocios,
    productos,
    registro_compras,
    sync,
    usuarios,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(negocios.router)
api_router.include_router(usuarios.router)
api_router.include_router(productos.router)
api_router.include_router(movimientos.router)
api_router.include_router(cierres_caja.router)
api_router.include_router(clientes_vehiculos.router)
api_router.include_router(registro_compras.router)
api_router.include_router(sync.router)
