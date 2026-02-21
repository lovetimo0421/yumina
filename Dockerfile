FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

# ── Install dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/app/package.json packages/app/
RUN pnpm install --frozen-lockfile

# ── Build everything ──────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm build

# ── Production image ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/engine/dist packages/engine/dist
COPY --from=build /app/packages/server/dist packages/server/dist

# Copy built frontend into server's public dir
COPY --from=build /app/packages/app/dist packages/server/public

# Copy drizzle migrations + config for db:push at startup
COPY --from=build /app/packages/server/drizzle packages/server/drizzle
COPY --from=build /app/packages/server/drizzle.config.ts packages/server/
COPY --from=build /app/packages/server/src/db/schema.ts packages/server/src/db/schema.ts

ENV NODE_ENV=production
EXPOSE 3000

# Start the server
CMD ["node", "packages/server/dist/index.js"]
