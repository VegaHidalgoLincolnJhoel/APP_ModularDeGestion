from fastapi import APIRouter

from app.api.v1 import health, negocios, productos

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(negocios.router)
api_router.include_router(productos.router)

# Pendientes de implementar siguiendo el mismo patrón (modelo + schema +
# router ya definidos o por definir en docs/openapi.yaml):
#   movimientos, cierres-caja, clientes-vehiculos (validar modulos_activos),
#   registro-compras (validar modulo_rus_activo), sync (idempotente).
