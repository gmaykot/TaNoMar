# TaNoMar Monitor

Serviço independente que monitora a Web e a API do TaNoMar por HTTP, persiste estados em SQLite e envia alertas pelo contrato HTTP do `tanomar-whatsapp`. Não referencia código da API ou do WhatsApp e não acessa PostgreSQL.

## Execução local

Na pasta `services/tanomar-monitor`, configure as variáveis no ambiente do processo (o arquivo `.env` é carregado pelo Compose, não pelo `dotnet run`) e execute:

```powershell
dotnet restore src/TaNoMar.Monitor/TaNoMar.Monitor.csproj
dotnet run --project src/TaNoMar.Monitor
dotnet test tests/TaNoMar.Monitor.Tests/TaNoMar.Monitor.Tests.csproj
```

As variáveis de pipeline amigáveis são traduzidas para seções .NET pelo `docker-compose.yml`. Na execução direta, também é possível usar os nomes das seções, por exemplo `Monitoring__IntervalSeconds=30`.

## Configuração de produção

Os valores operacionais abaixo podem ser alterados no Coolify ou na pipeline sem rebuild da imagem. É necessário reiniciar/redeployar o container para que o processo leia os novos valores.

| Variável | Default | Descrição | Exemplo |
| --- | ---: | --- | ---: |
| `MONITOR_INTERVAL_SECONDS` | `60` | Intervalo entre rodadas | `30` |
| `MONITOR_FAILURE_THRESHOLD` | `3` | Falhas consecutivas para DOWN | `2` |
| `MONITOR_RECOVERY_THRESHOLD` | `2` | Sucessos para RECOVERY | `2` |
| `MONITOR_HTTP_TIMEOUT_SECONDS` | `10` | Timeout dos checks Web/API | `10` |
| `WHATSAPP_STATUS_TIMEOUT_SECONDS` | `5` | Timeout do GET `/status` | `5` |
| `WHATSAPP_SEND_TIMEOUT_SECONDS` | `15` | Timeout do POST `/send` | `15` |
| `ALERT_RETRY_ENABLED` | `true` | Habilita retries transitórios | `false` |
| `ALERT_RETRY_INTERVAL_SECONDS` | `300` | Intervalo entre retries | `600` |
| `ALERT_MAX_RETRY_ATTEMPTS` | `3` | Retries adicionais por incidente | `1` |

Também configure `TANOMAR_WEB_URL`, `TANOMAR_WEB_EXPECTED_CONTENT`, `TANOMAR_API_URL`, `WHATSAPP_API_KEY` e `WHATSAPP_DESTINATION_ID`. Na stack conjunta em `services/docker-compose.yml`, `WHATSAPP_BASE_URL` é definido internamente como `http://tanomar-whatsapp:3000`; para execução independente do monitor, configure-o explicitamente. O segredo real deve existir somente no ambiente de deploy.

Perfil normal:

```text
MONITOR_INTERVAL_SECONDS=60
MONITOR_FAILURE_THRESHOLD=3
MONITOR_RECOVERY_THRESHOLD=2
```

Isso detecta DOWN após aproximadamente três intervalos, dependendo da duração dos requests e do momento em que a falha ocorre.

Perfil mais rápido:

```text
MONITOR_INTERVAL_SECONDS=30
MONITOR_FAILURE_THRESHOLD=2
MONITOR_RECOVERY_THRESHOLD=2
```

A detecção fica aproximadamente em um minuto, mas a duração dos requests e o timeout também influenciam o tempo real.

O worker inicia a próxima rodada somente depois que a rodada atual termina e o intervalo configurado é aguardado; portanto, a duração dos requests é somada ao intervalo. Checks não são sobrepostos.

## Limites de validação

Na inicialização, a aplicação falha com mensagem objetiva quando `IntervalSeconds < 10`, thresholds são menores que 1, `HttpTimeoutSeconds < 2`, timeouts do WhatsApp são menores que 1, `RetryEnabled=true` com intervalo menor que 10, `MaxRetryAttempts < 0`, URLs são inválidas ou credenciais/destino estão ausentes. Quando retry está desabilitado, intervalo e quantidade de retries não invalidam a configuração.

## Docker/Coolify

```powershell
cd ..
Copy-Item .env.example .env
# edite .env e preencha WHATSAPP_API_KEY e WHATSAPP_DESTINATION_ID
docker compose up -d --build
docker compose ps
docker compose logs -f tanomar-monitor
```

O Compose mapeia as variáveis amigáveis para `Monitoring__*`, `WhatsApp__*` e `Alerts__*`, usa `restart: unless-stopped`, volume persistente e usuário não-root. A imagem oficial .NET suporta amd64 e arm64.

Não há pipeline específica do monitor neste repositório. No Coolify, cadastre as variáveis na aplicação do monitor; URLs, thresholds e timeouts podem ser alterados sem rebuild, seguidos de restart/redeploy.

## Estados, retry e persistência

`Unknown` vira `Healthy` no primeiro sucesso. Falhas consecutivas até o threshold levam a `Down`; sucessos consecutivos até o recovery threshold levam a `Healthy`.

O estado e os contadores ficam em `/app/data/tanomar-monitor.db`. O incidente e as tentativas de alerta são persistidos. O alerta inicial sempre é tentado uma vez. Com retry habilitado, falhas transitórias têm até `Alerts__MaxRetryAttempts` tentativas adicionais, respeitando `Alerts__RetryIntervalSeconds`. 400/401 do WhatsApp são permanentes e não geram retry. Nunca há loop imediato nem checks sobrepostos.

Antes de cada envio, o monitor chama `GET /status` e só chama `POST /send` quando `state == "connected"`. O token não aparece nos logs e o monitor não normaliza JID nem implementa Baileys.

## Endpoints e logs

- `GET /health/live`: processo vivo.
- `GET /health/ready`: worker iniciado e SQLite acessível; não depende dos alvos monitorados.
- `GET /status`: estado operacional seguro dos checks.

```powershell
cd ..
curl.exe http://localhost:8081/health/live
curl.exe http://localhost:8081/health/ready
curl.exe http://localhost:8081/status
docker compose logs -f tanomar-monitor
```

## Reset em desenvolvimento

Pare o serviço antes de remover o estado:

```powershell
cd ..
docker compose down
docker volume rm tanomar-monitor_tanomar-monitor-data
```

Na execução direta, remova o arquivo definido em `MONITOR_DATABASE_PATH`. Em produção, apagar o banco perde incidentes, contadores e marcas de alerta e pode causar novas notificações após a recriação.
