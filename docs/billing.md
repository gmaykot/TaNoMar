# Cobrança Premium (Asaas)

Proposta de integração. Nada disto está implementado. A decisão está em [ADR-004](decisions/ADR-004-asaas-checkout.md).

O TáNoMar cobra só o plano Premium da conta logada, em **assinatura anual** com 20% de desconto sobre 12 meses. Cancelar a recorrência não estorna. Não vende produto de parceiro e não guarda dados de cartão.

## Por que Checkout hospedado

O Asaas oferece três caminhos para cartão:

| Caminho | Onde o cartão é digitado | PCI no TáNoMar | Recorrência | Encaixa no PWA |
| --- | --- | --- | --- | --- |
| **Checkout hospedado** (`POST /v3/checkouts`) | Página do Asaas | SAQ A; o app não vê o PAN | `RECURRENT` nativo | Sim: um redirect |
| API + token JS (`creditCardToken`) | Formulário no app, tokenizado | Mais superfície, 3DS próprio | Assinatura via `/v3/subscriptions` | Possível, mais trabalho |
| API com PAN no servidor | Backend | Fora de questão | — | Não |

A proposta usa o primeiro. Documentação: [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas), [cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [assinatura](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente).

## Preço anual (20% de desconto)

A oferta cobrada é **um ano**. O preço mensal de tabela existe só para mostrar o desconto; não abre um segundo checkout.

```text
preço_anual = arredondar(preço_mensal_de_tabela × 12 × 0,80; 2)
```

Exemplo com tabela `29,90`:

| | Valor |
| --- | --- |
| 12 meses cheios | R$ 358,80 |
| Anual (−20%) | **R$ 287,04** |
| Equivalente mensal | R$ 23,92 |

O percentual 20% é regra de produto, não variável de ambiente. Só o preço mensal de tabela é configurável; o anual deriva da fórmula.

`DETACHED` cobraria uma vez e exigiria outro checkout no vencimento. `INSTALLMENT` parcela uma compra, não renova o ano seguinte. O checkout usa `RECURRENT` + `YEARLY`.

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
      "description": "Assinatura anual com 20% de desconto",
      "quantity": 1,
      "value": 287.04
    }
  ],
  "subscription": {
    "cycle": "YEARLY",
    "nextDueDate": "<hoje>"
  }
}
```

`value` sai da fórmula acima. `endDate` fica de fora para a assinatura renovar sozinha até o pescador cancelar.

O `successUrl` só mostra “estamos confirmando”. `GET /me` continua `free` até `PAYMENT_CONFIRMED` ou `CHECKOUT_PAID` com assinatura criada.

## Papel de cada lado

```text
apps/web                         /premium escolhe anual → POST /billing/checkout
                                 Conta → cancelar renovação
                                 rotas de retorno só leem query e /me
apps/api                         cria checkout, persiste IDs, aplica plano
                                 cancela recorrência sem refund
