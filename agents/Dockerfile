# Hermes runtime (FastAPI) — imagen aislada.
# El codigo se COPIA dentro de la imagen; no se montan volúmenes del host,
# de modo que el contenedor nunca toca los archivos locales del desarrollador.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Instalar solo dependencias de runtime (sin extras [dev]).
COPY pyproject.toml ./
COPY app ./app
COPY hermes ./hermes
RUN pip install .

EXPOSE 8000

# Usuario sin privilegios.
RUN useradd --create-home --uid 10001 hermes && chown -R hermes:hermes /app
USER hermes

# Railway inyecta $PORT; local (docker compose) cae a 8000.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
