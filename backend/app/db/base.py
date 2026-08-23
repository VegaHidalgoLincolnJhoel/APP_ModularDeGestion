"""Punto único de import de todos los modelos.

Se usa desde Alembic (`alembic/env.py`) para que `Base.metadata` los conozca
al autogenerar migraciones. Los modelos importan `Base` desde
`app.db.base_class`, no desde este módulo, para evitar import circular.
"""

from app.db.base_class import Base  # noqa: F401

from app.models.negocio import Negocio  # noqa: E402, F401
from app.models.usuario import Usuario  # noqa: E402, F401
from app.models.producto import Producto  # noqa: E402, F401
from app.models.movimiento import Movimiento  # noqa: E402, F401
from app.models.cierre_caja import CierreCaja  # noqa: E402, F401
from app.models.cliente_vehiculo import ClienteVehiculo  # noqa: E402, F401
from app.models.notificacion_wsp import NotificacionWsp  # noqa: E402, F401
from app.models.alerta_descartada import AlertaDescartada  # noqa: E402, F401
from app.models.registro_compra import RegistroCompra  # noqa: E402, F401
from app.models.cola_sync import ColaSync  # noqa: E402, F401
