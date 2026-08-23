# App de gestión modular — Llantería y Lubricentro

## Contexto
Lincoln Vega Hidalgo, estudiante de Ingeniería de Sistemas (Lima, Perú), freelance.
Primeros dos clientes: llantería de su papá y lubricentro de su vecina. Meta: núcleo
modular reutilizable, vendible luego a otros negocios similares.

## Stack técnico
- Backend: Python + FastAPI + SQLAlchemy + Alembic + PostgreSQL
- Frontend: React + Vite + TypeScript, como PWA (mobile-first, también usable en PC/escritorio)
- Notificaciones: WhatsApp vía Twilio API
- Arquitectura: multi-tenant. Un solo backend/BD para todos los clientes.
  Cada negocio = una fila en la tabla `negocio`, con módulos activables por JSON.

## Modelo de negocio
- Papá: gratis siempre (plan "exento", nunca se degrada).
- Vecina y futuros clientes: 1 mes de prueba gratis, luego cuota mensual USD 10-15.
- Instalación (futuros clientes): pago único USD 100-200, flexible.
- Cobro manual vía Yape/transferencia (sin pasarela automática por ahora).
- Formalización: boleta simple de servicio, no contrato formal (por ahora).
- Mora: se degrada a versión local — mantiene inventario y ventas, pero se
  deshabilitan alertas de stock, alertas de clientes y envíos de WhatsApp.

## Roadmap
- MVP: todo online, ambos negocios, con todo lo funcional descrito abajo.
- Fase 2 (después de la demo funcionando): modo offline-first — guardar
  operaciones en cola local (IndexedDB) si falla internet, sincronizar
  automáticamente al reconectar. Tabla `cola_sync` ya contemplada en el esquema.
- Futuro (no ahora): integración SUNAT para boletas/facturas electrónicas,
  detección automática de pagos Yape.

---

## Negocio A — Llantería (papá)

Rubro: parchado/inflado de llantas, venta de llantas nuevas/usadas, accesorios
(tuercas de seguridad, líquido sellador, cámaras, pitones).

- Catálogo con medida, marca, estado (nuevo/usado), precio de lista, precio de compra.
- Stock por combinación medida+marca, con mínimo configurable y alerta automática.
- Clasificación contable: productos = capital, servicios = ganancia directa.
- Pantalla de inicio: botones grandes de acción rápida, agrupados primero por
  categoría "Servicio" / "Producto", y dentro las opciones específicas
  (parchado, inflado / venta llanta, accesorio). Sin dashboard de resumen aquí.
- Flujo de venta de llanta: elegir medida → filtra marcas en stock → precio
  de lista mostrado → precio editable (se guardan ambos) → confirmación
  explícita antes de restar stock → selector de método de pago (efectivo/digital).
- Si la venta deja el producto bajo el mínimo: modal de confirmación antes
  de aplicar. Alerta persistente en inicio hasta resolverse, con checkbox
  "no mostrar hoy" (se resetea diariamente). Se resuelve sola cuando el
  stock vuelve a subir del mínimo.
- Reportes de stock: vista "por marca" (cards con medidas/cantidad/precio)
  y vista "general" (totales agregados por medida). Administrable desde
  el panel, sin tocar la base de datos.
- Cierre de caja diario/semanal/mensual: total bruto, desglose capital vs
  ganancia, desglose efectivo vs digital.
- Pestaña "SUNAT" (declaración RUS mensual): recordatorio cerca del día 20,
  total vendido del mes, total comprado del mes (suma de `registro_compra`),
  campo editable con el link de pago de SUNAT. Solo visible si
  `modulo_rus_activo = true`.
- Registro de compras/reposición de stock: pantalla simple para sumar stock
  con cantidad + costo unitario (alimenta el total comprado de SUNAT y
  el registro de reposición).

## Negocio B — Lubricentro (vecina)

Rubro: cambio de aceite (principal), venta de filtros de aire, siliconas,
otros productos, lavado de motor.

