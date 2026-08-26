import uuid
from datetime import datetime
from decimal import Decimal

from app.models.cola_sync import ColaSync as ColaSyncModel
from app.models.movimiento import Movimiento as MovimientoModel
from app.models.producto import Producto as ProductoModel


# ============================================================================
# 1. SINCRONIZACIÓN EXITOSA Y DESCUENTO DE STOCK
# ============================================================================


def test_sync_movimiento_capital_exitoso_y_descuenta_stock(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Filtro de Aire Premium",
        clasificacion="capital",
        precio_lista=80.0,
        precio_compra=45.0,
        stock_actual=10,
        stock_minimo=2,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
                "precio_lista": 80.0,
                "precio_final": 75.0,
                "metodo_pago": "efectivo",
                "descripcion": "Venta offline de filtro",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == sync_uuid
    assert data[0]["estado"] == "aplicado"
    assert data[0]["detalle"] is None

    # Verificar descuento de stock
    db_session.refresh(prod)
    assert prod.stock_actual == 9

    # Verificar registro en tabla movimientos
    mov = (
        db_session.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id, MovimientoModel.producto_id == prod.id)
        .first()
    )
    assert mov is not None
    assert Decimal(str(mov.precio_lista)) == Decimal("80.00")
    assert Decimal(str(mov.precio_final)) == Decimal("75.00")
    assert Decimal(str(mov.monto_capital)) == Decimal("45.00")
    assert mov.metodo_pago == "efectivo"
    assert mov.descripcion == "Venta offline de filtro"

    # Verificar registro en tabla cola_sync
    cola_reg = (
        db_session.query(ColaSyncModel)
        .filter(ColaSyncModel.negocio_id == negocio_id, ColaSyncModel.cliente_id == sync_uuid)
        .first()
    )
    assert cola_reg is not None
    assert cola_reg.entidad == "movimiento"
    assert cola_reg.estado == "aplicado"
    assert cola_reg.payload["producto_id"] == prod.id


def test_sync_movimiento_con_fecha_offline_y_monto_capital_explicito(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Pastillas de Freno",
        clasificacion="capital",
        precio_lista=120.0,
        precio_compra=70.0,
        stock_actual=5,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = str(uuid.uuid4())
    fecha_offline = "2026-08-20T15:45:00"
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
                "precio_lista": 120.0,
                "precio_final": 110.0,
                "monto_capital": 65.0,  # Capital personalizado
                "metodo_pago": "digital",
                "fecha": fecha_offline,
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["estado"] == "aplicado"

    # Verificar que el movimiento guardó la fecha y capital explícitos
    mov = (
        db_session.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id, MovimientoModel.producto_id == prod.id)
        .first()
    )
    assert mov is not None
    assert Decimal(str(mov.monto_capital)) == Decimal("65.00")
    assert mov.fecha == datetime.fromisoformat(fecha_offline)


def test_sync_movimiento_servicio_no_descuenta_stock(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    servicio = ProductoModel(
        negocio_id=negocio_id,
        nombre="Cambio de Aceite Mano de Obra",
        clasificacion="servicio",
        precio_lista=40.0,
        precio_compra=0.0,
        stock_actual=0,
        stock_minimo=0,
    )
    db_session.add(servicio)
    db_session.commit()
    db_session.refresh(servicio)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": servicio.id,
                "tipo": "servicio",
                "precio_final": 40.0,
                "metodo_pago": "efectivo",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()[0]["estado"] == "aplicado"

    db_session.refresh(servicio)
    assert servicio.stock_actual == 0

    mov = (
        db_session.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id, MovimientoModel.producto_id == servicio.id)
        .first()
    )
    assert mov is not None
    assert Decimal(str(mov.monto_capital)) == Decimal("0.00")


def test_sync_movimiento_bajo_minimo_se_aplica_automaticamente(client, seed_data, db_session):
    """En sync offline, la venta ya ocurrió, por lo que confirmar_bajo_minimo=True aplica directo."""
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Aceite Sintético 5W30",
        clasificacion="capital",
        precio_lista=150.0,
        precio_compra=90.0,
        stock_actual=3,
        stock_minimo=5,  # Ya está o quedará bajo mínimo
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
                "metodo_pago": "efectivo",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()[0]["estado"] == "aplicado"

    db_session.refresh(prod)
    assert prod.stock_actual == 2


