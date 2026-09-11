FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY services/tanomar-whatsapp/package*.json ./
RUN npm ci
COPY services/tanomar-whatsapp/tsconfig.json ./
COPY services/tanomar-whatsapp/src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY services/tanomar-whatsapp/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /data/session && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
