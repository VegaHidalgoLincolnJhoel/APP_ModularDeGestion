# Backend — APP_ModularDeGestion

API en FastAPI + SQLAlchemy + Alembic + PostgreSQL. Ver `CLAUDE.md` en esta
carpeta para las reglas de trabajo, y `../docs/ARCHITECTURE.md` /
`../docs/openapi.yaml` para el contexto de dominio y el contrato.

## Setup

```bash
cp .env.example .env      # ajustar DATABASE_URL a tu Postgres local
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head       # aplica todas las migraciones (alembic/versions/)
python scripts/seed_admin_y_negocios.py   # crea admin + usuario de cada negocio real
uvicorn app.main:app --reload
```

- API: http://localhost:8000/api/v1
- Docs interactivas (Swagger): http://localhost:8000/docs
- Casi todo requiere login: `POST /api/v1/auth/login` con alguna de las
  credenciales que imprimió el seed, y mandar el `access_token` de la
  respuesta como header `Authorization: Bearer <token>` en el resto de
  requests.

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

Auth: login con JWT (`POST /auth/login`), roles `admin` (cross-tenant,
crea negocios nuevos) y de negocio (atado a su `negocio_id`). Todo
endpoint bajo `/negocios/{negocio_id}/...` valida que el token sea de ese
negocio o de un admin — ver `app/core/auth.py`. Pendiente real: no hay
refresh token (el access token dura 7 días y hay que re-loguearse al
vencer) ni recuperación de contraseña.

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
