import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import crear_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.negocio import Negocio as NegocioModel
from app.models.usuario import Usuario as UsuarioModel

# SQLite in-memory DB para tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def seed_data(db_session):
    """Crea un admin, dos negocios y sus respectivos dueños para probar aislamiento."""
    # 1. Admin (sin negocio)
    admin = UsuarioModel(
        nombre="Administrador General",
        rol="admin",
        username="admin_test",
        password_hash=hash_password("admin123"),
        negocio_id=None,
        activo=True,
    )
    db_session.add(admin)

    # 2. Negocio 1 + Dueño 1
    negocio1 = NegocioModel(
        nombre="Negocio Uno",
        rubro="Abarrotes",
        modulos_activos={"inventario": True},
        plan_estado="activo",
        modulo_rus_activo=False,
    )
    db_session.add(negocio1)
    db_session.flush()

    dueno1 = UsuarioModel(
        nombre="Dueño Uno",
        rol="dueño",
        username="dueno1_test",
        password_hash=hash_password("dueno123"),
        negocio_id=negocio1.id,
        activo=True,
    )
    db_session.add(dueno1)

    # 3. Negocio 2 + Dueño 2
    negocio2 = NegocioModel(
        nombre="Negocio Dos",
        rubro="Taller",
        modulos_activos={"clientes_vehiculos": True},
        plan_estado="activo",
        modulo_rus_activo=True,
    )
    db_session.add(negocio2)
    db_session.flush()

    dueno2 = UsuarioModel(
        nombre="Dueño Dos",
        rol="dueño",
        username="dueno2_test",
        password_hash=hash_password("dueno123"),
        negocio_id=negocio2.id,
        activo=True,
    )
    db_session.add(dueno2)

    db_session.commit()
    db_session.refresh(admin)
    db_session.refresh(negocio1)
    db_session.refresh(dueno1)
    db_session.refresh(negocio2)
    db_session.refresh(dueno2)

    token_admin = crear_access_token(admin.id, admin.rol, admin.negocio_id)
    token_dueno1 = crear_access_token(dueno1.id, dueno1.rol, dueno1.negocio_id)
    token_dueno2 = crear_access_token(dueno2.id, dueno2.rol, dueno2.negocio_id)

    return {
        "admin": admin,
        "token_admin": token_admin,
        "negocio1": negocio1,
        "dueno1": dueno1,
        "token_dueno1": token_dueno1,
        "negocio2": negocio2,
        "dueno2": dueno2,
        "token_dueno2": token_dueno2,
    }
