# syntax=docker/dockerfile:1
# ArchFlow web app — build the Vite bundle, then serve it with Nginx.
# Nginx also reverse-proxies /api and /socket.io so the browser sees one origin.

FROM node:22-slim AS build

WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
