# syntax=docker/dockerfile:1
# The TDL App server. Build from the repository root:
#   docker build --file apps/server/Dockerfile .
# See docs/self-hosting.md.

FROM node:26-slim AS build
WORKDIR /repo
# pnpm at the version in package.json's packageManager (node:26 no longer ships Corepack).
COPY package.json ./
RUN npm install --global "$(node --print 'require("./package.json").packageManager')"
COPY . .
RUN pnpm install --frozen-lockfile
# Node won't strip types from files under node_modules, which is where `pnpm deploy` puts the
# workspace packages, so compile them to JavaScript. The runtime selects that build with the
# `tdl-compiled` export condition (NODE_OPTIONS below).
RUN pnpm --filter @tdl/domain --filter @tdl/sync run build
RUN pnpm --filter @tdl/server deploy --prod /deploy

FROM node:26-slim
ENV NODE_ENV=production \
    NODE_OPTIONS=--conditions=tdl-compiled \
    PORT=3000
WORKDIR /app
COPY --from=build /deploy/package.json ./
COPY --from=build /deploy/node_modules ./node_modules
COPY --from=build /deploy/drizzle ./drizzle
COPY --from=build /deploy/src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s --retries=3 \
  CMD ["node", "--eval", "fetch(`http://127.0.0.1:${process.env.PORT}/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/main.ts"]
