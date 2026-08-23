# Backend — APP_ModularDeGestion

API en FastAPI + SQLAlchemy + Alembic + PostgreSQL. Ver `CLAUDE.md` en esta
carpeta para las reglas de trabajo, y `../docs/ARCHITECTURE.md` /
`../docs/openapi.yaml` para el contexto de dominio y el contrato.

## Setup

```bash
cp .env.example .env      # ajustar DATABASE_URL a tu Postgres local
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic revision --autogenerate -m "init schema"
alembic upgrade head
uvicorn app.main:app --reload
```

- API: http://localhost:8000/api/v1
- Docs interactivas (Swagger): http://localhost:8000/docs

## Tests

```bash
pytest
```

## Estado

Implementado como ejemplo del patrón a seguir: `negocios` y `productos`
(modelo + schema + router, CRUD básico). El resto de entidades del ER
(`movimientos`, `cierres_caja`, `clientes_vehiculos`, `notificaciones_wsp`,
`alertas_descartadas`, `registros_compra`, `cola_sync`) ya tienen su modelo
SQLAlchemy en `app/models/` — falta el schema Pydantic y el router de cada
una, siguiendo el mismo patrón que `negocios`/`productos`. El contrato ya
está esbozado en `../docs/openapi.yaml`.

Pendiente de definir: autenticación/autorización (login, sesión por
negocio y rol de usuario).
