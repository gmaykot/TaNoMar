FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY services/tanomar-monitor/src/TaNoMar.Monitor/ ./
RUN dotnet publish TaNoMar.Monitor.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 tanomar-monitor \
    && mkdir -p /app/data \
    && chown -R tanomar-monitor:tanomar-monitor /app
COPY --from=build /app/publish .
RUN chown -R tanomar-monitor:tanomar-monitor /app
USER tanomar-monitor
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD curl --fail --silent http://127.0.0.1:8080/health/ready || exit 1
ENTRYPOINT ["dotnet", "TaNoMar.Monitor.dll"]
