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