Asaas                            tela de cartão, token, cobrança, webhooks
PostgreSQL                       BillingCustomer, BillingSubscription, BillingWebhookEvent
```

Regras de pesca, fórmula e entitlements permanecem na API. O frontend não “libera Premium” localmente.

## Contratos previstos

Base `/api/v1`. Autenticados, exceto o webhook.

| Método | Rota | Papel |
| --- | --- | --- |
| `GET` | `/billing/catalog` | Preços: `{ monthlyListPrice, annualPrice, discountPercent: 20, cycle: "YEARLY" }` |
| `POST` | `/billing/checkout` | Cria (ou reusa) checkout anual ativo e devolve `{ checkoutId, checkoutUrl, expiresAt }` |
| `GET` | `/billing/subscription` | Estado da assinatura da conta |
| `POST` | `/billing/subscription/cancel` | Encerra a recorrência; **não estorna**; Premium segue até o fim do período pago |
| `POST` | `/webhooks/asaas` | Público. Valida `asaas-access-token`. Sem JWT |

`POST /billing/checkout`:

- exige sessão Google válida e conta ativa;
- recusa se já existe assinatura `active` (admin-granted sem assinatura pode iniciar checkout);
- recusa checkout `ACTIVE` não expirado da mesma conta (idempotência);
- a chave Asaas nunca sai da API.

`GET /billing/subscription` e o bloco em `GET /me`:

```json
{
  "billing": {
    "status": "inactive",
    "cycle": "YEARLY",
    "monthlyListPrice": 29.90,
    "annualPrice": 287.04,
    "discountPercent": 20,
    "renewsAt": null,
    "accessUntil": null,
    "cancelAtPeriodEnd": false
  }
}
```

| `status` | Significado |
| --- | --- |
| `inactive` | Sem assinatura (plano free, ou Premium só pelo admin) |
| `pending` | Checkout aberto, ainda sem pagamento |
| `active` | Pago; `cancelAtPeriodEnd: false` renova no aniversário |
| `past_due` | Cobrança da renovação atrasada |
| `canceled` | Recorrência encerrada; `accessUntil` é o fim do ano já pago |

Ausente ou `inactive` = comportamento de hoje.

## Cancelamento da recorrência (sem estorno)

Política de produto: cancelar **para a renovação**. O valor do ano já pago não volta. Não existe botão de reembolso no app.

`POST /billing/subscription/cancel`:

1. Exige assinatura `active` da própria conta (`cancelAtPeriodEnd` ainda `false`).
2. Chama `DELETE /v3/subscriptions/{id}` no Asaas. Isso encerra a recorrência e apaga cobranças futuras/pendentes. Cobranças **já pagas permanecem**.
3. **Não** chama `POST /v3/payments/{id}/refund`. Essa rota não entra no cliente de billing.
4. Grava `CancelAtPeriodEnd = true`, `Status = canceled`, mantém `CurrentPeriodEnd` / `accessUntil`.
5. `User.PlanCode` **continua `premium`** até `CurrentPeriodEnd`.
6. Inbox: “A renovação foi cancelada. Você continua Premium até {data}. Não há estorno.”
7. Idempotente: segundo POST com já cancelado devolve o mesmo estado (`200`), sem novo DELETE.

No vencimento, um worker (mesmo estilo do alerta horário) rebaixa para `free` e notifica. `GET /me` também aplica o vencimento se o worker ainda não rodou, para o pescador não ficar Premium além da data.

O webhook `SUBSCRIPTION_DELETED` que chega por causa deste cancelamento **não** rebaixa na hora. Só confirma que o Asaas encerrou a recorrência.

Estorno ou chargeback iniciados **fora** do app (`PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`) continuam rebaixando na hora — são eventos financeiros, não o cancelamento do usuário.

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
- `Cycle` (`YEARLY`)
- `Price` (valor anual cobrado)
- `CurrentPeriodEnd` (acesso pago até esta data)
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
| `SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED` | Se `CancelAtPeriodEnd`, só confirma o fim da recorrência. Senão (falha/remoção no painel Asaas), carência e depois `free` |
| `PAYMENT_CONFIRMED` | `PlanCode = premium`, `status = active`, `CurrentPeriodEnd` = aniversário anual, notificação “Seu plano agora é Premium.” |
| `PAYMENT_OVERDUE` | `past_due`; inbox avisa; carência (ex.: 3 dias) antes de rebaixar |
| `PAYMENT_REFUNDED` / `PAYMENT_CHARGEBACK_REQUESTED` | Rebaixa na hora (não é o cancelamento do usuário) |

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
| `ASAAS_PREMIUM_MONTHLY_PRICE` | Preço mensal de tabela em reais (ex.: `29.90`). O anual é `× 12 × 0,80` |
| `ASAAS_PREMIUM_ITEM_NAME` | Texto do item no checkout (ex.: `TáNoMar Premium`) |
| `PUBLIC_APP_ORIGIN` | Origem HTTPS para `callback.*` (domínio do Coolify) |

Sem essas variáveis, `/premium` permanece vitrine (estado atual) e `POST /billing/checkout` responde `503` (`billing_disabled`). Não exige redeploy de flag: ausência de chave = desligado.

O webhook no painel Asaas aponta para `https://<domínio>/api/v1/webhooks/asaas`.

## Frontend

- `/premium`: mostra anual, equivalente mensal e selo “20% de desconto”. Se billing está ligado e o plano é `free`, o CTA chama o service e redireciona. Sem chave, o card “Disponibilidade” atual permanece.
- Retornos `?checkout=success|cancel|expired`: copy local; o plano vem de `GET /me` (TanStack Query).
- Conta: “Cancelar renovação”, com texto explícito de que **não há estorno** e a data até quando o Premium segue. Depois do cancelamento, o botão some e resta “Renovação cancelada · acesso até {data}”.
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
- SKU mensal no checkout (a tabela mensal existe só para o desconto)
- Parcelamento `INSTALLMENT`
- Split
- Checkout ou split para parceiros
- Formulário de cartão no PWA
- Mercado Pago
- Estorno pelo app (`/refund` não é chamado no cancelamento)
- Alterar issuer JWT, cookie, migrations de pesca ou fórmula da nota

## Ordem de implementação

1. Opções + `HttpClient` Asaas + tabelas + webhook idempotente (ainda sem promover).
2. `POST /billing/checkout` e páginas de retorno.
3. Promover/rebaixar `PlanCode` nos eventos da tabela acima.
4. `POST /billing/subscription/cancel` sem refund, worker de `CurrentPeriodEnd` e copy na Conta.
5. Sandbox ponta a ponta (pagar, cancelar, conferir que não há estorno e que o plano cai só na data); só então chave de produção no Coolify.
