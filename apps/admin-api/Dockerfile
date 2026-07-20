# syntax=docker/dockerfile:1
FROM node:20.20.2-alpine AS build
WORKDIR /app
COPY ./package.json ./package-lock.json ./nx.json ./tsconfig.base.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps

COPY ./apps/admin-api ./apps/admin-api
COPY ./libs/database ./libs/database

# Increase memory and limit TypeScript workers to prevent infinite type resolution
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV NX_PARALLEL=1
RUN npx nx build admin-api --prod --skip-nx-cache

FROM node:20.20.2-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/admin-api/package.json ./
RUN --mount=type=cache,target=/root/.npm npm i --legacy-peer-deps
RUN --mount=type=cache,target=/root/.npm npm i pg
COPY --from=build /app/dist/apps/admin-api ./
EXPOSE 3000
CMD ["node", "main.js"]