- Misma estructura de inicio: categorías "Servicio" / "Producto" primero,
  luego las opciones específicas.
- Flujo de atención: PRIMERO se registra el servicio/venta directo (sin
  pedir datos del cliente, cero fricción). AL FINAL, opcionalmente, se
  pregunta si quiere seguimiento — recién ahí se piden placa, vehículo,
  tipo de aceite, y se agenda el intervalo (definido manualmente, ej. 1 mes).
- Cliente organizado por vehículo (placa, marca, modelo, tipo de aceite),
  no solo por persona.
- Próximo mantenimiento calculado solo por tiempo (no kilometraje).
- Alertas de mantenimiento vencido/próximo: persistentes en inicio (misma
  lógica que stock, con "no mostrar hoy"), con botón directo "contactar
  por WhatsApp" + envío automático al cliente vía Twilio.
- Indicador de fallo de envío de WhatsApp visible junto al cliente (número
  mal escrito, no existe, etc.) para que la vecina sepa que debe llamarlo.
- Gestión de clientes activos/inactivos: poder archivar/eliminar para no
  inflar la base de datos.
- Vista adecuada para PC de escritorio del local, no solo celular.

## Regla transversal — anti-duplicados de catálogo
Al crear un producto nuevo (en cualquiera de los dos negocios), buscar
coincidencias parecidas por nombre (ignorando mayúsculas, espacios extra,
variaciones menores) antes de permitir guardar. Si encuentra algo similar,
mostrar alerta con opción "usar el existente" o "es otro, crear nuevo".
Aplica en ambos negocios.

---

## Esquema de base de datos (núcleo modular)
Ver diagrama ER completo en [`docs/schema_negocios.mermaid`](./docs/schema_negocios.mermaid)
y las decisiones de arquitectura en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
Entidades principales: `negocio`, `usuario`, `producto`, `movimiento`
(ventas/servicios), `cierre_caja`, `cliente_vehiculo`, `notificacion_wsp`,
`alerta_descartada`, `registro_compra`, `cola_sync` (fase 2, offline).

## Fuera de alcance por ahora
- Integración SUNAT vía API (Nubefact/Facturador) — futuro.
- Detección automática de pagos Yape — futuro.
- Kilometraje como criterio de mantenimiento — descartado, solo por tiempo.
- Login individual por empleado — futuro, hoy no hay roles/usuarios separados.
- Modo offline (fase 2, no MVP).

---

## Cómo trabajar en este repo (monorepo, roles separados)

Este repo tiene dos roles separados. Antes de tocar código, identifica en
qué rol estás trabajando y quédate dentro de esa carpeta:

- **Backend** (Python/FastAPI/PostgreSQL) → trabaja dentro de `/backend`.
  Lee `backend/CLAUDE.md`.
- **Frontend** (React/Vite/PWA) → trabaja dentro de `/frontend`.
  Lee `frontend/CLAUDE.md`.

No edites archivos del otro lado. Si un cambio necesita tocar ambos lados
(ej. un campo nuevo de punta a punta), coordínalo a través del contrato en
`docs/openapi.yaml` y avisa a quien tiene el otro rol — no lo implementes tú
directamente en la otra carpeta.

### Contrato de API
`docs/openapi.yaml` es la fuente de verdad compartida entre frontend y
backend. Se actualiza antes (o en el mismo cambio) de implementar/consumir
un endpoint — nunca se deja desactualizado a propósito.

### Reglas duras
- Toda tabla/endpoint específico de un negocio lleva `negocio_id`.
- Antes de exponer/mostrar algo de un módulo opcional (`CLIENTE_VEHICULO`,
  `REGISTRO_COMPRA`, notificaciones WhatsApp), se valida contra
  `modulos_activos` / `modulo_rus_activo` del negocio.
- No se hace commit de secretos (`.env`, credenciales de WhatsApp/SUNAT,
  etc.) — usar los `.env.example` como plantilla.
