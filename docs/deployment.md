# Deploy no Coolify

Guia de implantação em produção. O desenvolvimento local **não usa Docker** — execute React e .NET diretamente (ver [README.md](../README.md)).

## Modelo de deploy

PWA e API continuam no **mesmo container** e na **mesma origem**. O adapter Baileys sobe em um segundo container, somente na rede interna do compose; não há serviço `web` separado nem nginx dedicado.

```text
Coolify
  └── docker-compose.yml (raiz)
        ├── serviço tanomar
        │     ├── build: apps/api/TaNoMar.Api/Dockerfile
        │     │     ├── estágio 1 — npm run build (apps/web)
        │     │     ├── estágio 2 — dotnet publish + wwwroot/
        │     │     └── estágio 3 — imagem aspnet final
        │     └── runtime: TaNoMar.Api.dll na porta 8080
        │           ├── /              → landing pública (React estático)
        │           ├── /app           → início autenticado do PWA
        │           ├── /ranking, …    → SPA (React Router)
        │           └── /api/v1/*      → endpoints da API
        └── serviço tanomar-whatsapp
              ├── Node.js + Baileys na porta interna 3000
              └── /data/session → volume persistente
```

O PostgreSQL é **sempre externo**. O repositório não provisiona banco — configure `ConnectionStrings__Default` apontando para o serviço gerenciado.

### Por que web e API no mesmo container?

- **Mesma origem** — evita CORS; cookies de refresh funcionam sem proxy extra.
- **Adapter isolado** — Baileys e a sessão do WhatsApp não entram no processo da API.
- **Padrão ASP.NET** — `UseStaticFiles()` serve o build do Vite a partir de `wwwroot/`.

Alterações no frontend exigem **rebuild da imagem inteira** (web + API). Isso é esperado neste modelo.

## Arquivos envolvidos

| Arquivo | Função |
| --- | --- |
| `docker-compose.yml` | Orquestra a aplicação e o adapter WhatsApp no Coolify |
| `apps/api/TaNoMar.Api/Dockerfile` | Build multi-stage (web + API) |
| `services/tanomar-whatsapp/Dockerfile` | Build do adapter Node.js + Baileys |
| `.env.example` | Template de variáveis para validação local |
| `.dockerignore` | Exclui artefatos desnecessários do contexto de build |

## Configuração no Coolify

1. Crie um recurso **Docker Compose** apontando para este repositório.
2. Defina o caminho do compose: `docker-compose.yml` (raiz).
3. Configure as variáveis de ambiente (ver tabela abaixo).
4. Preserve `tanomar-data` para o log de auditoria e `tanomar-whatsapp-data` para a autenticação do WhatsApp.
5. Configure domínio e HTTPS no proxy do Coolify (porta interna do container **8080**). A porta publicada no host padrão é **8082** (`TANOMAR_PORT`), para não colidir com outro serviço na 8080.

### Domínio raiz, www e URL canônica

Cadastre o domínio raiz e o subdomínio `www` no mesmo recurso do Coolify, ambos apontando para a porta interna `8080`. O fallback da SPA entrega a landing em `/` nos dois hosts. No DNS, o domínio raiz deve apontar para o servidor do Coolify e `www` pode ser um CNAME para o domínio raiz.

A landing define o domínio raiz como canônico: ao abrir por `www`, o `canonical`, `og:url` e os dados estruturados removem esse prefixo. Se o proxy permitir escolher um domínio principal, configure o domínio raiz como principal e redirecione `www` permanentemente para ele; mesmo sem esse redirecionamento, a landing continua acessível nos dois endereços. Configure também `PUBLIC_APP_ORIGIN=https://<domínio-raiz>` para os callbacks da cobrança.

`robots.txt` é publicado pelo frontend. O repositório não gera `sitemap.xml` enquanto o domínio de produção não estiver definido em configuração versionada; após definir o domínio, publique um sitemap com a URL canônica `/` no proxy ou como asset do frontend.

