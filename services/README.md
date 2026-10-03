# TaNoMar Services

Stack independente para `tanomar-whatsapp` e `tanomar-monitor`. Ela pode ser implantada em outra VPS sem iniciar Web, API ou PostgreSQL do TaNoMar.

## Arquitetura

```text
services/docker-compose.yml
├── tanomar-whatsapp  (rede privada, porta 3000 não publicada)
└── tanomar-monitor   (rede privada; health/status opcionalmente publicados no host)
```

Os dois containers compartilham somente a network privada `tanomar-services`. O monitor acessa o WhatsApp por `http://tanomar-whatsapp:3000`, consulta Web/API pelas URLs públicas configuradas e persiste seu SQLite em volume separado.

## Subir e parar

```powershell
cd services
Copy-Item .env.example .env
# edite services/.env e substitua replace-me por um token longo
docker compose up -d --build
docker compose ps
docker compose logs -f tanomar-whatsapp
docker compose logs -f tanomar-monitor
docker compose down
```

O `docker compose down` não remove volumes. Não use `docker compose down -v` durante a migração ou operação normal.

## Volumes e migração segura

Os volumes têm nomes explícitos para preservar dados entre projetos Compose:

- `tanomar_tanomar-whatsapp-data` → `/data`, incluindo `/data/session` do Baileys.
- `tanomar-monitor_tanomar-monitor-data` → `/app/data`, incluindo `tanomar-monitor.db`.

O primeiro nome corresponde ao volume criado pelo Compose principal antigo quando o projeto se chama `tanomar`; o segundo corresponde ao Compose antigo do monitor. Confirme antes da migração:

```powershell
docker volume ls | Select-String 'tanomar.*(whatsapp|monitor)'
docker volume inspect tanomar_tanomar-whatsapp-data
```

Pare/remova somente o container antigo do WhatsApp, sem remover o volume, e depois suba esta stack. Não execute `down -v` e não apague o volume. Se o volume antigo tiver outro nome por causa do `COMPOSE_PROJECT_NAME`, ajuste apenas o campo `name:` do novo Compose para o nome retornado por `docker volume ls`; não crie um novo volume nem leia QR novamente.

## Portas e healthchecks

O WhatsApp não publica a porta 3000; `/health` é usado somente pelo healthcheck interno. O monitor publica `127.0.0.1:8081` por padrão para permitir validação local/Coolify sem exposição externa automática. Para um proxy externo controlado, configure `MONITOR_BIND_ADDRESS` e `MONITOR_PORT`.

```powershell
curl.exe http://127.0.0.1:8081/health/live
curl.exe http://127.0.0.1:8081/health/ready
curl.exe http://127.0.0.1:8081/status
```

O monitor não depende do estado conectado do WhatsApp para ficar Ready. O `/status` do WhatsApp, protegido pelo token, é consultado antes de cada alerta.

## API principal

A API principal não inicia mais o container WhatsApp. Ela já aceita `WhatsApp__BaseUrl`/`WHATSAPP_BASE_URL` e `WhatsApp__ApiKey`/`WHATSAPP_API_KEY`. Na stack principal, configure `WHATSAPP_BASE_URL` com um endereço acessível pela API:

- mesma VPS: endereço publicado por reverse proxy ou outra rota controlada;
- VPS diferente: HTTPS por reverse proxy, VPN, Cloudflare Access/Tunnel ou firewall com origem restrita.

Não use `http://tanomar-whatsapp:3000` na API principal quando os Compose estiverem separados: esse hostname só existe na network privada desta stack.

## Deploy independente

No Coolify, use `services/docker-compose.yml` como Compose desta aplicação e cadastre os valores de `services/.env.example` no ambiente. Web/API e PostgreSQL não são dependências do deploy. O monitor acessa a Web e a API por HTTPS público; somente o WhatsApp é interno à VPS da stack.

Para a stack principal, use o Compose da raiz:

```powershell
cd ..
docker compose up -d
```

Ela não inicia `tanomar-whatsapp` nem `tanomar-monitor`. Para subir ambas localmente, inicie cada Compose em seu diretório e configure `WHATSAPP_BASE_URL` da API para um endpoint alcançável; não há network Docker compartilhada automaticamente.
