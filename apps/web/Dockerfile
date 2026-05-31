# Hirex Web — Vite + React + AntD + Three.js
#
# Multi-stage:
#   build  — Node + pnpm → build into dist/
#   serve  — nginx:alpine serving the static build with SPA fallback
#
# Final image is ~25MB (nginx-alpine + dist).

# ───────────────────────────────────────────────────────────────
# Stage 1: build
# ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Enable corepack so pnpm picks up the exact version pinned in package.json
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

# Install deps first for caching
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Build
COPY . .
# VITE_API_URL is injected at build time — pass via --build-arg
ARG VITE_API_URL=http://localhost:5050
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# ───────────────────────────────────────────────────────────────
# Stage 2: serve
# ───────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS serve

# Configuration:
# - nginx-main.conf overrides /etc/nginx/nginx.conf so worker_processes=1
#   (Railway containers see the host's 44+ CPUs and would spawn one worker
#   each, OOM-killing the 512 MB service).
# - nginx.conf is copied directly to conf.d (NOT a template). It hardcodes
#   listen 80 + listen [::]:80 so we serve on the port Railway expects
#   regardless of any $PORT env injection.
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=4s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