def test_sync_lote_multiple_movimientos_exitosos(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    p1 = ProductoModel(
        negocio_id=negocio_id,
        nombre="Bujía Iridium",
        clasificacion="capital",
        precio_lista=30.0,
        precio_compra=15.0,
        stock_actual=20,
        stock_minimo=5,
    )
    p2 = ProductoModel(
        negocio_id=negocio_id,
        nombre="Refrigerante 1L",
        clasificacion="capital",
        precio_lista=25.0,
        precio_compra=12.0,
        stock_actual=8,
        stock_minimo=2,
    )
    db_session.add_all([p1, p2])
    db_session.commit()
    db_session.refresh(p1)
    db_session.refresh(p2)

    uuid1, uuid2 = str(uuid.uuid4()), str(uuid.uuid4())
    sync_payload = [
        {
            "id": uuid1,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": p1.id,
                "tipo": "venta",
                "metodo_pago": "efectivo",
            },
        },
        {
            "id": uuid2,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": p2.id,
                "tipo": "venta",
                "metodo_pago": "digital",
            },
        },
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["estado"] == "aplicado"
    assert data[1]["estado"] == "aplicado"

    db_session.refresh(p1)
    db_session.refresh(p2)
    assert p1.stock_actual == 19
    assert p2.stock_actual == 7


# ============================================================================
# 2. IDEMPOTENCIA ESTRICTA POR CLIENTE_ID
# ============================================================================


def test_sync_idempotencia_reintento_no_duplica_ni_descuenta_doble(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Amortiguador Delantero",
        clasificacion="capital",
        precio_lista=250.0,
        precio_compra=160.0,
        stock_actual=6,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = "client-uuid-idempotencia-test-1"
    item = {
        "id": sync_uuid,
        "entidad": "movimiento",
        "payload": {
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "metodo_pago": "efectivo",
        },
    }

    # 1. Primer envío
    resp1 = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=[item], headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1[0]["id"] == sync_uuid
    assert data1[0]["estado"] == "aplicado"

    db_session.refresh(prod)
    assert prod.stock_actual == 5
    conteo_movimientos_1 = (
        db_session.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id, MovimientoModel.producto_id == prod.id)
        .count()
    )
    assert conteo_movimientos_1 == 1

    # 2. Reintento con el mismo cliente_id
    resp2 = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=[item], headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2) == 1
    assert data2[0]["id"] == sync_uuid
    assert data2[0]["estado"] == "duplicado"
    assert "Ya se había procesado antes" in data2[0]["detalle"]

    # Verificar que el stock NO disminuyó nuevamente
    db_session.refresh(prod)
    assert prod.stock_actual == 5

    # Verificar que NO se insertó otro movimiento
    conteo_movimientos_2 = (
        db_session.query(MovimientoModel)
        .filter(MovimientoModel.negocio_id == negocio_id, MovimientoModel.producto_id == prod.id)
        .count()
    )
    assert conteo_movimientos_2 == 1

    # Verificar que solo hay un registro en cola_sync
    conteo_cola = (
        db_session.query(ColaSyncModel)
        .filter(ColaSyncModel.negocio_id == negocio_id, ColaSyncModel.cliente_id == sync_uuid)
        .count()
    )
    assert conteo_cola == 1


def test_sync_idempotencia_mismo_lote_con_items_duplicados(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Líquido de Frenos DOT4",
        clasificacion="capital",
        precio_lista=35.0,
        precio_compra=18.0,
        stock_actual=10,
        stock_minimo=2,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = "client-uuid-mismo-lote-dup"
    item = {
        "id": sync_uuid,
        "entidad": "movimiento",
        "payload": {
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "metodo_pago": "efectivo",
        },
    }

    # Enviar dos items con el mismo ID en un único batch
    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=[item, item], headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["estado"] == "aplicado"
    assert data[1]["estado"] == "duplicado"

    db_session.refresh(prod)
    assert prod.stock_actual == 9  # Solo se descontó 1 vez


def test_sync_idempotencia_reintento_de_item_con_error_previo(client, seed_data, db_session):
    """Si un item falló previamente y se reintenta con el mismo id, devuelve duplicado."""
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    sync_uuid = "client-uuid-fallido-1"
    item_invalido = {
        "id": sync_uuid,
        "entidad": "movimiento",
        "payload": {
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": 999999,  # Producto inexistente
            "tipo": "venta",
        },
    }

    resp1 = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=[item_invalido], headers=headers)
    assert resp1.status_code == 200
    assert resp1.json()[0]["estado"] == "error"

    # Reintento con el mismo ID
    resp2 = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=[item_invalido], headers=headers)
    assert resp2.status_code == 200
    assert resp2.json()[0]["estado"] == "duplicado"
    assert "resultado original: error" in resp2.json()[0]["detalle"]


