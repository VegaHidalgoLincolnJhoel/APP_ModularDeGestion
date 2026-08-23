# Frontend — APP_ModularDeGestion

React + Vite + TypeScript, PWA. Ver `CLAUDE.md` en esta carpeta para las
reglas de trabajo, y `../docs/ARCHITECTURE.md` / `../docs/openapi.yaml`
para el contexto de dominio y el contrato de API.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Requiere el backend corriendo (ver `../backend/README.md`) en la URL de
`VITE_API_URL` (por defecto `http://localhost:8000/api/v1`).

## Scripts

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción
npm run preview   # sirve el build
npm run lint      # eslint
```

## Estado

Scaffold inicial: cliente de API tipado (`src/api/client.ts`), un endpoint
de ejemplo (`listNegocios`) y una pantalla `Dashboard` que lo consume.
Pendiente: el resto de pantallas según los módulos del negocio, el store
offline (IndexedDB/localStorage) que alimenta la cola de sync
(`POST /negocios/{id}/sync`, ver `../docs/openapi.yaml`), y autenticación.
