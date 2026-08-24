from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import verificar_acceso_negocio
from app.core.contabilidad import es_capital
from app.core.modulos import MODULO_CLIENTES_VEHICULOS, verificar_modulo_activo
from app.db.session import get_db
from app.models.cliente_vehiculo import ClienteVehiculo as ClienteVehiculoModel
from app.models.movimiento import Movimiento as MovimientoModel
from app.models.negocio import Negocio as NegocioModel
from app.models.producto import Producto as ProductoModel
from app.models.usuario import Usuario as UsuarioModel
from app.schemas.movimiento import Movimiento, MovimientoCreate

router = APIRouter(
    prefix="/negocios/{negocio_id}/movimientos",
    tags=["movimientos"],
    dependencies=[Depends(verificar_acceso_negocio)],
)


def _get_negocio_o_404(negocio_id: int, db: Session) -> NegocioModel:
    negocio = db.get(NegocioModel, negocio_id)
    if negocio is None:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio


@router.get("", response_model=list[Movimiento])
def list_movimientos(negocio_id: int, db: Session = Depends(get_db)):
    _get_negocio_o_404(negocio_id, db)
    return (
        db.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id)
        .order_by(MovimientoModel.fecha.desc())
        .all()
    )


@router.post("", response_model=Movimiento, status_code=201)
def create_movimiento(
    negocio_id: int,
    payload: MovimientoCreate,
    confirmar_bajo_minimo: bool = False,
    db: Session = Depends(get_db),
):
    """Registra una venta o servicio y, si corresponde, descuenta stock.

    Cuando el producto vendido lleva inventario y la venta lo deja por
    debajo de su stock mínimo, no se aplica de una: se responde 409 con el
    detalle para que el frontend muestre el modal de confirmación pedido en
    el flujo de venta de llantas, y el cliente reintenta la misma petición
    con `confirmar_bajo_minimo=true`.
    """
    return _crear_movimiento(negocio_id, payload, confirmar_bajo_minimo, db)


def _crear_movimiento(
    negocio_id: int, payload: MovimientoCreate, confirmar_bajo_minimo: bool, db: Session
) -> MovimientoModel:
    """Lógica real de creación, separada del handler HTTP para que `sync`
    (`api/v1/sync.py`) pueda aplicar un movimiento encolado offline con las
    mismas reglas de negocio, sin duplicarlas."""
    negocio = _get_negocio_o_404(negocio_id, db)

    usuario = db.get(UsuarioModel, payload.usuario_id)
    if usuario is None or usuario.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    producto = db.get(ProductoModel, payload.producto_id)
    if producto is None or producto.negocio_id != negocio_id:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if payload.cliente_vehiculo_id is not None:
        verificar_modulo_activo(negocio, MODULO_CLIENTES_VEHICULOS)
        cliente_vehiculo = db.get(ClienteVehiculoModel, payload.cliente_vehiculo_id)
        if cliente_vehiculo is None or cliente_vehiculo.negocio_id != negocio_id:
            raise HTTPException(status_code=404, detail="Cliente/vehículo no encontrado")

    consume_stock = es_capital(producto.clasificacion)
    stock_resultante = producto.stock_actual
    if consume_stock:
        if producto.stock_actual <= 0:
            raise HTTPException(status_code=409, detail="No hay stock disponible para este producto")

        stock_resultante = producto.stock_actual - 1
        queda_bajo_minimo = stock_resultante < producto.stock_minimo
        if queda_bajo_minimo and not confirmar_bajo_minimo:
            raise HTTPException(
                status_code=409,
                detail={
                    "codigo": "stock_bajo_minimo",
                    "mensaje": (
                        f"Esta venta deja el stock en {stock_resultante}, por debajo "
                        f"del mínimo configurado ({producto.stock_minimo}). Reintenta "
                        "con confirmar_bajo_minimo=true para continuar."
                    ),
                    "stock_resultante": stock_resultante,
                    "stock_minimo": producto.stock_minimo,
                },
            )

    # El precio de lista es una foto del precio de catálogo al momento de la
    # venta (aunque el producto cambie de precio después, el historial no se
    # mueve). El precio final es lo realmente cobrado; si no lo mandan, se
    # asume que se cobró el de lista.
    precio_lista = payload.precio_lista if payload.precio_lista is not None else producto.precio_lista
    precio_final = payload.precio_final if payload.precio_final is not None else precio_lista

    datos_movimiento = {
        "negocio_id": negocio_id,
        "usuario_id": payload.usuario_id,
        "producto_id": payload.producto_id,
        "cliente_vehiculo_id": payload.cliente_vehiculo_id,
        "tipo": payload.tipo,
        "descripcion": payload.descripcion,
        "precio_lista": precio_lista,
        "precio_final": precio_final,
        "metodo_pago": payload.metodo_pago,
    }
    # fecha tiene default en el modelo (hora de registro); solo se fuerza
    # cuando llega explícita, típicamente al reconstruir algo hecho offline.
    if payload.fecha is not None:
        datos_movimiento["fecha"] = payload.fecha

    movimiento = MovimientoModel(**datos_movimiento)
    db.add(movimiento)

    if consume_stock:
        producto.stock_actual = stock_resultante

    db.commit()
    db.refresh(movimiento)
    return movimiento
