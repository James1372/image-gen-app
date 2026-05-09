FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA
RUN bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
RUN bun install --production --frozen-lockfile

EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "./build/index.js"]