### Variáveis obrigatórias

| Variável Coolify | Destino | Uso |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | build: `VITE_GOOGLE_CLIENT_ID` | Bundle do PWA (login Google) |
| `GOOGLE_CLIENT_ID` | runtime: `TaNoMar__GoogleClientId` | Validação server-side do token Google |
| `JWT_KEY` | runtime: `TaNoMar__JwtKey` | Assinatura dos access tokens JWT |
| `ConnectionStrings__Default` | runtime | Connection string do PostgreSQL externo |
| `WHATSAPP_API_KEY` | API e `tanomar-whatsapp` | Token interno longo, igual nos dois containers; obrigatório no compose. |

### Variáveis opcionais

| Variável | Destino | Uso |
| --- | --- | --- |
| `BOOTSTRAP_ADMIN_EMAIL` | `TaNoMar__BootstrapAdminEmail` | E-mail do admin inicial (role Admin; no primeiro login entra no Mestre) |
| `BOOTSTRAP_ADMIN_GOOGLE_SUBJECT` | `TaNoMar__BootstrapAdminGoogleSubject` | Claim `sub` do Google do admin inicial — não é o e-mail |
| `Fishing__WarmupEnabled` | `Fishing:WarmupEnabled` | Worker que aquece previsão (padrão `true`) |
| `Fishing__WarmupIntervalHours` | `Fishing:WarmupIntervalHours` | Idade máxima da previsão antes de renovar (padrão `3`). Também é o intervalo do worker. |
| `Fishing__CacheHours` | `Fishing:CacheHours` | TTL normal do snapshot (padrão configurado `6`). |
| `Fishing__MaxStaleHours` | `Fishing:MaxStaleHours` | Janela máxima para servir o último snapshot durante atualização ou falha externa (padrão `12`). |
| `Fishing__RefreshBatchSize` | `Fishing:RefreshBatchSize` | Coordenadas por lote Open-Meteo (padrão `10`). |
| `Fishing__RefreshConcurrency` | `Fishing:RefreshConcurrency` | Lotes processados em paralelo (padrão `2`). |
| `Fishing__RefreshQueueCapacity` | `Fishing:RefreshQueueCapacity` | Capacidade máxima da fila interna deduplicada (padrão `256`). |
| `OPEN_METEO_API_KEY` | `Fishing:OpenMeteoApiKey` | Chave opcional para endpoint contratado da Open-Meteo. |
| `OPEN_METEO_WEATHER_BASE_URL`, `OPEN_METEO_GFS_BASE_URL`, `OPEN_METEO_MARINE_BASE_URL` | propriedades `Fishing:OpenMeteo*BaseUrl` | Hosts opcionais da Open-Meteo; os padrões usam os endpoints públicos. |
| `TANOMAR_PORT` | compose `ports` | Porta do host no Coolify (padrão `8082`). A API continua em `8080` dentro do container. |
| `VAPID_PUBLIC_KEY` | `TaNoMar__VapidPublicKey` | Chave pública Web Push. Sem ela o toggle de aparelho some; inbox e SSE seguem. |
| `VAPID_PRIVATE_KEY` | `TaNoMar__VapidPrivateKey` | Chave privada Web Push. Gere o par com `npx web-push generate-vapid-keys`. |
| `VAPID_SUBJECT` | `TaNoMar__VapidSubject` | Contato VAPID (`mailto:` ou URL HTTPS). |
| `TABUA_MARE_API_KEY` | `Fishing:TabuaMareApiKey` | Chave opcional da Tábua de Maré API. Sem ela vale o limite anônimo (16 req/min). |
| `GEOAPIFY_API_KEY` | `Fishing:GeoapifyApiKey` | Chave da Autocomplete API da Geoapify no cadastro de locais. Sem ela a busca devolve lista vazia e o formulário continua em texto livre. |
| `WINDY_WEBCAMS_API_KEY` | `Webcams:WindyApiKey` | Chave da Windy Webcams API v3. Sem ela o app sobe; a pesquisa de câmeras próximas responde `503`. |
| `YOUTUBE_API_KEY` | `Webcams:YouTubeApiKey` | Chave da YouTube Data API v3. Sem ela o app sobe; a consulta admin de live no YouTube responde `503`. |
| `Webcams__SearchRadiusKm` | `Webcams:SearchRadiusKm` | Raio da pesquisa (km), padrão `10`, máximo `250`. |
| `Webcams__AvailabilityCacheMinutes` | `Webcams:AvailabilityCacheMinutes` | Intervalo do cache de disponibilidade/embed, padrão `15`. |
| `ASAAS_API_KEY` | `Billing:AsaasApiKey` | Chave da API Asaas. Sem ela o checkout some e `/premium` permanece vitrine. No Coolify cole **sem o `$` inicial** (`aact_prod_...`): o Compose trata `$aact_...` como variável e envia a chave vazia. A API recoloca o `$`. |
| `ASAAS_BASE_URL` | `Billing:AsaasBaseUrl` | Produção `https://api.asaas.com/v3`; sandbox `https://api-sandbox.asaas.com/v3`. O compose já usa produção se a variável faltar. |
| `ASAAS_WEBHOOK_TOKEN` | `Billing:AsaasWebhookToken` | Token do header `asaas-access-token`. Diferente da API key. |
| `PUBLIC_APP_ORIGIN` | `Billing:PublicAppOrigin` | Origem HTTPS dos callbacks do checkout (`/premium?checkout=`). |
| `RESEND_API_KEY` | `Resend:ApiKey` | Chave da API Resend. Sem a configuração completa, os avisos por e-mail ficam desativados. |
| `RESEND_FROM_EMAIL` | `Resend:FromEmail` | Remetente em um domínio verificado no Resend. |
| `RESEND_FROM_NAME` | `Resend:FromName` | Nome do remetente (padrão `TáNoMar`). |
| `RESEND_NOTIFICATION_EMAIL` | `Resend:NotificationEmail` | Destinatário dos avisos de novo usuário e nova solicitação de plano. Se omitido, usa `BOOTSTRAP_ADMIN_EMAIL`. |
| `WHATSAPP_ENABLED` | `WhatsApp:Enabled` | Habilita o canal na API. Padrão `false`; a tela Admin ainda exige ativação e destino. |
| `WHATSAPP_INSTANCE_NAME` | adapter Node | Nome do aparelho em produção, padrão `TaNoMar`. O adapter local usa `TaNoMar-Local` e sessão própria; não copie a pasta de sessão entre ambientes. |

