FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY services/tanomar-whatsapp/package*.json ./
COPY services/tanomar-whatsapp/vendor ./vendor
# Baileys puxa libsignal do GitHub via git/SSH. O Coolify não autentica isso
# e `npm ci` sai com código 1. O tarball em vendor/ evita git no build.
# --include=dev cobre o caso do Coolify injetar NODE_ENV=production como ARG.
RUN npm ci --include=dev --no-audit --no-fund
COPY services/tanomar-whatsapp/tsconfig.json ./
COPY services/tanomar-whatsapp/src ./src
RUN npm run build \
    && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/session && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
