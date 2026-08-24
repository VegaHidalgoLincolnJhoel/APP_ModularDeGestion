def test_list_negocios_admin_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    response = client.get("/api/v1/negocios", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    nombres = [item["nombre"] for item in data]
    assert "Negocio Uno" in nombres
    assert "Negocio Dos" in nombres


def test_list_negocios_non_admin_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    response = client.get("/api/v1/negocios", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Requiere rol admin"


def test_list_negocios_unauthenticated(client):
    response = client.get("/api/v1/negocios")
    assert response.status_code == 401
    assert response.json()["detail"] == "Falta el header Authorization"


def test_create_negocio_admin_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    payload = {
        "nombre": "Negocio Tres",
        "rubro": "Ferretería",
        "modulos_activos": {"inventario": True},
        "plan_estado": "activo",
        "modulo_rus_activo": True,
        "usuario_inicial": {
            "nombre": "Dueño Tres",
            "rol": "dueño",
            "username": "dueno3_nuevo",
            "password": "password123",
        },
    }
    response = client.post("/api/v1/negocios", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Negocio Tres"
    assert data["rubro"] == "Ferretería"
    assert data["modulo_rus_activo"] is True
    assert "id" in data

    # Probar que el usuario recién creado puede hacer login
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "dueno3_nuevo", "password": "password123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["negocio_id"] == data["id"]
    assert login_data["rol"] == "dueño"


def test_create_negocio_non_admin_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    payload = {
        "nombre": "Negocio Ilegal",
        "rubro": "Varios",
        "usuario_inicial": {
            "nombre": "Usuario",
            "rol": "dueño",
            "username": "usuario_ilegal",
            "password": "password123",
        },
    }
    response = client.post("/api/v1/negocios", json=payload, headers=headers)
    assert response.status_code == 403


def test_create_negocio_duplicate_username(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    payload = {
        "nombre": "Negocio Duplicado",
        "rubro": "Varios",
        "usuario_inicial": {
            "nombre": "Duplicado",
            "rol": "dueño",
            "username": "dueno1_test",  # Ya existe en seed_data
            "password": "password123",
        },
    }
    response = client.post("/api/v1/negocios", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El nombre de usuario ya está registrado"


def test_create_negocio_initial_user_admin_role_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    payload = {
        "nombre": "Negocio Con Admin Usuario",
        "rubro": "Varios",
        "usuario_inicial": {
            "nombre": "Falso Admin",
            "rol": "admin",
            "username": "admin_falso",
            "password": "password123",
        },
    }
    response = client.post("/api/v1/negocios", json=payload, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El usuario del negocio no puede tener rol admin"


def test_get_negocio_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    response = client.get(f"/api/v1/negocios/{negocio_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == negocio_id
    assert data["nombre"] == "Negocio Uno"


def test_get_negocio_cross_tenant_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio2_id = seed_data["negocio2"].id
    response = client.get(f"/api/v1/negocios/{negocio2_id}", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "No autorizado para este negocio"


def test_get_negocio_admin_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio2_id = seed_data["negocio2"].id
    response = client.get(f"/api/v1/negocios/{negocio2_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == negocio2_id


def test_get_negocio_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    response = client.get("/api/v1/negocios/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Negocio no encontrado"


def test_update_negocio_owner_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio_id = seed_data["negocio1"].id
    payload = {
        "link_sunat": "https://sunat.gob.pe/pago/123",
        "modulos_activos": {"inventario": True, "registro_compras": True},
    }
    response = client.patch(f"/api/v1/negocios/{negocio_id}", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["link_sunat"] == "https://sunat.gob.pe/pago/123"
    assert data["modulos_activos"] == {"inventario": True, "registro_compras": True}


def test_update_negocio_cross_tenant_forbidden(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_dueno1']}"}
    negocio2_id = seed_data["negocio2"].id
    payload = {"link_sunat": "https://hack.com"}
    response = client.patch(f"/api/v1/negocios/{negocio2_id}", json=payload, headers=headers)
    assert response.status_code == 403


def test_update_negocio_admin_success(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    negocio2_id = seed_data["negocio2"].id
    payload = {"plan_estado": "suspendido"}
    response = client.patch(f"/api/v1/negocios/{negocio2_id}", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["plan_estado"] == "suspendido"


def test_update_negocio_not_found(client, seed_data):
    headers = {"Authorization": f"Bearer {seed_data['token_admin']}"}
    response = client.patch("/api/v1/negocios/99999", json={"nombre": "Nuevo"}, headers=headers)
    assert response.status_code == 404
