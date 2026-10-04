# -------- base deps --------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /app

# -------- deps install (cached) --------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --ignore-scripts

# -------- build --------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BASE_PATH=/
ENV BASE_PATH=$BASE_PATH
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm prepare && pnpm build

# -------- runtime --------
FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates util-linux \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts/accounts ./scripts/accounts
COPY --from=build /app/src/lib/migrations ./src/lib/migrations
COPY --from=build /app/src/lib/auth/types.ts /app/src/lib/auth/password.server.ts /app/src/lib/auth/users.server.ts /app/src/lib/auth/data-state.server.ts ./src/lib/auth/
COPY --from=build /app/src/lib/server/atomic-file.ts /app/src/lib/server/data-dir.ts ./src/lib/server/

EXPOSE 3000
ENTRYPOINT ["sh", "scripts/accounts/entrypoint.sh"]
CMD ["node", "--experimental-strip-types", "scripts/accounts/start.ts"]
