from datetime import date, datetime
from decimal import Decimal

from app.models.movimiento import Movimiento as MovimientoModel
from app.models.producto import Producto as ProductoModel
from app.models.registro_compra import RegistroCompra as RegistroCompraModel


def test_create_and_list_productos(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id

    payload = {
        "nombre": "Aceite Sintético 5W30",
        "medida": "1 Galón",
        "marca": "Motul",
        "estado_uso": "nuevo",
        "precio_lista": "120.50",
        "precio_compra": "85.00",
        "clasificacion": "mercaderia",
        "stock_actual": 10,
        "stock_minimo": 2,
        "activo": True,
    }
    resp = client.post(f"/api/v1/negocios/{negocio_id}/productos", json=payload, headers=headers)
    assert resp.status_code == 201
    prod = resp.json()
    assert prod["nombre"] == "Aceite Sintético 5W30"
    assert prod["negocio_id"] == negocio_id
    assert prod["activo"] is True

    # Listar
    list_resp = client.get(f"/api/v1/negocios/{negocio_id}/productos", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


def test_update_producto_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id

    # Crear producto inicial
    create_resp = client.post(
        f"/api/v1/negocios/{negocio_id}/productos",
        json={"nombre": "Filtro de Aire", "precio_lista": "45.00", "stock_actual": 5},
        headers=headers,
    )
    prod_id = create_resp.json()["id"]

    # PATCH parcial
    patch_payload = {
        "nombre": "Filtro de Aire Premium",
        "precio_lista": "55.00",
        "stock_actual": 8,
        "marca": "Bosch",
        "activo": False,
    }
    patch_resp = client.patch(
        f"/api/v1/negocios/{negocio_id}/productos/{prod_id}",
        json=patch_payload,
        headers=headers,
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["id"] == prod_id
    assert updated["nombre"] == "Filtro de Aire Premium"
    assert Decimal(updated["precio_lista"]) == Decimal("55.00")
    assert updated["stock_actual"] == 8
    assert updated["marca"] == "Bosch"
    assert updated["activo"] is False


def test_update_producto_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    resp = client.patch(
        f"/api/v1/negocios/{negocio_id}/productos/99999",
        json={"nombre": "No existe"},
        headers=headers,
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Producto no encontrado"


def test_update_producto_cross_tenant_forbidden(client, seed_data):
    headers_dueno1 = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    headers_dueno2 = {"Authorization": f"Bearer {seed_data['token_dueno2']}"}
    negocio2_id = seed_data["negocio2"].id

    # Dueno 2 crea producto en negocio 2
    create_resp = client.post(
        f"/api/v1/negocios/{negocio2_id}/productos",
        json={"nombre": "Bujía NGK", "precio_lista": "15.00"},
        headers=headers_dueno2,
    )
    prod_id = create_resp.json()["id"]

    # Dueno 1 intenta actualizar producto de negocio 2
    resp = client.patch(
        f"/api/v1/negocios/{negocio2_id}/productos/{prod_id}",
        json={"nombre": "Bujía Iridium"},
        headers=headers_dueno1,
    )
    assert resp.status_code == 403


def test_delete_producto_sin_movimientos_eliminacion_fisica(client, seed_data, db_session):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id

    # Crear producto
    create_resp = client.post(
        f"/api/v1/negocios/{negocio_id}/productos",
        json={"nombre": "Pastillas de freno", "precio_lista": "80.00"},
        headers=headers,
    )
    prod_id = create_resp.json()["id"]

    # Eliminar
    del_resp = client.delete(
        f"/api/v1/negocios/{negocio_id}/productos/{prod_id}",
        headers=headers,
    )
    assert del_resp.status_code == 200
    assert del_resp.json() == {"ok": True, "mensaje": "Producto eliminado"}

    # Comprobar que no existe en BD
    db_session.expire_all()
    prod_in_db = db_session.get(ProductoModel, prod_id)
    assert prod_in_db is None


def test_delete_producto_con_movimientos_desactivacion(client, seed_data, db_session):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    usuario_id = seed_data["dueno1"].id

    # Crear producto
    create_resp = client.post(
        f"/api/v1/negocios/{negocio_id}/productos",
        json={"nombre": "Cambio de Aceite", "precio_lista": "50.00", "activo": True},
        headers=headers,
    )
    prod_id = create_resp.json()["id"]

    # Agregar movimiento asociado
    mov = MovimientoModel(
        negocio_id=negocio_id,
        usuario_id=usuario_id,
        producto_id=prod_id,
        tipo="servicio",
        precio_lista=50.0,
        precio_final=50.0,
        fecha=datetime.utcnow(),
    )
    db_session.add(mov)
    db_session.commit()

    # Intentar eliminar producto
    del_resp = client.delete(
        f"/api/v1/negocios/{negocio_id}/productos/{prod_id}",
        headers=headers,
    )
    assert del_resp.status_code == 200
    assert del_resp.json() == {"ok": True, "mensaje": "Producto eliminado"}

    # Comprobar que el producto aún existe en BD pero con activo = False
    db_session.expire_all()
    prod_in_db = db_session.get(ProductoModel, prod_id)
    assert prod_in_db is not None
    assert prod_in_db.activo is False


def test_delete_producto_con_registro_compra_desactivacion(client, seed_data, db_session):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno2']}"}
    negocio_id = seed_data["negocio2"].id

    # Crear producto
    create_resp = client.post(
        f"/api/v1/negocios/{negocio_id}/productos",
        json={"nombre": "Batería 12V", "precio_lista": "250.00", "activo": True},
        headers=headers,
    )
    prod_id = create_resp.json()["id"]

    # Agregar registro de compra asociado
    reg = RegistroCompraModel(
        negocio_id=negocio_id,
        producto_id=prod_id,
        cantidad=5,
        costo_unitario=180.0,
        fecha=date.today(),
    )
    db_session.add(reg)
    db_session.commit()

    # Intentar eliminar producto
    del_resp = client.delete(
        f"/api/v1/negocios/{negocio_id}/productos/{prod_id}",
        headers=headers,
    )
    assert del_resp.status_code == 200
    assert del_resp.json() == {"ok": True, "mensaje": "Producto eliminado"}

    # Comprobar que el producto aún existe en BD pero con activo = False
    db_session.expire_all()
    prod_in_db = db_session.get(ProductoModel, prod_id)
    assert prod_in_db is not None
    assert prod_in_db.activo is False


def test_delete_producto_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    resp = client.delete(
        f"/api/v1/negocios/{negocio_id}/productos/99999",
        headers=headers,
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Producto no encontrado"


def test_delete_producto_cross_tenant_forbidden(client, seed_data):
    headers_dueno1 = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    headers_dueno2 = {"Authorization": f"Bearer {seed_data['token_dueno2']}"}
    negocio2_id = seed_data["negocio2"].id

    create_resp = client.post(
        f"/api/v1/negocios/{negocio2_id}/productos",
        json={"nombre": "Neumático 205/55R16"},
        headers=headers_dueno2,
    )
    prod_id = create_resp.json()["id"]

    resp = client.delete(
        f"/api/v1/negocios/{negocio2_id}/productos/{prod_id}",
        headers=headers_dueno1,
    )
    assert resp.status_code == 403
