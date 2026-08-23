# Frontend — APP_ModularDeGestion

Rol: **frontend**. Trabaja solo dentro de esta carpeta (`/frontend`). No
edites `/backend`. Si necesitas un endpoint nuevo o un cambio de forma en
una respuesta, propone el cambio primero en `../docs/openapi.yaml` y avisa
a quien tiene el rol de backend — no asumas una forma de respuesta que el
backend no expone todavía.

Contexto de dominio y diagrama ER completo: `../docs/ARCHITECTURE.md` y
`../docs/schema_negocios.mermaid`.

## Stack

React + TypeScript + Vite, pensado como PWA instalable (uso principal desde
celular en el negocio).

## Estructura

```
src/
  main.tsx        → entry point
  App.tsx         → router raíz
  api/client.ts   → wrapper de fetch contra la API (VITE_API_URL)
  pages/          → una pantalla por ruta
  components/     → componentes reutilizables
public/
  manifest.webmanifest → metadata de PWA
```

## Reglas duras

- Todo llamado a la API pasa por `src/api/client.ts` (no `fetch` suelto
  desperdigado) para tener un solo lugar de headers/errores/base URL.
- Todo lo que se cree/edite mientras el negocio está offline debe
  guardarse localmente (ver `TODO(offline)` en `src/api/client.ts`) y
  encolarse para sync — no asumir que siempre hay red.
- Pantallas de módulos opcionales (clientes/vehículos, compras) se
  muestran solo si `negocio.modulos_activos` / `modulo_rus_activo` lo
  habilita — pedirlo al backend, no hardcodear.
- No commitear `.env` ni claves reales — usar `.env.example`.

## Cómo correrlo

```bash
cp .env.example .env   # ajustar VITE_API_URL si el backend no está en :8000
npm install
npm run dev
```
