# Arquitectura — APP_ModularDeGestion

## 1. Qué es

Sistema de gestión modular multi-negocio (multi-tenant), pensado inicialmente
para negocios tipo taller/servicio (venta de productos + servicios con
seguimiento de vehículo/cliente, ej. cambios de aceite), pero diseñado para
activar/desactivar módulos por negocio según el `rubro`.

Cada negocio (`NEGOCIO`) es un tenant independiente: todas las tablas
operativas cuelgan de `negocio_id`. Qué módulos ve un negocio se controla con
el campo `modulos_activos` (JSON) y flags puntuales como `modulo_rus_activo`
(régimen tributario RUS, Perú) — `link_sunat` confirma el contexto peruano.

Es **offline-first**: `COLA_SYNC` es una cola de sincronización genérica
(`entidad` + `payload` JSON + `estado`) para que la app funcione sin conexión
en el negocio y sincronice cuando vuelva la red. Esto es una decisión de
arquitectura importante para el frontend (debe escribir contra un store local
y encolar cambios) y para el backend (debe exponer un endpoint idempotente de
sync que procese la cola).

## 2. Módulos / dominios

- **Core (siempre activo):** `NEGOCIO`, `USUARIO`, `PRODUCTO`, `MOVIMIENTO`,
  `CIERRE_CAJA`. Inventario + ventas/servicios + caja.
- **Clientes y vehículos (opcional, `modulos_activos`):**
  `CLIENTE_VEHICULO`, `NOTIFICACION_WSP`, `ALERTA_DESCARTADA`. Seguimiento de
  mantenimiento (`fecha_proximo_mantenimiento`) y recordatorios por WhatsApp.
- **Compras / reposición RUS (opcional, `modulo_rus_activo`):**
  `REGISTRO_COMPRA` — repone `stock_actual` de `PRODUCTO`.
- **Sync offline (transversal):** `COLA_SYNC`.

Diagrama completo de entidades: [`schema_negocios.mermaid`](./schema_negocios.mermaid).

## 3. Decisiones de stack

| Capa      | Elección                         | Motivo |
|-----------|-----------------------------------|--------|
| Backend   | Python + FastAPI + SQLAlchemy + Alembic + PostgreSQL | Tipado con Pydantic, async, buena forma de modelar el JSON de `modulos_activos`/`COLA_SYNC.payload`, migraciones versionadas con Alembic. |
| Frontend  | React + Vite + TypeScript, como PWA | Uso desde celular en el negocio, instalable, soporte para IndexedDB/localStorage como store offline que alimenta `COLA_SYNC`. |
| Contrato  | OpenAPI (`docs/openapi.yaml`)     | Fuente de verdad compartida entre quien hace front y quien hace back — se define/actualiza antes de implementar un endpoint nuevo. |
| DB        | PostgreSQL                        | JSON nativo (`modulos_activos`, `payload`), buen soporte multi-tenant por FK. |

## 4. Estructura del repo (monorepo)

```
/backend    → API (FastAPI). Ver backend/CLAUDE.md
/frontend   → PWA (React + Vite). Ver frontend/CLAUDE.md
/docs       → contrato de API, diagrama ER, este documento
```

## 5. Cómo trabajan front y back en paralelo

1. **El contrato manda.** Antes de programar un endpoint o una pantalla que
   lo consuma, `docs/openapi.yaml` se actualiza primero (aunque sea a mano).
   Si backend cambia forma de una respuesta, actualiza el contrato en el
   mismo PR.
2. **Cada rol se queda en su carpeta.** Quien trabaja en frontend no edita
   `/backend` y viceversa. Cambios que cruzan ambos lados (ej. un campo nuevo
   de principio a fin) se coordinan vía el contrato + un mensaje entre
   ambos, no editando directamente el otro lado.
3. **negocio_id siempre presente.** Cualquier endpoint/tabla nueva que sea
   específica de un negocio debe llevar `negocio_id` — es la base del
   multi-tenant.
4. **Módulos opcionales se respetan.** Antes de mostrar una pantalla o
   exponer un endpoint de `CLIENTE_VEHICULO`/`REGISTRO_COMPRA`, se valida
   contra `modulos_activos` / `modulo_rus_activo` del negocio.

## 6. Estado actual

Fase inicial: scaffold de ambos proyectos + contrato base + modelos de datos
según el diagrama ER. Pendiente: autenticación/autorización por negocio y
rol de usuario, lógica de negocio real de cada endpoint, y el store offline
del frontend.
