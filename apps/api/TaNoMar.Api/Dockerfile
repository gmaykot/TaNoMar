# Imagem exclusiva de produção no Coolify; o PostgreSQL é externo ao container.
FROM node:24-alpine AS web-build
WORKDIR /src/web
COPY apps/web/package*.json ./
RUN npm install --no-audit --no-fund
COPY apps/web/ ./
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY apps/api/TaNoMar.Api/ ./
COPY --from=web-build /src/web/dist/ ./wwwroot/
RUN dotnet publish TaNoMar.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 tanomar \
    && install -d -o tanomar -g tanomar /var/lib/tanomar /app
COPY --from=build /app/publish .
RUN chown -R tanomar:tanomar /app /var/lib/tanomar
USER tanomar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:8080/api/health > /dev/null || exit 1
ENTRYPOINT ["dotnet", "TaNoMar.Api.dll"]
