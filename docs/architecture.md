# Arquitetura

## Visão geral

```text
apps/web                         React + TypeScript + Vite + PWA
apps/api/TaNoMar.Api             ASP.NET Core + EF Core + PostgreSQL
services/tanomar-whatsapp        Node.js + Baileys
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
- `/` carrega a landing pública; o roteador de sessão e as páginas autenticadas são carregados sob demanda a partir de `/entrar` ou de uma rota interna. A home do aplicativo fica em `/app`.
- O shell exibe a confirmação global disparada pelos fluxos que salvam cadastros e configurações.
- `apps/web/src/design-system`: tokens, marca e componentes sem regra de pesca.
- `apps/web/src/features`: domínio, hooks, services, mappers e componentes por feature.
- `apps/web/src/pages`: composição e estado exclusivo da rota.
- `apps/web/src/shared`: cliente HTTP e utilitários com mais de um consumidor real.

Os services chamam `/api/v1`, validam DTOs de wire e mapeiam para os tipos da UI. Componentes não fazem `fetch` e não calculam a nota. A preferência `focus` só altera o que a web mostra e depende de `features.showAppFocus`.

## Backend

- `Auth`: emissão e validação de tokens.
- `Data`: DbContext, entidades, seed, auditoria, regras de visibilidade e migrations.
- `Fishing`: Open-Meteo, Tábua de Maré API, Geoapify Autocomplete (proxy autenticado de busca de lugares no cadastro de locais), cache em memória com snapshot no PostgreSQL, previsão e fórmula da nota. A consulta segue memória → `FishingForecastSnapshots`; miss ou dado velho entra numa fila interna limitada e a resposta devolve imediatamente o que estiver disponível. Snapshots expirados pelo TTL normal ainda podem ser usados por até `Fishing:MaxStaleHours` durante indisponibilidade externa. O worker consulta Weather, GFS e Marine em paralelo, agrupa coordenadas por `Fishing:RefreshBatchSize`, limita lotes concorrentes por `Fishing:RefreshConcurrency` e grava os oito dias do lote em uma transação. A tábua é enriquecida numa fila separada para não atrasar tempo, mar, pressão e nota. `GET /forecasts/ranking` e `GET /fishing-spots/{id}/forecast` informam o estado real em `refresh`; o detalhe processa somente o local solicitado. Logs registram fonte, tamanho do lote, duração, falhas e fila restante. A preferência de vento ideal é armazenada em `EnabledSpots` por usuário e local; quando `Plans.CanCustomWind` está ligado, a API reaplica somente a parcela direcional da nota sobre as horas normalizadas, sem alterar o snapshot compartilhado.
- `Models`: contratos existentes.
- `Options`: configuração da aplicação.
- `Notifications`: hub SSE em memória, worker de Web Push (VAPID), worker horário de alertas de previsão e fila interna de avisos administrativos. O dispatcher tenta e-mail via Resend e WhatsApp independentemente, depois do commit da operação; falha de um canal não impede o outro. Alertas são persistidos em `ForecastAlerts` e respeitam as preferências de notificação.
- `Billing`: cliente Asaas, catálogo, checkout, webhook, cancelamento e worker do período.
- `Webcams`: `WebcamService` autoriza e vincula; `WebcamProviderCatalog` resolve o provider por `Provider` + `ExternalId`; `WindyWebcamProvider` pesquisa por proximidade; `YouTubeWebcamProvider` consulta live pelo link (só admin) e, se o vídeo já encerrou, lista as lives do canal. Câmeras parceiras futuras usariam `PartnerWebcamProvider` (não implementado). O admin liga ou desliga a feature em `/admin` (`PlatformSettings.ShowLiveWebcams`) e vincula câmera em `/admin/locais-sistema`. Ver [features/webcams.md](features/webcams.md).
- `Program.cs`: DI, middleware, worker de aquecimento e endpoints Minimal API sob `/api/v1`.

Namespaces, assembly e tipos técnicos usam `TaNoMar.Api`. Identificadores de runtime estáveis (seção `TaNoMar`, cookie, caminhos persistentes) estão catalogados em `docs/api-contracts.md`.

## Integração

Localmente, web e API são processos independentes: Vite executa o React em HTTP (`--host`) com proxy de `/api` para `http://127.0.0.1:5000`, e sobe HTTPS extra na porta seguinte para o PWA instalar no celular via `<ip>.nip.io`. `dotnet run` executa a API com `ASPNETCORE_ENVIRONMENT=Development`. Docker não participa do desenvolvimento local. A API recebe `ConnectionStrings__Default` pelo ambiente e conecta a um PostgreSQL externo; o repositório não provisiona banco.

Quando habilitado, `services/tanomar-whatsapp` executa separadamente e recebe somente chamadas internas autenticadas da API. Baileys e suas credenciais não entram na API nem no frontend; `IWhatsAppGateway` mantém o adapter substituível.

A sessão usa Google Sign-In. O access token fica só em memória; o refresh token segue no cookie HttpOnly `tanomar_refresh`. Endpoints autenticados não entram no cache do service worker.

Cobrança da assinatura: Checkout hospedado do Asaas, só cartão, Arrais/Mestre/Capitão em mensal ou anual (−20%). O preço mensal de tabela vive em `Plans`. Reajuste de tabela não cobra a diferença no meio do período já pago; a renovação anual e a próxima fatura mensal usam o catálogo novo. Upgrade começa na hora com desconto proporcional. Cancelar a recorrência não estorna. Ver [billing.md](billing.md) e [ADR-004](decisions/ADR-004-asaas-checkout.md).

## Produção

Em produção, o Coolify usa `docker-compose.yml`. O container principal usa `apps/api/TaNoMar.Api/Dockerfile`: compila o web, copia para `wwwroot/` e serve a PWA junto com `/api/v1`. O adapter usa `services/tanomar-whatsapp/Dockerfile`, fica somente na rede interna e persiste a sessão em volume próprio. O PostgreSQL continua externo.

Detalhes de configuração, variáveis e troubleshooting: [deployment.md](deployment.md).
