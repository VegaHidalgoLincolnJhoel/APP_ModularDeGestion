from app.core.security import crear_access_token


def test_list_usuarios_owner_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    response = client.get(f"/api/v1/negocios/{negocio_id}/usuarios", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["username"] == "dueno1_test"
    assert data[0]["negocio_id"] == negocio_id


def test_list_usuarios_filter_activo(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id

    # Crear un usuario inactivo para probar filtrado
    client.post(
        f"/api/v1/negocios/{negocio_id}/usuarios",
        json={
            "nombre": "Empleado Inactivo",
            "rol": "empleado",
            "username": "empleado_inactivo",
            "password": "pass",
        },
        headers=headers,
    )
    # Desactivarlo
    list_resp = client.get(f"/api/v1/negocios/{negocio_id}/usuarios", headers=headers)
    inactivo_user = next(u for u in list_resp.json() if u["username"] == "empleado_inactivo")
    client.patch(
        f"/api/v1/negocios/{negocio_id}/usuarios/{inactivo_user['id']}",
        json={"activo": False},
        headers=headers,
    )

    # Probar filtro activo=true
    resp_activos = client.get(f"/api/v1/negocios/{negocio_id}/usuarios?activo=true", headers=headers)
    assert resp_activos.status_code == 200
    activos = resp_activos.json()
    assert all(u["activo"] is True for u in activos)
    assert len(activos) == 1

    # Probar filtro activo=false
    resp_inactivos = client.get(f"/api/v1/negocios/{negocio_id}/usuarios?activo=false", headers=headers)
    assert resp_inactivos.status_code == 200
    inactivos = resp_inactivos.json()
    assert all(u["activo"] is False for u in inactivos)
    assert len(inactivos) == 1


def test_list_usuarios_cross_tenant_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio2_id = seed_data["negocio2"].id
    response = client.get(f"/api/v1/negocios/{negocio2_id}/usuarios", headers=headers)
    assert response.status_code == 403


def test_list_usuarios_negocio_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    response = client.get("/api/v1/negocios/99999/usuarios", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Negocio no encontrado"


def test_create_usuario_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    payload = {
        "nombre": "Cajero Uno",
        "rol": "cajero",
        "username": "cajero1",
        "password": "cajero_password",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/usuarios", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Cajero Uno"
    assert data["rol"] == "cajero"
    assert data["username"] == "cajero1"
    assert data["negocio_id"] == negocio_id
    assert data["activo"] is True

    # Verificar login del nuevo usuario
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "cajero1", "password": "cajero_password"},
    )
    assert login_resp.status_code == 200
    assert login_resp.json()["negocio_id"] == negocio_id


def test_create_usuario_duplicate_username(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    payload = {
        "nombre": "Otro Dueño",
        "rol": "dueño",
        "username": "dueno2_test",  # Ya existe en el otro negocio
        "password": "password123",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/usuarios", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El nombre de usuario ya está registrado"


def test_create_usuario_admin_role_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    payload = {
        "nombre": "Intentando Admin",
        "rol": "admin",
        "username": "super_admin_falso",
        "password": "password123",
    }
    response = client.post(f"/api/v1/negocios/{negocio_id}/usuarios", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Un usuario de negocio no puede tener rol admin"


def test_create_usuario_cross_tenant_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio2_id = seed_data["negocio2"].id
    payload = {
        "nombre": "Hacker User",
        "rol": "dueño",
        "username": "hacker",
        "password": "password123",
    }
    response = client.post(f"/api/v1/negocios/{negocio2_id}/usuarios", json=payload, headers=headers)
    assert response.status_code == 403


def test_create_usuario_negocio_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    payload = {
        "nombre": "User",
        "rol": "dueño",
        "username": "user99",
        "password": "password123",
    }
    response = client.post("/api/v1/negocios/99999/usuarios", json=payload, headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Negocio no encontrado"


def test_update_usuario_reset_password_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    dueno1_id = seed_data["dueno1"].id

    payload = {"password": "nueva_password_789"}
    response = client.patch(
        f"/api/v1/negocios/{negocio_id}/usuarios/{dueno1_id}",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 200

    # Probar que login con contraseña vieja falla
    login_old = client.post(
        "/api/v1/auth/login",
        json={"username": "dueno1_test", "password": "dueno123"},
    )
    assert login_old.status_code == 401

    # Probar que login con nueva contraseña funciona
    login_new = client.post(
        "/api/v1/auth/login",
        json={"username": "dueno1_test", "password": "nueva_password_789"},
    )
    assert login_new.status_code == 200


def test_update_usuario_deactivate_user(client, seed_data):
    headers_admin = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio2_id = seed_data["negocio2"].id
    dueno2_id = seed_data["dueno2"].id
    token_dueno2 = seed_data["token_dueno2"]

    # 1. Verificar que token_dueno2 funciona antes de desactivar
    resp_before = client.get(
        f"/api/v1/negocios/{negocio2_id}",
        headers={"Authorization": f"Bearer {token_dueno2}"},
    )
    assert resp_before.status_code == 200

    # 2. Desactivar el usuario dueno2
    patch_resp = client.patch(
        f"/api/v1/negocios/{negocio2_id}/usuarios/{dueno2_id}",
        json={"activo": False},
        headers=headers_admin,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["activo"] is False

    # 3. Intentar hacer login -> 401 Usuario deshabilitado
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "dueno2_test", "password": "dueno123"},
    )
    assert login_resp.status_code == 401
    assert login_resp.json()["detail"] == "Usuario deshabilitado"

    # 4. Probar que el token emitido PREVIAMENTE ya no funciona (baja inmediata)
    resp_after = client.get(
        f"/api/v1/negocios/{negocio2_id}",
        headers={"Authorization": f"Bearer {token_dueno2}"},
    )
    assert resp_after.status_code == 401
    assert resp_after.json()["detail"] == "Usuario deshabilitado"


def test_update_usuario_cross_tenant_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio2_id = seed_data["negocio2"].id
    dueno2_id = seed_data["dueno2"].id

    response = client.patch(
        f"/api/v1/negocios/{negocio2_id}/usuarios/{dueno2_id}",
        json={"activo": False},
        headers=headers,
    )
    assert response.status_code == 403


def test_update_usuario_user_belongs_to_other_negocio_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio1_id = seed_data["negocio1"].id
    dueno2_id = seed_data["dueno2"].id  # Pertenece a negocio 2, no a negocio 1

    response = client.patch(
        f"/api/v1/negocios/{negocio1_id}/usuarios/{dueno2_id}",
        json={"nombre": "Nuevo Nombre"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"


def test_update_usuario_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio_id = seed_data["negocio1"].id

    response = client.patch(
        f"/api/v1/negocios/{negocio_id}/usuarios/99999",
        json={"nombre": "Fantasma"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Usuario no encontrado"


def test_update_usuario_admin_role_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio_id = seed_data["negocio1"].id
    dueno1_id = seed_data["dueno1"].id

    response = client.patch(
        f"/api/v1/negocios/{negocio_id}/usuarios/{dueno1_id}",
        json={"rol": "admin"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Un usuario de negocio no puede tener rol admin"
