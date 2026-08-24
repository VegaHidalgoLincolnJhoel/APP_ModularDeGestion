# Despliegue

Stack elegido: nube gestionada, económica (~US$0-5/mes) — Neon (Postgres),
Render o Railway (backend), Cloudflare Pages (frontend). Ver el resto de
opciones consideradas (VPS propio, self-host local) en la conversación con
Lincoln; esta es la que se eligió para arrancar.

Orden recomendado: base de datos → backend → frontend (el frontend necesita
la URL real del backend para `VITE_API_URL`).

## 1. Base de datos — Neon

Pasos para quien lo despliegue (no requiere nada de código):
1. Crear cuenta en [neon.tech](https://neon.tech), crear un proyecto.
2. Copiar el connection string (formato `postgresql://...`).
3. Ese valor va como `DATABASE_URL` del backend — ver sección siguiente.

## 2. Backend

Ver `../backend/README.md` para el detalle específico (Dockerfile,
variables de entorno, cómo correr las migraciones en el despliegue). *Pendiente
de completar por el lado de backend.*

## 3. Frontend — Cloudflare Pages

Ver `../frontend/README.md#despliegue-cloudflare-pages` para el paso a
paso completo.

## Pendiente transversal (no bloquea el primer deploy)

- Autenticación: hoy no hay ninguna — cualquiera con la URL de la API
  puede leer/escribir cualquier negocio. Aceptable a corto plazo con dos
  usuarios de confianza (papá y vecina), pero hay que volver sobre esto.
- CORS del backend debe incluir el dominio real de Cloudflare Pages una
  vez que exista (`*.pages.dev` o el dominio propio), no solo `localhost`.
