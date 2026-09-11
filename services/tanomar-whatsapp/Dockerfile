FROM node:22-bookworm-slim AS build

# Baileys depende de libsignal via GitHub. Sem git, `npm ci` falha;
# o lockfile local costuma gravar git+ssh, que o build não autentica.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git config --global url."https://github.com/".insteadOf "ssh://git@github.com/" \
    && git config --global url."https://github.com/".insteadOf "git@github.com:"

WORKDIR /app
COPY services/tanomar-whatsapp/package*.json ./
RUN npm ci
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
