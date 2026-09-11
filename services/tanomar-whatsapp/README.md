# tanomar-whatsapp

Adapter interno de WhatsApp do TáNoMar. Ele usa Baileys, não contém regra de negócio e não deve ser exposto diretamente à internet. A PWA fala somente com a API .NET; a API chama este serviço com um token interno.

> Baileys é uma integração não oficial e não é afiliada ao WhatsApp. Mudanças no WhatsApp Web podem interromper a conexão e o uso inadequado pode causar bloqueio da conta. Use uma conta dedicada e não envie spam.

## Executar localmente

Requer Node.js 22 ou superior.

```powershell
cd services/tanomar-whatsapp
npm install
$env:INTERNAL_API_KEY = "troque-por-um-token-longo"
$env:SESSION_PATH = "$PWD/data/session"
$env:INSTANCE_NAME = "TaNoMar-Local"
npm run dev
```

Na API .NET, configure o mesmo token e a URL local:

```powershell
$env:WHATSAPP_ENABLED = "true"
$env:WHATSAPP_BASE_URL = "http://127.0.0.1:3000"
$env:WHATSAPP_API_KEY = "troque-por-um-token-longo"
```

Depois entre como Admin em `/admin/integracoes/whatsapp`, clique em **Conectar WhatsApp** e leia o QR Code em WhatsApp → Aparelhos conectados → Conectar aparelho. Informe o número do destino ou escolha um grupo listado, salve a configuração e use **Enviar mensagem de teste**.

## Variáveis

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP interna. |
| `INTERNAL_API_KEY` | — | Token Bearer/X-Internal-Api-Key obrigatório. |
| `SESSION_PATH` | `/data/session` | Pasta das credenciais persistentes do Baileys. |
| `INSTANCE_NAME` | `TaNoMar` | Nome do aparelho no WhatsApp. Local: `TaNoMar-Local`. Produção: `TaNoMar`. |
| `LOG_LEVEL` | `info` | Nível dos logs do adapter. |

O serviço expõe `GET /health` sem autenticação apenas para healthcheck. `/status`, `/qr`, `/chats`, `/groups`, `/connect`, `/reconnect`, `/logout` e `/send` exigem o token interno.

## Sessão e restart

No `docker-compose.yml`, `tanomar-whatsapp-data` monta `/data`. As credenciais ficam em `/data/session` e sobrevivem a restart e novo deploy do container. A pasta é ignorada pelo Git e nunca deve ser copiada para o repositório.

Para desconectar normalmente, use o botão **Desconectar** no Admin. Ele encerra a sessão e apaga somente `SESSION_PATH`. Para reset manual, pare o serviço, apague o conteúdo do volume `tanomar-whatsapp-data` no Coolify e suba novamente; será necessário ler outro QR Code.

Quedas temporárias (`515` restart required, timeout, perda de socket) reconectam sozinhas com backoff. Logout, sessão inválida ou o mesmo arquivo de sessão aberto em dois processos exigem novo QR. O adapter não baixa o histórico completo das conversas — só precisa de destinos para o Admin.

Local e produção podem usar o mesmo número ao mesmo tempo, desde que cada um tenha sessão própria e um QR próprio. O WhatsApp aceita vários aparelhos conectados. O que não funciona é copiar `data/session` (ou o volume do Coolify) de um ambiente para o outro: os dois passam a ser o mesmo aparelho e se expulsam. No celular, em Aparelhos conectados, devem aparecer nomes distintos (`TaNoMar` e `TaNoMar-Local`).

## Testes e build

```bash
npm test
npm run build
```

Os testes cobrem autenticação HTTP, healthcheck, listagem e envio usando um gateway falso. A conexão real e a leitura do QR dependem de um aparelho WhatsApp e devem ser validadas manualmente no ambiente de implantação.

## Limitações

- É uma conexão não oficial baseada no WhatsApp Web, sem SLA da Meta.
- O serviço mantém uma única instância/sessão por container.
- Conversas pessoais dependem dos eventos de chat/contato do aparelho conectado; o envio pessoal resolve o JID no WhatsApp (LID e nono dígito). Não use o mesmo número do aparelho conectado — envie para outro WhatsApp ou para um grupo.
- A fila administrativa da API é interna e não persiste jobs durante o restart do processo.
- Credenciais, QR Code, conteúdo de mensagens e token interno não são registrados nos logs.
