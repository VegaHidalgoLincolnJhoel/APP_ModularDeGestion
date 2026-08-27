from datetime import date
from decimal import Decimal

from app.models.producto import Producto as ProductoModel


def test_crear_movimiento_con_monto_capital_explicito(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Llanta Especial",
        clasificacion="capital",
        precio_lista=200.0,
        precio_compra=120.0,
        stock_actual=5,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    payload = {
        "usuario_id": seed_data["dueno1"].id,
        "producto_id": prod.id,
        "tipo": "venta",
        "precio_lista": 200.0,
        "precio_final": 180.0,
        "monto_capital": 110.0,  # Capital personalizado provisto explícitamente
        "metodo_pago": "efectivo",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/movimientos", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert Decimal(str(data["monto_capital"])) == Decimal("110.00")
    assert Decimal(str(data["precio_final"])) == Decimal("180.00")


def test_crear_movimiento_capital_automatico_desde_precio_compra(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Filtro de Aceite",
        clasificacion="capital",
        precio_lista=50.0,
        precio_compra=28.5,
        stock_actual=10,
        stock_minimo=2,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    payload = {
        "usuario_id": seed_data["dueno1"].id,
        "producto_id": prod.id,
        "tipo": "venta",
        "metodo_pago": "digital",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/movimientos", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert Decimal(str(data["monto_capital"])) == Decimal("28.50")
    assert Decimal(str(data["precio_lista"])) == Decimal("50.00")
    assert Decimal(str(data["precio_final"])) == Decimal("50.00")


def test_crear_movimiento_no_capital_default_cero(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    servicio = ProductoModel(
        negocio_id=negocio_id,
        nombre="Parchado de Llanta",
        clasificacion="servicio",
        precio_lista=25.0,
        precio_compra=0.0,
        stock_actual=0,
        stock_minimo=0,
    )
    db_session.add(servicio)
    db_session.commit()
    db_session.refresh(servicio)

    payload = {
        "usuario_id": seed_data["dueno1"].id,
        "producto_id": servicio.id,
        "tipo": "servicio",
        "precio_final": 25.0,
        "metodo_pago": "efectivo",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/movimientos", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert Decimal(str(data["monto_capital"])) == Decimal("0.00")


def test_cierre_caja_calculo_capital_y_ganancia(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    # 1. Producto capital: compra 100, lista 150
    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Batería 12V",
        clasificacion="capital",
        precio_lista=150.0,
        precio_compra=100.0,
        stock_actual=10,
        stock_minimo=1,
    )
    # 2. Servicio: lista 50, compra 0
    servicio = ProductoModel(
        negocio_id=negocio_id,
        nombre="Alineación y Balanceo",
        clasificacion="servicio",
        precio_lista=50.0,
        precio_compra=0.0,
        stock_actual=0,
        stock_minimo=0,
    )
    db_session.add_all([prod, servicio])
    db_session.commit()
    db_session.refresh(prod)
    db_session.refresh(servicio)

    # Movimiento 1: Venta de producto a precio regular (150) en efectivo -> capital=100, ganancia=50
    client.post(
        f"/api/v1/negocios/{negocio_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "metodo_pago": "efectivo",
        },
        headers=headers,
    )

    # Movimiento 2: Venta de producto con descuento (130) digital -> capital=100, ganancia=30
    client.post(
        f"/api/v1/negocios/{negocio_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "precio_final": 130.0,
            "metodo_pago": "digital",
        },
        headers=headers,
    )

    # Movimiento 3: Servicio (50) en efectivo -> capital=0, ganancia=50
    client.post(
        f"/api/v1/negocios/{negocio_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": servicio.id,
            "tipo": "servicio",
            "precio_final": 50.0,
            "metodo_pago": "efectivo",
        },
        headers=headers,
    )

    hoy = date.today().isoformat()
    cierre_payload = {
        "periodo": "diario",
        "fecha_inicio": hoy,
        "fecha_fin": hoy,
    }
    cierre_resp = client.post(
        f"/api/v1/negocios/{negocio_id}/cierres-caja",
        json=cierre_payload,
        headers=headers,
    )
    assert cierre_resp.status_code == 201
    cierre = cierre_resp.json()

    # Totales esperados:
    # total_bruto = 150 + 130 + 50 = 330
    # total_capital = 100 + 100 + 0 = 200
    # total_ganancia = (150 - 100) + (130 - 100) + (50 - 0) = 50 + 30 + 50 = 130
    # total_efectivo = 150 + 50 = 200
    # total_digital = 130
    assert Decimal(str(cierre["total_bruto"])) == Decimal("330.00")
    assert Decimal(str(cierre["total_capital"])) == Decimal("200.00")
    assert Decimal(str(cierre["total_ganancia"])) == Decimal("130.00")
    assert Decimal(str(cierre["total_efectivo"])) == Decimal("200.00")
    assert Decimal(str(cierre["total_digital"])) == Decimal("130.00")


def test_movimientos_y_cierres_cross_tenant_forbidden(client, seed_data):
    negocio2_id = seed_data["negocio2"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    # Dueño 1 no puede listar ni crear movimientos en Negocio 2
    resp_mov = client.get(f"/api/v1/negocios/{negocio2_id}/movimientos", headers=headers)
    assert resp_mov.status_code == 403

    # Dueño 1 no puede listar ni crear cierres en Negocio 2
    hoy = date.today().isoformat()
    resp_cierre = client.post(
        f"/api/v1/negocios/{negocio2_id}/cierres-caja",
        json={"periodo": "diario", "fecha_inicio": hoy, "fecha_fin": hoy},
        headers=headers,
    )
    assert resp_cierre.status_code == 403


def test_anular_movimiento_producto_capital_restaura_stock(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    prod = ProductoModel(
        negocio_id=negocio_id,
        nombre="Llanta 185/65R15",
        clasificacion="capital",
        precio_lista=250.0,
        precio_compra=150.0,
        stock_actual=5,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    # 1. Registrar venta -> stock debe descontarse de 5 a 4
    resp_venta = client.post(
        f"/api/v1/negocios/{negocio_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "metodo_pago": "efectivo",
        },
        headers=headers,
    )
    assert resp_venta.status_code == 201
    mov_id = resp_venta.json()["id"]

    db_session.refresh(prod)
    assert prod.stock_actual == 4

    # 2. Anular venta -> stock debe restaurarse a 5
    resp_delete = client.delete(
        f"/api/v1/negocios/{negocio_id}/movimientos/{mov_id}",
        headers=headers,
    )
    assert resp_delete.status_code == 200
    assert resp_delete.json() == {
        "ok": True,
        "mensaje": "Movimiento anulado y stock restaurado exitosamente.",
    }

    db_session.refresh(prod)
    assert prod.stock_actual == 5

    # 3. Validar que el movimiento ya no existe
    resp_list = client.get(f"/api/v1/negocios/{negocio_id}/movimientos", headers=headers)
    ids_en_lista = [m["id"] for m in resp_list.json()]
    assert mov_id not in ids_en_lista


def test_anular_movimiento_servicio_sin_alterar_stock(client, seed_data, db_session):
    negocio_id = seed_data["negocio1"].id
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}

    servicio = ProductoModel(
        negocio_id=negocio_id,
        nombre="Lavado de Auto",
        clasificacion="servicio",
        precio_lista=30.0,
        precio_compra=0.0,
        stock_actual=0,
        stock_minimo=0,
    )
    db_session.add(servicio)
    db_session.commit()
    db_session.refresh(servicio)

    resp_venta = client.post(
        f"/api/v1/negocios/{negocio_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": servicio.id,
            "tipo": "servicio",
            "metodo_pago": "digital",
        },
        headers=headers,
    )
    assert resp_venta.status_code == 201
    mov_id = resp_venta.json()["id"]

    db_session.refresh(servicio)
    assert servicio.stock_actual == 0

    # Anular servicio -> stock sigue en 0
    resp_delete = client.delete(
        f"/api/v1/negocios/{negocio_id}/movimientos/{mov_id}",
        headers=headers,
    )
    assert resp_delete.status_code == 200
    assert resp_delete.json() == {
        "ok": True,
        "mensaje": "Movimiento anulado y stock restaurado exitosamente.",
    }

    db_session.refresh(servicio)
    assert servicio.stock_actual == 0


def test_anular_movimiento_no_encontrado_y_cross_tenant(client, seed_data, db_session):
    negocio1_id = seed_data["negocio1"].id
    negocio2_id = seed_data["negocio2"].id
    headers_dueno1 = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    headers_dueno2 = {"Authorization": f"Bearer {seed_data['token_dueno2']}"}

    prod = ProductoModel(
        negocio_id=negocio1_id,
        nombre="Aceite 20W50",
        clasificacion="capital",
        precio_lista=40.0,
        precio_compra=25.0,
        stock_actual=3,
        stock_minimo=1,
    )
    db_session.add(prod)
    db_session.commit()
    db_session.refresh(prod)

    resp_venta = client.post(
        f"/api/v1/negocios/{negocio1_id}/movimientos",
        json={
            "usuario_id": seed_data["dueno1"].id,
            "producto_id": prod.id,
            "tipo": "venta",
            "metodo_pago": "efectivo",
        },
        headers=headers_dueno1,
    )
    mov_id = resp_venta.json()["id"]

    # 1. 404 al intentar anular ID inexistente en negocio 1
    resp_404 = client.delete(
        f"/api/v1/negocios/{negocio1_id}/movimientos/999999",
        headers=headers_dueno1,
    )
    assert resp_404.status_code == 404

    # 2. 403 si dueño 1 intenta anular en la URL de negocio 2
    resp_cross_url = client.delete(
        f"/api/v1/negocios/{negocio2_id}/movimientos/{mov_id}",
        headers=headers_dueno1,
    )
    assert resp_cross_url.status_code == 403

    # 3. 404 si dueño 2 intenta anular el movimiento de negocio 1 dentro de su negocio 2
    resp_cross_mov = client.delete(
        f"/api/v1/negocios/{negocio2_id}/movimientos/{mov_id}",
        headers=headers_dueno2,
    )
    assert resp_cross_mov.status_code == 404
