# syntax=docker/dockerfile:1.7

# -----------------------------
# Build Stage
# -----------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Build benötigt devDependencies + git
ENV NODE_ENV=development

# System dependencies + pnpm
RUN apk add --no-cache git \
 && npm install -g pnpm

# Install dependencies (cached layer)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source
COPY . .

# Build application (sapper export → static files)
RUN pnpm run build \
 && cp __sapper__/export/service-worker-index.html __sapper__/export/404.html

# -----------------------------
# Runtime Stage
# -----------------------------
FROM node:20-alpine

WORKDIR /app

# Copy only what the server needs at runtime
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/__sapper__/export ./__sapper__/export

ENV NODE_ENV=production PORT=4002

EXPOSE 4002

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4002/ >/dev/null || exit 1

CMD ["node", "server.js"]
