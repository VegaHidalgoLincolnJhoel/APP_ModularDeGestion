FROM python:3.12-slim

WORKDIR /app

# psycopg2-binary ya trae los binarios de libpq compilados, así que no hace
# falta instalar libpq-dev ni gcc en la imagen — mantiene el build simple.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render y Railway levantan el contenedor e inyectan PORT en runtime (no es
# fijo de antemano), por eso el CMD va en shell form: así se expande la
# variable de entorno. Corre las migraciones antes de arrancar el server —
# ver docs/DEPLOY.md para el porqué de esta decisión y su límite (una sola
# instancia corriendo a la vez).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
