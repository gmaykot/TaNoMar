FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY services/tanomar-whatsapp/package*.json ./
COPY services/tanomar-whatsapp/.npmrc ./
COPY services/tanomar-whatsapp/vendor ./vendor
# Isola o npm dos ARG/segredos que o Coolify injeta no estágio.
# Sem isso, tokens com $ & ! * ^ e o NODE_ENV de produção quebram o install.
# libsignal vem de vendor/; o npm não clona o GitHub.
RUN env -i \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    HOME="/root" \
    NODE_ENV=development \
    npm ci --include=dev \
    || (echo "--- vendor ---" && ls -la vendor vendor/libsignal && echo "--- npm log ---" && cat /root/.npm/_logs/*.log && exit 1)
COPY services/tanomar-whatsapp/tsconfig.json ./
COPY services/tanomar-whatsapp/src ./src
RUN env -i \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    HOME="/root" \
    NODE_ENV=development \
    npm run build \
    && env -i \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    HOME="/root" \
    NODE_ENV=production \
    npm prune --omit=dev

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
