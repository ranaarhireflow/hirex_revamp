# Hirex API — FastAPI + SQLAlchemy + OpenRouter (DeepSeek V3.1) + Postgres
#
# Single-stage slim image. ~180MB final.
# - psycopg[binary] ships its own libpq; no system libpq install needed.
# - $PORT respected so this works on Railway / Render / Fly / Cloud Run.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build-time deps for any pip packages that fall back to source.
# Kept minimal — psycopg[binary] avoids needing libpq-dev.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install Python deps first for better Docker layer caching.
COPY requirements.txt .
RUN pip install -r requirements.txt

# App code
COPY app ./app
COPY scripts ./scripts

# Non-root user for the runtime
RUN groupadd -r hirex && useradd --no-log-init -r -g hirex hirex \
 && chown -R hirex:hirex /app
USER hirex

# Default port; PaaS providers will override with $PORT
ENV PORT=5050
EXPOSE 5050

# Quick health probe — assumes /healthz route in app.main
HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/healthz" || exit 1

# Bind to all interfaces, use the platform's $PORT, single worker
# (Railway / Vercel-style platforms scale by replicas, not workers).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-5050}"]
