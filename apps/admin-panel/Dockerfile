# syntax=docker/dockerfile:1
FROM node:20.20.2-alpine AS build
WORKDIR /app
ARG MAPBOX_TOKEN=""
COPY ./package.json ./package-lock.json ./nx.json ./tsconfig.base.json ./
RUN npm ci --legacy-peer-deps
COPY ./apps/admin-panel ./apps/admin-panel
# Injecte le token Mapbox au build depuis un ARG (jamais versionne dans environment.prod.ts,
# voir .env / MAPBOX_TOKEN). Sans valeur fournie, le placeholder vide reste : build OK, carte muette.
RUN if [ -n "$MAPBOX_TOKEN" ]; then \
      sed -i "s#mapboxToken: \"\"#mapboxToken: \"$MAPBOX_TOKEN\"#" apps/admin-panel/src/environments/environment.prod.ts; \
    fi
RUN NODE_OPTIONS="--max-old-space-size=4096" npx nx build admin-panel --configuration production

FROM nginx:1.25.1-alpine
COPY ./apps/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/admin-panel /usr/share/nginx/html