# ============================================================================
# 3. RECHAZO DE ENTIDADES NO SOPORTADAS Y ERRORES SIN ROMPER EL LOTE
# ============================================================================


def test_sync_rechazo_entidad_no_soportada_sin_romper_lote(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Foco H4 Halógeno",
        clasificacion="capital",
        precio_lista=20.0,
        precio_compra=8.0,
        stock_actual=15,
        stock_minimo=3,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    uuid_valido_1 = str(uuid.uuid4())
    uuid_no_soportado = str(uuid.uuid4())
    uuid_invalido = str(uuid.uuid4())
    uuid_valido_2 = str(uuid.uuid4())

    lote = [
        # 1. Movimiento válido
        {
            "id": uuid_valido_1,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
                "metodo_pago": "efectivo",
            },
        },
        # 2. Entidad no soportada
        {
            "id": uuid_no_soportado,
            "entidad": "inventario_conteo",
            "payload": {"zona": "deposito_1", "cantidad": 50},
        },
        # 3. Movimiento inválido (producto inexistente)
        {
            "id": uuid_invalido,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": 999999,
                "tipo": "venta",
            },
        },
        # 4. Segundo movimiento válido
        {
            "id": uuid_valido_2,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
                "metodo_pago": "digital",
            },
        },
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=lote, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4

    # Validar resultados individuales
    assert data[0]["id"] == uuid_valido_1
    assert data[0]["estado"] == "aplicado"
    assert data[0]["detalle"] is None

    assert data[1]["id"] == uuid_no_soportado
    assert data[1]["estado"] == "error"
    assert "todavía no tiene sincronización soportada" in data[1]["detalle"]

    assert data[2]["id"] == uuid_invalido
    assert data[2]["estado"] == "error"
    assert "Producto no encontrado" in data[2]["detalle"]

    assert data[3]["id"] == uuid_valido_2
    assert data[3]["estado"] == "aplicado"
    assert data[3]["detalle"] is None

    # Validar que los dos válidos descontaron stock (15 - 2 = 13)
    db_session.refresh(prod)
    assert prod.stock_actual == 13

    # Validar que todos los items quedaron registrados en cola_sync
    cola_items = (
        db_session.query(ColaSyncModel)
        .filter(ColaSyncModel.negocio_id == negocio_id)
        .all()
    )
    estados_cola = {c.cliente_id: c.estado for c in cola_items}
    assert estados_cola[uuid_valido_1] == "aplicado"
    assert estados_cola[uuid_no_soportado] == "error"
    assert estados_cola[uuid_invalido] == "error"
    assert estados_cola[uuid_valido_2] == "aplicado"


