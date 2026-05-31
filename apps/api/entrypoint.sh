#!/bin/sh
# Hirex API entrypoint
# - Uses the PaaS-injected $PORT, fallback 5050 for local docker run
# - `exec` so uvicorn becomes PID 1 (proper signal handling on SIGTERM)
set -e
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-5050}"
