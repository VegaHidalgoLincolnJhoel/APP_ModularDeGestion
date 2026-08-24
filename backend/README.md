# Backend — APP_ModularDeGestion

API en FastAPI + SQLAlchemy + Alembic + PostgreSQL. Ver `CLAUDE.md` en esta
carpeta para las reglas de trabajo, y `../docs/ARCHITECTURE.md` /
`../docs/openapi.yaml` para el contexto de dominio y el contrato.

## Setup

```bash
cp .env.example .env      # ajustar DATABASE_URL a tu Postgres local
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head      # aplica la migración inicial (alembic/versions/)
uvicorn app.main:app --reload
```

- API: http://localhost:8000/api/v1
- Docs interactivas (Swagger): http://localhost:8000/docs

## Tests

```bash
pytest
```

## Estado

MVP completo: `negocios`, `usuarios`, `productos` (con anti-duplicados y
`ajustar-stock`), `movimientos`, `cierres_caja`, `clientes_vehiculos`,
`registro_compras` y `sync` (cola offline, hoy solo soporta la entidad
`movimiento`) — todos con su modelo, schema y router siguiendo el mismo
patrón, documentados en `../docs/openapi.yaml`.

Pendiente de definir: autenticación/autorización (login, sesión por
negocio y rol de usuario) — hoy cualquiera con la URL de la API puede
leer/escribir cualquier negocio. Aceptable por ahora con dos usuarios de
confianza, pero hay que volver sobre esto antes de sumar más clientes.

Cuando agregues/edites un modelo, generá la migración correspondiente con
`alembic revision --autogenerate -m "..."` y commiteala junto con el
cambio de modelo — no dejes `alembic/versions/` sin la migración que
corresponde al esquema actual.

## Despliegue

Ver `../docs/DEPLOY.md` para el flujo completo (Neon + Render/Railway +
Cloudflare Pages). Resumen de esta carpeta:

- `Dockerfile` en la raíz de `backend/` — imagen `python:3.12-slim`,
  instala `requirements.txt` y al arrancar corre `alembic upgrade head`
  antes de levantar uvicorn en el `$PORT` que inyecte la plataforma.
  Probado localmente con `docker build` + un Postgres descartable en
  Docker antes de dar esto por armado.
- Variables de entorno en producción (mismos nombres que `.env.example`):
  - `DATABASE_URL`: connection string de Neon (`postgresql+psycopg2://...`).
  - `CORS_ORIGINS`: dominio real del frontend en Cloudflare Pages, ej.
    `https://app-modulardegestion.pages.dev`. Se lee en cada arranque
    (`app/core/config.py`), así que actualizarla es un simple redeploy/
    restart del servicio — no hace falta reconstruir la imagen.
  - `ENV=production`.
- Migraciones: corren solas al arrancar el contenedor (parte del `CMD`
  del Dockerfile), no hace falta correrlas a mano contra Neon. Es un
  approach simple y suficiente mientras el servicio corra en una sola
  instancia (caso de Render/Railway en su tier gratis o más barato). Si
  en algún momento esto escala a múltiples instancias arrancando en
  paralelo, migrar a un release step separado antes del start command
  para evitar que dos contenedores corran `alembic upgrade` a la vez.
