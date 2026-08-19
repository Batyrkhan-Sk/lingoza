# Lingoza — one image serving the API, the Telegram webhook and the web SPA.
#
# Multi-stage: the build stage carries the full toolchain and dev dependencies,
# the runtime stage carries only production dependencies and compiled output,
# which keeps the deployed image small and its attack surface narrow.
#
# Debian-slim rather than Alpine: Prisma's query engine needs glibc/OpenSSL, and
# fighting musl builds on arm64 costs more than the ~40MB saved.

# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-slim AS build

# Prisma needs OpenSSL to pick and verify its query engine.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so `npm ci` is cached and only re-runs when deps change.
COPY package.json package-lock.json ./
COPY packages/engine/package.json  packages/engine/
COPY packages/content/package.json packages/content/
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/

RUN npm ci

COPY tsconfig.base.json ./
COPY prisma ./prisma
COPY packages ./packages
COPY apps ./apps

# The client must be generated before anything that imports it is compiled.
RUN npx prisma generate

RUN npm run build --workspace @lingoza/engine \
  && npm run build --workspace @lingoza/content \
  && npm run build --workspace @lingoza/api \
  && npm run build --workspace @lingoza/web

# ─── Stage 2: runtime ────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

# ffmpeg converts pronunciation audio to OGG/Opus, which is the only format
# Telegram renders as an inline voice note rather than a file attachment.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini ffmpeg \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/engine/package.json  packages/engine/
COPY packages/content/package.json packages/content/
COPY apps/api/package.json         apps/api/
COPY apps/web/package.json         apps/web/

# Production dependencies only. `tsx` and `prisma` are needed at runtime for the
# seed and for `migrate deploy`, so they are installed explicitly rather than
# dragging in every dev dependency.
RUN npm ci --omit=dev \
  && npm install --no-save prisma@6 tsx@4 \
  && npm cache clean --force

COPY --from=build /app/packages/engine/dist  ./packages/engine/dist
COPY --from=build /app/packages/content/dist ./packages/content/dist
COPY --from=build /app/apps/api/dist         ./apps/api/dist
COPY --from=build /app/apps/web/dist         ./public
COPY --from=build /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma  ./node_modules/@prisma
COPY prisma ./prisma
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh \
  # Run as the unprivileged user the base image already provides.
  && chown -R node:node /app

USER node
EXPOSE 4000

# tini reaps zombies and forwards signals, so SIGTERM reaches Node and Prisma
# disconnects cleanly instead of the container being killed after a timeout.
ENTRYPOINT ["/usr/bin/tini", "--", "./docker/entrypoint.sh"]
CMD ["node", "apps/api/dist/main.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