def test_sync_error_stock_agotado_registra_error(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod_sin_stock = ProductoModel(
        negocio_id=negocio_id,
        nombre="Filtro Agotado",
        clasificacion="capital",
        precio_lista=50.0,
        precio_compra=30.0,
        stock_actual=0,
        stock_minimo=1,
    )
    db_session.add(prod_sin_stock)
    db_session.commit()
    db_session.refresh(prod_sin_stock)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod_sin_stock.id,
                "tipo": "venta",
                "metodo_pago": "efectivo",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["estado"] == "error"
    assert "No hay stock disponible" in data[0]["detalle"]

    db_session.refresh(prod_sin_stock)
    assert prod_sin_stock.stock_actual == 0


def test_sync_payload_con_error_de_validacion_pydantic(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    sync_uuid = str(uuid.uuid4())
    # Falta 'tipo' y 'usuario_id' requeridos en MovimientoCreate
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "descripcion": "Payload incompleto sin campos obligatorios",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["estado"] == "error"
    assert "validation error" in data[0]["detalle"].lower() or "missing" in data[0]["detalle"].lower()


# ============================================================================
# 4. AISLAMIENTO MULTI-TENANT EN SYNC
# ============================================================================


def test_sync_cross_tenant_forbidden(client, seed_data):
    """Dueño 1 no puede invocar sync sobre el Negocio 2."""
    negocio2_id = seed_data["negocio2"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    sync_payload = [
        {
            "id": str(uuid.uuid4()),
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno2"].id,
                "producto_id": 1,
                "tipo": "venta",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio2_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "No autorizado para este negocio"


def test_sync_sin_autenticacion(client, seed_data):
    negocio1_id = seed_data["negocio1"].id
    response = client.post(f"/api/v1/negocios/{negocio1_id}/sync", json=[])
    assert response.status_code == 401
    assert response.json()["detail"] == "Falta el header Authorization"


def test_sync_admin_puede_sincronizar_cualquier_negocio(client, seed_data, db_session):
    negocio1_id = seed_data["negocio1"].id
    headers_admin = {"Authorization": f"Bearer {seed_data['token_admin']}"}

    prod = ProductoModel(
        negocio_id=negocio1_id,
        nombre="Aceite Caja Admin",
        clasificacion="capital",
        precio_lista=70.0,
        precio_compra=40.0,
        stock_actual=5,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod.id,
                "tipo": "venta",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio1_id}/sync", json=sync_payload, headers=headers_admin)
    assert response.status_code == 200
    assert response.json()[0]["estado"] == "aplicado"

    db_session.refresh(prod)
    assert prod.stock_actual == 4


def test_sync_payload_con_recursos_de_otro_negocio_es_rechazado_individualmente(client, seed_data, db_session):
    """Dueño 1 autenticado en su propio negocio_id, pero manda producto_id del Negocio 2."""
    negocio1_id = seed_data["negocio1"].id
    negocio2_id = seed_data["negocio2"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod_negocio2 = ProductoModel(
        negocio_id=negocio2_id,
        nombre="Producto Exclusivo Negocio 2",
        clasificacion="capital",
        precio_lista=100.0,
        precio_compra=60.0,
        stock_actual=10,
        stock_minimo=1,
    )
    db_session.add(prod_negocio2)
    db_session.commit()
    db_session.refresh(prod_negocio2)

    sync_uuid = str(uuid.uuid4())
    sync_payload = [
        {
            "id": sync_uuid,
            "entidad": "movimiento",
            "payload": {
                "usuario_id": seed_data["dueno1"].id,
                "producto_id": prod_negocio2.id,  # Producto de Negocio 2
                "tipo": "venta",
            },
        }
    ]

    response = client.post(f"/api/v1/negocios/{negocio1_id}/sync", json=sync_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data[0]["estado"] == "error"
    assert "Producto no encontrado" in data[0]["detalle"]

    # Stock del producto del negocio 2 no debe haber sido tocado
    db_session.refresh(prod_negocio2)
    assert prod_negocio2.stock_actual == 10


def test_sync_cliente_id_mismo_uuid_en_distintos_negocios_no_colisiona(client, seed_data, db_session):
    """Dos negocios diferentes pueden recibir el mismo cliente_id sin considerarse duplicados entre sí."""
    negocio1_id = seed_data["negocio1"].id
    negocio2_id = seed_data["negocio2"].id
    headers1 = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    headers2 = {"Authorization": f"Bearer {seed_data['token_dueno2']}"}

    p1 = ProductoModel(
        negocio_id=negocio1_id,
        nombre="Item Negocio 1",
        clasificacion="capital",
        precio_lista=50.0,
        precio_compra=25.0,
        stock_actual=5,
        stock_minimo=1,
    )
    p2 = ProductoModel(
        negocio_id=negocio2_id,
        nombre="Item Negocio 2",
        clasificacion="capital",
        precio_lista=60.0,
        precio_compra=30.0,
        stock_actual=5,
        stock_minimo=1,
    )
    db_session.add_all([p1, p2])
    db_session.commit()
    db_session.refresh(p1)
    db_session.refresh(p2)

    mismo_uuid = "client-uuid-compartido-12345"

    item1 = {
        "id": mismo_uuid,
        "entidad": "movimiento",
        "payload": {
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": p1.id,
            "tipo": "venta",
        },
    }
    item2 = {
        "id": mismo_uuid,
        "entidad": "movimiento",
        "payload": {
            "usuario_id": seed_data["dueno2"].id,
            "producto_id": p2.id,
            "tipo": "venta",
        },
    }

    # Sincronizar en negocio 1
    resp1 = client.post(f"/api/v1/negocios/{negocio1_id}/sync", json=[item1], headers=headers1)
    assert resp1.status_code == 200
    assert resp1.json()[0]["estado"] == "aplicado"

    # Sincronizar en negocio 2 con el mismo uuid
    resp2 = client.post(f"/api/v1/negocios/{negocio2_id}/sync", json=[item2], headers=headers2)
    assert resp2.status_code == 200
    assert resp2.json()[0]["estado"] == "aplicado"  # No es duplicado porque es otro negocio

    db_session.refresh(p1)
    db_session.refresh(p2)
    assert p1.stock_actual == 4
    assert p2.stock_actual == 4
