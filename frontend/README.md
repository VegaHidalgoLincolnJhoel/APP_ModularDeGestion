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

Todas las pantallas del MVP conectadas contra la API real: Inicio (por
negocio, config-driven en `data/negociosConfig.tsx`), flujo de
venta/servicio, Cierre de Caja, Stock (+ ajuste rápido y registro de
compra), Clientes/Vehículos, SUNAT y Compras.

Pendiente: store offline (IndexedDB/localStorage) que alimenta la cola de
sync (`POST /negocios/{id}/sync`, ver `../docs/openapi.yaml`) — fase 2 del
roadmap, no bloquea el MVP — y autenticación.

## Despliegue (Cloudflare Pages)

1. En [pages.cloudflare.com](https://pages.cloudflare.com), "Create a
   project" → conectar el repo de GitHub.
2. Configuración de build:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Variable de entorno (Settings → Environment variables, en Production):
   - `VITE_API_URL` = URL del backend ya desplegado + `/api/v1`
     (ej. `https://tu-backend.onrender.com/api/v1`). Como es una variable
     `VITE_*`, Vite la incrusta en el build — si cambia la URL del
     backend, hay que volver a desplegar el frontend, no alcanza con
     cambiar la variable sola.
4. Deploy. Cloudflare da HTTPS y un dominio `*.pages.dev` gratis; se puede
   apuntar un dominio propio después desde la misma configuración del
   proyecto.

Desplegar el backend primero (ver `../backend/README.md`) para tener la
URL real antes de este paso — si no, se puede desplegar el frontend igual
y arreglar `VITE_API_URL` después con un redeploy.

`_redirects` (en `public/`) ya deja resuelto el ruteo de SPA: sin eso,
recargar una ruta como `/llanteria/stock` daría 404 en un host estático.
