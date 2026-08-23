# Backend — APP_ModularDeGestion

Rol: **backend**. Trabaja solo dentro de esta carpeta (`/backend`). No
edites `/frontend`. Si necesitas un cambio de contrato (endpoint nuevo,
forma de una respuesta), actualízalo primero en `../docs/openapi.yaml` y
avisa a quien tiene el rol de frontend.

Contexto de dominio y diagrama ER completo: `../docs/ARCHITECTURE.md` y
`../docs/schema_negocios.mermaid`.

## Stack

FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL + Pydantic v2.

## Estructura

```
app/
  main.py           → instancia FastAPI, monta routers
  core/config.py    → settings (variables de entorno)
  db/session.py     → engine + sesión de SQLAlchemy
  db/base.py        → Base declarativa + import de todos los modelos (para Alembic)
  models/           → un archivo por entidad del ER (SQLAlchemy)
  schemas/          → un archivo por entidad (Pydantic, request/response)
  api/v1/           → routers, uno por recurso, agregados en api/v1/router.py
alembic/            → migraciones versionadas
tests/
```

## Reglas duras

- Toda tabla que cuelga de un negocio lleva `negocio_id` con FK a
  `negocios.id` — es la base del multi-tenant. Ningún query de una entidad
  con `negocio_id` debe ejecutarse sin filtrar por ese negocio.
- Antes de exponer un endpoint de un módulo opcional
  (`clientes_vehiculos`, `registro_compras`, notificaciones WhatsApp),
  valida `modulos_activos` / `modulo_rus_activo` del negocio y responde
  403 si el módulo no está activo (ver ejemplo de convención en
  `docs/openapi.yaml`, respuesta 403 de `/negocios/{id}/clientes-vehiculos`).
- Cambios de esquema van por migración de Alembic, nunca editando la DB a
  mano ni con `create_all` en producción.
- El endpoint `/negocios/{id}/sync` debe ser idempotente por el `id`
  (uuid generado en cliente) de cada item de `COLA_SYNC` — un reintento del
  frontend no debe duplicar datos.
- No commitear `.env` ni credenciales reales — usar `.env.example`.

## Cómo correrlo

```bash
cp .env.example .env   # ajustar DATABASE_URL
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Docs interactivas en `http://localhost:8000/docs` una vez levantado.
