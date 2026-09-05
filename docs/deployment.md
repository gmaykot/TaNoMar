# Deploy no Coolify

Guia de implantação em produção. O desenvolvimento local **não usa Docker** — execute React e .NET diretamente (ver [README.md](../README.md)).

## Modelo de deploy

TáNoMar sobe como **um único container** que entrega PWA e API na **mesma origem**. Não há serviço `web` separado no compose nem nginx dedicado.

```text
Coolify
  └── docker-compose.yml (raiz)
        └── serviço tanomar
              ├── build: apps/api/TaNoMar.Api/Dockerfile
              │     ├── estágio 1 — npm run build (apps/web)
              │     ├── estágio 2 — dotnet publish + wwwroot/
              │     └── estágio 3 — imagem aspnet final
              └── runtime: TaNoMar.Api.dll na porta 8080
                    ├── /              → PWA (React estático)
                    ├── /ranking, …    → SPA (React Router)
                    └── /api/v1/*      → endpoints da API
```

O PostgreSQL é **sempre externo**. O repositório não provisiona banco — configure `ConnectionStrings__Default` apontando para o serviço gerenciado.

### Por que web e API no mesmo container?

- **Mesma origem** — evita CORS; cookies de refresh funcionam sem proxy extra.
- **Deploy simples** — um serviço no Coolify, um healthcheck, um volume de dados.
- **Padrão ASP.NET** — `UseStaticFiles()` serve o build do Vite a partir de `wwwroot/`.

Alterações no frontend exigem **rebuild da imagem inteira** (web + API). Isso é esperado neste modelo.

## Arquivos envolvidos

| Arquivo | Função |
| --- | --- |
| `docker-compose.yml` | Orquestra o serviço `tanomar` para o Coolify |
| `apps/api/TaNoMar.Api/Dockerfile` | Build multi-stage (web + API) |
| `.env.example` | Template de variáveis para validação local |
| `.dockerignore` | Exclui artefatos desnecessários do contexto de build |

## Configuração no Coolify

1. Crie um recurso **Docker Compose** apontando para este repositório.
2. Defina o caminho do compose: `docker-compose.yml` (raiz).
3. Configure as variáveis de ambiente (ver tabela abaixo).
4. Ative persistência do volume `tanomar-data` se quiser preservar o log de auditoria (mapeado para `/var/lib/tanomar`).
5. Configure domínio e HTTPS no proxy do Coolify (porta interna **8080**).

### Variáveis obrigatórias

| Variável Coolify | Destino | Uso |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | build: `VITE_GOOGLE_CLIENT_ID` | Bundle do PWA (login Google) |
| `GOOGLE_CLIENT_ID` | runtime: `TaNoMar__GoogleClientId` | Validação server-side do token Google |
| `JWT_KEY` | runtime: `TaNoMar__JwtKey` | Assinatura dos access tokens JWT |
| `ConnectionStrings__Default` | runtime | Connection string do PostgreSQL externo |

### Variáveis opcionais

| Variável | Destino | Uso |
| --- | --- | --- |
| `BOOTSTRAP_ADMIN_EMAIL` | `TaNoMar__BootstrapAdminEmail` | E-mail do admin inicial (role Admin + plano Premium) |
| `BOOTSTRAP_ADMIN_GOOGLE_SUBJECT` | `TaNoMar__BootstrapAdminGoogleSubject` | Claim `sub` do Google do admin inicial — não é o e-mail |
| `Fishing__WarmupEnabled` | `Fishing:WarmupEnabled` | Worker que aquece previsão (padrão `true`) |
| `Fishing__WarmupIntervalHours` | `Fishing:WarmupIntervalHours` | Intervalo entre ciclos do worker (padrão `3`) |

> A seção de configuração da API é `TaNoMar` e o prefixo de ambiente é `TaNoMar__`. Detalhes em [api-contracts.md](api-contracts.md#identificadores-de-runtime).

### Volume persistente

O volume `tanomar-data` monta em `/var/lib/tanomar` e guarda o log de auditoria (`/var/lib/tanomar/audit.jsonl`). Sem o volume, a auditoria some a cada redeploy.

O cache de previsão fica em memória no processo da API. Cada entrada também é gravada como snapshot no PostgreSQL (`FishingForecastSnapshots`), com o mesmo TTL de `Fishing:CacheHours`. A maré sai da mesma série (nível do mar da Open-Meteo) quando o valor existe; série nula não descarta o snapshot. O worker interno `FishingForecastWarmupWorker` preenche cache e snapshot na subida e a cada `Fishing:WarmupIntervalHours` (oficiais e compartilhados aprovados, dias 0–7). Após um restart, a API rehidrata pela tabela antes de chamar a Open-Meteo. Desligue o worker com `Fishing__WarmupEnabled=false`.

## Healthcheck

O container expõe `GET /api/health`. O compose e o Dockerfile usam esse endpoint para verificar saúde.

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

Acesse `http://127.0.0.1:8080` (porta padrão do compose).

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
| Porta | 5173 (web) + 5000/8080 (API) | 8080 (tudo junto) |

## Troubleshooting

**Build falha no estágio web** — verifique `GOOGLE_CLIENT_ID` como build arg; o Vite embute essa variável no bundle.

**Container sobe mas retorna 500** — confira `ConnectionStrings__Default` e se o PostgreSQL aceita conexões do host do Coolify.

**PWA carrega mas API falha** — normalmente variável de ambiente ausente (`JWT_KEY` ou connection string).

**Sessões não persistem após redeploy** — confirme que o volume `tanomar-data` está ativo no Coolify.
