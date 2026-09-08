# Cobrança Premium (Asaas)

Proposta de integração. Nada disto está implementado. A decisão está em [ADR-004](decisions/ADR-004-asaas-checkout.md).

O TáNoMar cobra só o plano Premium da conta logada. Não vende produto de parceiro e não guarda dados de cartão.

## Por que Checkout hospedado

O Asaas oferece três caminhos para cartão:

| Caminho | Onde o cartão é digitado | PCI no TáNoMar | Recorrência | Encaixa no PWA |
| --- | --- | --- | --- | --- |
| **Checkout hospedado** (`POST /v3/checkouts`) | Página do Asaas | SAQ A; o app não vê o PAN | `RECURRENT` nativo | Sim: um redirect |
| API + token JS (`creditCardToken`) | Formulário no app, tokenizado | Mais superfície, 3DS próprio | Assinatura via `/v3/subscriptions` | Possível, mais trabalho |
| API com PAN no servidor | Backend | Fora de questão | — | Não |

A proposta usa o primeiro. Documentação: [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas), [cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [assinatura](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente).

## Recorrência, não venda avulsa

Premium é um plano contínuo (`User.PlanCode`). `DETACHED` cobraria uma vez e exigiria outro checkout no vencimento. `INSTALLMENT` parcela uma compra, não assina o mês seguinte.

Configuração alvo:

```json
{
  "billingTypes": ["CREDIT_CARD"],
  "chargeTypes": ["RECURRENT"],
  "minutesToExpire": 60,
  "externalReference": "<userId>",
  "callback": {
    "successUrl": "https://<origem>/premium?checkout=success",
    "cancelUrl": "https://<origem>/premium?checkout=cancel",
    "expiredUrl": "https://<origem>/premium?checkout=expired"
  },
  "items": [
    {
      "name": "TáNoMar Premium",
      "description": "Assinatura mensal",
      "quantity": 1,
      "value": 29.90
    }
  ],
  "subscription": {
    "cycle": "MONTHLY",
    "nextDueDate": "<hoje>"
  }
}
```

`value` e o texto do item vêm de configuração, não de constante no frontend. `endDate` fica de fora para a assinatura não caducar sozinha. Ciclo `YEARLY` pode entrar depois como segundo item, sem mudar o modelo.

O `successUrl` só mostra “estamos confirmando”. `GET /me` continua `free` até `PAYMENT_CONFIRMED` ou `CHECKOUT_PAID` com assinatura criada.

## Papel de cada lado

```text
apps/web                         botão em /premium → POST /billing/checkout
                                 rotas de retorno só leem query e /me
apps/api                         cria checkout, persiste IDs, aplica plano
Asaas                            tela de cartão, token, cobrança, webhooks
PostgreSQL                       BillingCustomer, BillingSubscription, BillingWebhookEvent
```

Regras de pesca, fórmula e entitlements permanecem na API. O frontend não “libera Premium” localmente.

## Contratos previstos

Base `/api/v1`. Autenticados, exceto o webhook.

| Método | Rota | Papel |
| --- | --- | --- |
| `POST` | `/billing/checkout` | Cria (ou reusa) checkout ativo e devolve `{ checkoutId, checkoutUrl, expiresAt }` |
| `GET` | `/billing/subscription` | Estado da assinatura da conta: `inactive`, `pending`, `active`, `past_due`, `canceled` |
| `POST` | `/billing/subscription/cancel` | Cancela no Asaas; Premium segue até o fim do período já pago |
| `POST` | `/webhooks/asaas` | Público. Valida `asaas-access-token`. Sem JWT |

`POST /billing/checkout`:

- exige sessão Google válida e conta ativa;
- recusa se `PlanCode` já é `premium` por assinatura ativa (admin-granted sem assinatura pode iniciar checkout);
- recusa checkout `ACTIVE` não expirado da mesma conta (idempotência);
- a chave Asaas nunca sai da API.

`GET /me` ganha um bloco opcional, sem quebrar o contrato atual:

```json
{
  "billing": {
    "status": "inactive",
    "renewsAt": null,
    "cancelAtPeriodEnd": false
  }
}
```

Ausente ou `inactive` = comportamento de hoje.

## Modelo

Três tabelas novas. `Users.PlanCode` não some: continua o que a previsão e os limites leem.

**BillingCustomer** — um por usuário, quando o Asaas já tiver `cus_…`.

- `UserId` (único)
- `AsaasCustomerId`
- `CpfCnpj` opcional (se o webhook devolver)

**BillingSubscription**

- `UserId`
- `AsaasCheckoutId`
- `AsaasSubscriptionId` (preenchido no `SUBSCRIPTION_CREATED`)
- `Status` (`pending_checkout`, `active`, `past_due`, `canceled`)
- `Cycle` (`MONTHLY`)
- `Price`
- `CurrentPeriodEnd`
- `CancelAtPeriodEnd`
- `ExternalReference` (= `UserId`)

**BillingWebhookEvent**

- `AsaasEventId` único (`evt_…`)
- `Event`
- `ReceivedAt`
- `ProcessedAt`

Sem PAN, token de cartão nem CVV.

## Webhooks

Um endpoint, três famílias. Entrega *at least once*: gravar `AsaasEventId` antes de aplicar efeito. Responder `200` rápido. Campos novos no JSON não podem quebrar o parser.

Token próprio no header `asaas-access-token`, **diferente** da API key. Sem token válido: `401`.

| Evento | Efeito no TáNoMar |
| --- | --- |
| `CHECKOUT_CREATED` | Auditoria |
| `CHECKOUT_PAID` | Liga checkout à assinatura; se `PAYMENT_CONFIRMED` ainda não chegou, pode promover |
| `CHECKOUT_CANCELED` / `CHECKOUT_EXPIRED` | Marca o checkout; o pescador gera outro |
| `SUBSCRIPTION_CREATED` | Grava `sub_…`; `externalReference` reconcilia o usuário |
| `SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED` | Após carência, `PlanCode = free` (exceto bootstrap) |
| `PAYMENT_CONFIRMED` | `PlanCode = premium`, `status = active`, notificação “Seu plano agora é Premium.” |
| `PAYMENT_OVERDUE` | `past_due`; inbox avisa; carência (ex.: 3 dias) antes de rebaixar |
| `PAYMENT_REFUNDED` / `PAYMENT_CHARGEBACK_REQUESTED` | Rebaixa na hora |

Não promover só com `PAYMENT_CREATED`. Cartão confirmado é `PAYMENT_CONFIRMED`; `PAYMENT_RECEIVED` é liquidação financeira, dias depois — não deve atrasar o acesso.

A troca de plano reutiliza o mesmo aviso já usado pelo admin (`Plano atualizado` / inbox + SSE + Web Push).

A conta `BOOTSTRAP_ADMIN_*` permanece Premium mesmo se um webhook tentar rebaixar.

## Configuração

Somente runtime da API. Prefixo `TaNoMar__` / variáveis Coolify, no mesmo estilo de VAPID e Geoapify.

| Variável | Uso |
| --- | --- |
| `ASAAS_API_KEY` | `access_token` das chamadas à API |
| `ASAAS_BASE_URL` | Padrão produção `https://api.asaas.com/v3`; sandbox `https://api-sandbox.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | Valor esperado em `asaas-access-token` |
| `ASAAS_PREMIUM_PRICE` | Valor mensal em reais (ex.: `29.90`) |
| `ASAAS_PREMIUM_ITEM_NAME` | Texto do item no checkout |
| `PUBLIC_APP_ORIGIN` | Origem HTTPS para `callback.*` (domínio do Coolify) |

Sem essas variáveis, `/premium` permanece vitrine (estado atual) e `POST /billing/checkout` responde `503` (`billing_disabled`). Não exige redeploy de flag: ausência de chave = desligado.

O webhook no painel Asaas aponta para `https://<domínio>/api/v1/webhooks/asaas`.

## Frontend

- `/premium`: se `billing` está habilitado e o plano é `free`, o CTA chama o service e redireciona para `checkoutUrl`. Sem chave, o card “Disponibilidade” atual permanece.
- Retornos `?checkout=success|cancel|expired`: copy local; o plano vem de `GET /me` (TanStack Query).
- Conta: status da assinatura e cancelamento no fim do período.
- Components não falam com o Asaas. Page → hook → `billingService` → `/api/v1`.

Vocabulário: o produto continua “plano Premium”. “Checkout” e “assinatura” são termos de cobrança, não o nome do ponto de pesca.

## PCI, LGPD e operação

- Número do cartão não transita no container nem no service worker.
- Endpoints autenticados de billing não entram no cache PWA (mesma regra dos demais `/api/v1`).
- CPF é dado de pagamento: mínimo necessário, sem logar no `audit.jsonl`.
- Sandbox primeiro. Produção só com conta Asaas aprovada para cartão.
- Sem fila extra: persistir evento e aplicar o plano no request do webhook (é barato, como a troca de plano do admin). Se o Asaas exigir resposta mais rápida no futuro, um worker in-process no estilo do Web Push basta.

## Fora desta proposta

- Pix (fácil de somar em `billingTypes` depois)
- Boleto
- Parcelamento `INSTALLMENT`
- Split
- Checkout ou split para parceiros
- Formulário de cartão no PWA
- Mercado Pago
- Alterar issuer JWT, cookie, migrations de pesca ou fórmula da nota

## Ordem de implementação

1. Opções + `HttpClient` Asaas + tabelas + webhook idempotente (ainda sem promover).
2. `POST /billing/checkout` e páginas de retorno.
3. Promover/rebaixar `PlanCode` nos eventos da tabela acima.
4. Cancelamento e `GET /billing/subscription`.
5. Sandbox ponta a ponta; só então chave de produção no Coolify.
