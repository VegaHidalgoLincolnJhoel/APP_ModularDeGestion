# APP_ModularDeGestion

Sistema de gestión modular multi-negocio (multi-tenant), offline-first, para
negocios tipo taller/servicio con seguimiento opcional de cliente/vehículo y
recordatorios por WhatsApp.

Contexto de dominio, diagrama de entidades y decisiones de arquitectura:
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Estructura

```
/backend    → API (FastAPI + PostgreSQL). Ver backend/README.md
/frontend   → PWA (React + Vite). Ver frontend/README.md
/docs       → contrato de API (openapi.yaml), diagrama ER, arquitectura
```

## Cómo se trabaja aquí

Este es un monorepo con dos roles separados (frontend / backend). Cada quien
trabaja dentro de su carpeta; el contrato en `docs/openapi.yaml` es la
fuente de verdad compartida. Ver [`CLAUDE.md`](./CLAUDE.md) para las reglas
completas.

## Quick start

Backend:

```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
