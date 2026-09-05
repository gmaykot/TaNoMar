# Arquitetura

## Visão geral

```text
apps/web                         React + TypeScript + Vite + PWA
apps/api/TaNoMar.Api             ASP.NET Core + EF Core + PostgreSQL
docs                             Decisões, contratos e guias
```

Web e API estão no mesmo repositório, mas não compartilham código-fonte.

## Frontend

> Page orquestra. Component renderiza. Hook coordena. Service acessa dados.

```text
Page → feature hook → feature service → HTTP + mapper
Page → feature/design-system components → tokens CSS
```

- `apps/web/src/app`: providers, rotas, shell e ciclo PWA.
- `apps/web/src/design-system`: tokens, marca e componentes sem regra de pesca.
- `apps/web/src/features`: domínio, hooks, services, mappers e componentes por feature.
- `apps/web/src/pages`: composição e estado exclusivo da rota.
- `apps/web/src/shared`: cliente HTTP e utilitários com mais de um consumidor real.

Os services chamam `/api/v1`, validam DTOs de wire e mapeiam para os tipos da UI. Componentes não fazem `fetch` e não calculam a nota.

## Backend

- `Auth`: emissão e validação de tokens.
- `Data`: DbContext, entidades, seed, auditoria, regras de visibilidade e migrations.
- `Fishing`: Open-Meteo, cache em memória com snapshot no PostgreSQL, previsão e fórmula da nota. A consulta segue memória → `FishingForecastSnapshots` (mesmo TTL de `Fishing:CacheHours`) → Open-Meteo. Snapshot com horas é reutilizado mesmo sem maré: a Open-Meteo costuma devolver `sea_level_height_msl` nulo nesta costa, e isso não invalida o cache. A maré, quando existe, sai da mesma série: a API detecta mínimos/máximos locais (preamar/baixa-mar) e a inclinação da curva (enchente/vazante). O `FishingForecastWarmupWorker` aquece oficiais e compartilhados aprovados (dias 0–7) para gravar cache e snapshot fora do request.
- `Models`: contratos existentes.
- `Options`: configuração da aplicação.
- `Notifications`: hub SSE em memória e worker de Web Push (VAPID). Sem fila externa; um container.
- `Program.cs`: DI, middleware, worker de aquecimento e endpoints Minimal API sob `/api/v1`.

Namespaces, assembly e tipos técnicos usam `TaNoMar.Api`. Identificadores de runtime estáveis (seção `TaNoMar`, cookie, caminhos persistentes) estão catalogados em `docs/api-contracts.md`.

## Integração

Localmente, web e API são processos independentes: Vite executa o React em HTTP (`--host`) com proxy de `/api` para `http://127.0.0.1:5000`, e sobe HTTPS extra na porta seguinte para o PWA instalar no celular via `<ip>.nip.io`. `dotnet run` executa a API com `ASPNETCORE_ENVIRONMENT=Development`. Docker não participa do desenvolvimento local. A API recebe `ConnectionStrings__Default` pelo ambiente e conecta a um PostgreSQL externo; o repositório não provisiona banco.

A sessão usa Google Sign-In. O access token fica só em memória; o refresh token segue no cookie HttpOnly `tanomar_refresh`. Endpoints autenticados não entram no cache do service worker.

## Produção

Em produção, o Coolify usa `docker-compose.yml` e o Dockerfile em `apps/api/TaNoMar.Api/Dockerfile`. O build do web (`apps/web`) é compilado no estágio Node, copiado para `wwwroot/` e servido pela API junto com `/api/v1`. A imagem contém somente a aplicação; o PostgreSQL continua externo.

Detalhes de configuração, variáveis e troubleshooting: [deployment.md](deployment.md).