A vitrine de parceiros não usa mais variável de ambiente. O admin liga ou desliga em `/admin/parceiros`; o valor fica em `PlatformSettings`.

O preço da assinatura não usa variável de ambiente: o admin edita `Plans.MonthlyPriceCents` em `/admin/planos`.

> A seção de configuração da API é `TaNoMar` e o prefixo de ambiente é `TaNoMar__`. Detalhes em [api-contracts.md](api-contracts.md#identificadores-de-runtime).

### Volume persistente

O volume `tanomar-data` monta em `/var/lib/tanomar` e guarda o log de auditoria (`/var/lib/tanomar/audit.jsonl`). Sem o volume, a auditoria some a cada redeploy.

O volume `tanomar-whatsapp-data` monta em `/data` no adapter. A sessão fica em `/data/session`; com o volume preservado, restart e redeploy não exigem novo QR Code. Desconectar pela tela Admin encerra a sessão e limpa essa pasta intencionalmente.

O cache de previsão fica em memória no processo da API e em snapshots no PostgreSQL (`FishingForecastSnapshots`). `Fishing:CacheHours` é o TTL normal; `Fishing:MaxStaleHours` limita o fallback exibido durante atualização ou falha externa. Misses e entradas velhas entram numa fila interna deduplicada: a requisição responde com dados disponíveis e o frontend acompanha `refresh`. O worker agrupa coordenadas, consulta Weather, GFS e Marine em paralelo e grava os oito dias em lote; a tábua é completada por outra fila e não atrasa a previsão principal. O `FishingForecastWarmupWorker` reidrata a memória a partir de `FishingForecastSnapshots` e só enfileira oficiais e compartilhados aprovados que estejam ausentes ou velhos (`Fishing:WarmupIntervalHours`). Snapshot fresco sem tábua vai só para a fila de maré. Cadastro, aprovação, reativação e mudanças dos dados que afetam a previsão também enfileiram o local sem aguardar rede externa. Desligue o agendamento periódico com `Fishing__WarmupEnabled=false`.

## Healthcheck

O container principal expõe `GET /api/health`. O adapter expõe `GET /health` somente na rede interna. O compose verifica os dois.

```bash
curl --fail --silent http://127.0.0.1:8080/api/health
```

## Validação local

Com Docker Desktop ativo:

```bash
cp .env.example .env
# preencha GOOGLE_CLIENT_ID, JWT_KEY e ConnectionStrings__Default

docker compose config
docker compose build
docker compose up
```

Acesse `http://127.0.0.1:8082` (porta padrão publicada no host). O healthcheck e o proxy do Coolify usam a porta interna `8080`.

Build direto da imagem (sem compose):

```bash
docker build -f apps/api/TaNoMar.Api/Dockerfile -t tanomar \
  --build-arg VITE_GOOGLE_CLIENT_ID=<seu-client-id> .
```

## Desenvolvimento vs produção

| Aspecto | Local | Produção (Coolify) |
| --- | --- | --- |
| Frontend | Vite dev server (`npm run dev`) | Arquivos estáticos em `wwwroot/` |
| API | `dotnet run` | `dotnet TaNoMar.Api.dll` |
| Docker | Não usado | `docker-compose.yml` |
| PostgreSQL | Externo (env var) | Externo (env var) |
| Porta | 5173 (web) + 5000/8080 (API) | host `8082` → container `8080` |

## Troubleshooting

**Build falha no `npm ci` do WhatsApp** — o Baileys declara `libsignal` via GitHub (`git+ssh`/`git+https`). O npm tenta `ls-remote` por SSH e o Coolify sai com código 1. O adapter instala `libsignal` do tarball em `services/tanomar-whatsapp/vendor/` e o Dockerfile copia essa pasta antes do `npm ci`. Não rode `npm ci` de novo no estágio final: copie `node_modules` já podado.

**Compose avisa `The "Rt6" variable is not set`** — algum segredo no Coolify contém `$Rt6` (comum em `ASAAS_API_KEY` e tokens longos). O Compose interpola `$nome` e esvazia aquele trecho. Cole a chave Asaas **sem** o `$` inicial (`aact_prod_...`) e, em qualquer outro valor, escape `$` como `$$`.

**Build falha no estágio web** — verifique `GOOGLE_CLIENT_ID` como build arg; o Vite embute essa variável no bundle.

**Container sobe mas retorna 500** — confira `ConnectionStrings__Default` e se o PostgreSQL aceita conexões do host do Coolify.

**PWA carrega mas API falha** — normalmente variável de ambiente ausente (`JWT_KEY` ou connection string).

**Sessões não persistem após redeploy** — confirme que o volume `tanomar-data` está ativo no Coolify.

**Assinatura sem botão de checkout** — `GET /billing/catalog` vem com `enabled: false` quando `ASAAS_API_KEY` não chegou na API. No Coolify as quatro variáveis são `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_WEBHOOK_TOKEN` e `PUBLIC_APP_ORIGIN`. A chave deve ir **sem** o `$` (`aact_prod_...`). Depois, redeploy.
