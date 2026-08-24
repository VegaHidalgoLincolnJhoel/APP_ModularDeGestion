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

## 2. Backend — Render o Railway

Ambos funcionan igual para esto: detectan el `backend/Dockerfile` y
despliegan el contenedor directo, sin build manual.

1. Crear el servicio apuntando a este repo, carpeta raíz `backend/`
   (ahí vive el `Dockerfile`).
2. Variables de entorno del servicio:
   - `DATABASE_URL`: el connection string de Neon del paso 1.
   - `JWT_SECRET_KEY`: generar uno propio para producción, nunca reusar el
     default de desarrollo (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
     Firma todos los tokens de sesión — si se filtra o queda con el default,
     cualquiera puede forjar un token válido.
   - `CORS_ORIGINS`: el dominio de Cloudflare Pages del paso 3. Como
     todavía no existe en este punto del orden de despliegue, se puede
     arrancar con un valor provisorio y actualizarlo (sin rebuild, ver
     `../backend/README.md#despliegue`) apenas se tenga la URL real.
   - `ENV=production`.
3. Las migraciones corren solas al iniciar el contenedor — no hay paso
   manual contra Neon. Detalle y el límite de este approach (una sola
   instancia) en `../backend/README.md#despliegue`.
4. Correr una vez `python scripts/seed_admin_y_negocios.py` contra la DB
   de Neon (con `DATABASE_URL` apuntando ahí) para crear el admin y las
   credenciales de los dos negocios reales — guardar las contraseñas que
   imprime, no se vuelven a mostrar.
5. Copiar la URL pública que asigne la plataforma (`https://...onrender.com`
   o `https://....up.railway.app`) — es el valor de `VITE_API_URL` que
   necesita el frontend para el paso 3.

## 3. Frontend — Cloudflare Pages

Ver `../frontend/README.md#despliegue-cloudflare-pages` para el paso a
paso completo.

## Pendiente transversal (no bloquea el primer deploy)

- Auth: login con JWT ya implementado (`app/core/auth.py`), pero sin
  refresh token ni recuperación de contraseña — si alguien pierde la
  suya, la única salida hoy es que un admin la recree a mano.
- CORS del backend debe incluir el dominio real de Cloudflare Pages una
  vez que exista (`*.pages.dev` o el dominio propio), no solo `localhost`.
