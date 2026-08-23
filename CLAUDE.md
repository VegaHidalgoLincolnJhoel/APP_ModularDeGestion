# APP_ModularDeGestion — guía para Claude Code

Monorepo con dos roles separados. Antes de tocar código, identifica en qué
rol estás trabajando y quédate dentro de esa carpeta:

- **Backend** (Python/FastAPI/PostgreSQL) → trabaja dentro de `/backend`.
  Lee `backend/CLAUDE.md`.
- **Frontend** (React/Vite/PWA) → trabaja dentro de `/frontend`.
  Lee `frontend/CLAUDE.md`.

No edites archivos del otro lado. Si un cambio necesita tocar ambos lados
(ej. un campo nuevo de punta a punta), coordínalo a través del contrato en
`docs/openapi.yaml` y avisa a quien tiene el otro rol — no lo implementes tú
directamente en la otra carpeta.

## Contexto del proyecto

Sistema de gestión modular multi-negocio (multi-tenant), offline-first,
para negocios tipo taller/servicio con seguimiento opcional de
cliente/vehículo y recordatorios por WhatsApp. Contexto completo, diagrama
de entidades y decisiones de arquitectura: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Contrato de API

`docs/openapi.yaml` es la fuente de verdad compartida entre frontend y
backend. Se actualiza antes (o en el mismo cambio) de implementar/consumir
un endpoint — nunca se deja desactualizado a propósito.

## Reglas duras

- Toda tabla/endpoint específico de un negocio lleva `negocio_id`.
- Antes de exponer/mostrar algo de un módulo opcional (`CLIENTE_VEHICULO`,
  `REGISTRO_COMPRA`, notificaciones WhatsApp), se valida contra
  `modulos_activos` / `modulo_rus_activo` del negocio.
- No se hace commit de secretos (`.env`, credenciales de WhatsApp/SUNAT,
  etc.) — usar los `.env.example` como plantilla.
