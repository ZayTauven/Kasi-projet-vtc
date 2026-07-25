# syntax=docker/dockerfile:1
FROM node:20.20.2-alpine AS build
WORKDIR /app
COPY ./package.json ./package-lock.json ./nx.json ./tsconfig.base.json ./
COPY ./patches ./patches
COPY ./tools ./tools
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
COPY ./apps/rider-api ./apps/rider-api
COPY ./libs/database ./libs/database
RUN npx nx build rider-api --prod

FROM node:20.20.2-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/rider-api/package.json ./
RUN --mount=type=cache,target=/root/.npm npm i --legacy-peer-deps
RUN --mount=type=cache,target=/root/.npm npm i pg
# Ce npm i final (a partir du package.json genere par Nx, sans patches/ ni
# postinstall) reinstalle @ptc-org/nestjs-query-typeorm NON patche. On ecrase
# avec la copie deja patchee du stage de build (meme version, meme lockfile)
# pour que le patch patches/@ptc-org+nestjs-query-typeorm+9.5.0.patch
# s'applique reellement au runtime, pas seulement a la compilation.
COPY --from=build /app/node_modules/@ptc-org/nestjs-query-typeorm ./node_modules/@ptc-org/nestjs-query-typeorm
COPY --from=build /app/dist/apps/rider-api ./
EXPOSE 3001
CMD ["node", "main.js"]