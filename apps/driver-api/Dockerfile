# syntax=docker/dockerfile:1
FROM node:20.20.2-alpine AS build
WORKDIR /app
COPY ./package.json ./package-lock.json ./nx.json ./tsconfig.base.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
COPY ./apps/driver-api ./apps/driver-api
COPY ./libs/database ./libs/database
RUN npx nx build driver-api --prod

FROM node:20.20.2-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/driver-api/package.json ./
RUN --mount=type=cache,target=/root/.npm npm i --legacy-peer-deps
RUN --mount=type=cache,target=/root/.npm npm i pg
COPY --from=build /app/dist/apps/driver-api ./
EXPOSE 3002
CMD ["node", "main.js"]