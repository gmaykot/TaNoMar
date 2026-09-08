# Cobrança da assinatura (Asaas)

Proposta de integração. Nada disto está implementado. A decisão está em [ADR-004](decisions/ADR-004-asaas-checkout.md).

Os códigos e cotas vêm da branch `cursor/planos-assinatura-arrais-mestre-capitao-d738` (`PlanRules`, tabela `Plans`). O TáNoMar cobra só a assinatura da conta logada. Cancelar a recorrência não estorna. Não vende produto de parceiro e não guarda dados de cartão.

## Planos cobrados

`free` não tem checkout. Qualquer código diferente de `free` é pago (`PlanRules.IsPaid`). Alias de admin: `mestre` → `premium`.

| Interface | `PlanCode` | Tabela /mês | 12 meses | Anual (−20%) | Equiv. /mês | Previsão | Locais | Favoritos | Alertas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arrais | `arrais` | R$ 14,90 | R$ 178,80 | **R$ 143,04** | R$ 11,92 | 5 | 5 | 10 | 5 |
| Mestre | `premium` | R$ 19,90 | R$ 238,80 | **R$ 191,04** | R$ 15,92 | 8 | 10 | 20 | 10 |
| Capitão | `capitao` | R$ 24,90 | R$ 298,80 | **R$ 239,04** | R$ 19,92 | 8 | 20 | 40 | 20 |

Mar, diário, votos, indicadores e offline valem em qualquer plano pago. O que muda entre eles é cota.

```text
preço_anual(plano) = arredondar(mensal_tabela(plano) × 12 × 0,80; 2)
```

O percentual 20% é regra de produto. Só os três preços mensais de tabela são configuráveis; o anual deriva da fórmula.

A oferta cobrada é **um ano por plano**. O `/mês` da vitrine é tabela; não abre checkout mensal.

## Por que Checkout hospedado

| Caminho | Onde o cartão é digitado | PCI no TáNoMar | Recorrência | Encaixa no PWA |
| --- | --- | --- | --- | --- |
| **Checkout hospedado** (`POST /v3/checkouts`) | Página do Asaas | SAQ A; o app não vê o PAN | `RECURRENT` nativo | Sim: um redirect |
| API + token JS (`creditCardToken`) | Formulário no app, tokenizado | Mais superfície, 3DS próprio | Assinatura via `/v3/subscriptions` | Possível, mais trabalho |
| API com PAN no servidor | Backend | Fora de questão | — | Não |

Documentação: [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas), [cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [assinatura](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente).

## Checkout anual

`DETACHED` cobraria uma vez e exigiria outro checkout no vencimento. `INSTALLMENT` parcela uma compra. O checkout usa `RECURRENT` + `YEARLY`, com o item e o valor do plano escolhido.

```json
{
  "billingTypes": ["CREDIT_CARD"],
  "chargeTypes": ["RECURRENT"],
  "minutesToExpire": 60,
  "externalReference": "<userId>:<planCode>",
  "callback": {
    "successUrl": "https://<origem>/premium?checkout=success",
    "cancelUrl": "https://<origem>/premium?checkout=cancel",
    "expiredUrl": "https://<origem>/premium?checkout=expired"
  },
  "items": [
    {
      "name": "TáNoMar Mestre",
      "description": "Assinatura anual com 20% de desconto",
      "quantity": 1,
      "value": 191.04
    }
  ],
  "subscription": {
    "cycle": "YEARLY",
    "nextDueDate": "<hoje>"
  }
}
```

`endDate` fica de fora para renovar até o pescador cancelar. O `successUrl` só mostra “estamos confirmando”. `GET /me` continua `free` (ou o plano anterior) até `PAYMENT_CONFIRMED` / `CHECKOUT_PAID`.

No **upgrade**, o `items[].value` da primeira cobrança é o valor proporcional (abaixo). A recorrência anual **não** pode ficar nesse valor reduzido.

## Upgrade com desconto proporcional

Upgrade = destino com tabela mensal **maior** (Arrais → Mestre → Capitão). O `PlanCode` novo vale **na hora** do `PAYMENT_CONFIRMED`. Não há estorno no cartão da assinatura antiga: o que ainda restava vira desconto na primeira parcela do plano novo.

```text
dias_periodo    = max(1, dias corridos de PeriodStart até CurrentPeriodEnd)
dias_restantes  = max(0, dias corridos de agora até CurrentPeriodEnd)
crédito         = arredondar(anual_atual × dias_restantes / dias_periodo; 2)
primeira_parcela = arredondar(max(0,01; anual_novo − crédito); 2)
renovação       = anual_novo
CurrentPeriodEnd do plano novo = agora + 1 ano
```

Exemplo: Arrais anual R$ 143,04, 100 dias usados, 265 restantes, período de 365 dias.

| | Valor |
| --- | --- |
| Crédito (265/365 de R$ 143,04) | R$ 103,85 |
| Anual Mestre | R$ 191,04 |
| **Paga hoje** | **R$ 87,19** |
| Próxima renovação (daqui a 1 ano) | R$ 191,04 |

O checkout hospedado cobra `primeira_parcela`. Se o Asaas gravar esse valor na assinatura `YEARLY`, a API **atualiza** `PUT /v3/subscriptions/{id}` para `anual_novo` com `updatePendingPayments: false` assim que chegar `SUBSCRIPTION_CREATED`, para a renovação não sair barata. A assinatura antiga é `DELETE` **sem** `/refund`.

Assinatura `canceled` com `accessUntil` no futuro ainda gera crédito: o ano foi pago.

## Papel de cada lado

```text
apps/web                         /premium escolhe Arrais, Mestre ou Capitão
                                 POST /billing/checkout { planCode }
                                 Conta → cancelar renovação
apps/api                         cria checkout do plano, aplica PlanCode no webhook
                                 cancela recorrência sem refund
Asaas                            tela de cartão, token, cobrança, webhooks
PostgreSQL                       BillingCustomer, BillingSubscription, BillingWebhookEvent
```

Regras de pesca, fórmula e entitlements permanecem na API. O frontend não “libera plano” localmente.

## Contratos previstos

Base `/api/v1`. Autenticados, exceto o webhook.

| Método | Rota | Papel |
| --- | --- | --- |
| `GET` | `/billing/catalog` | Três planos +, se autenticado e houver período pago, `quote` de upgrade por destino |
| `POST` | `/billing/checkout` | Body `{ planCode }`. Primeira cobrança cheia ou proporcional no upgrade |
| `GET` | `/billing/subscription` | Estado da assinatura da conta |
| `POST` | `/billing/subscription/cancel` | Encerra a recorrência; **não estorna**; o plano pago segue até o fim do período |
| `POST` | `/webhooks/asaas` | Público. Valida `asaas-access-token`. Sem JWT |

`POST /billing/checkout`:

- exige sessão válida, conta ativa e `planCode` em `arrais` | `premium` | `capitao` (`mestre` normaliza para `premium`);
- recusa o **mesmo** plano se já há assinatura `active` ou período pago vigente;
- **upgrade** (tabela mensal maior) no meio do ano: permitido; `PlanCode` novo no `PAYMENT_CONFIRMED`; primeira parcela = `anual_novo − crédito proporcional`; recorrência futura = anual cheio; assinatura antiga removida **sem** `/refund`;
- **downgrade** no meio do ano: recusa (`plan_downgrade_period`); o pescador cancela a renovação e, no vencimento, assina o plano menor;
- recusa checkout `ACTIVE` não expirado do mesmo usuário e mesmo `planCode`;
- a chave Asaas nunca sai da API.

`GET /billing/catalog`:

```json
{
  "discountPercent": 20,
  "cycle": "YEARLY",
  "plans": [
    { "code": "arrais", "name": "Arrais", "monthlyListPrice": 14.90, "annualPrice": 143.04 },
    {
      "code": "premium",
      "name": "Mestre",
      "monthlyListPrice": 19.90,
      "annualPrice": 191.04,
      "quote": {
        "kind": "upgrade",
        "remainingDays": 265,
        "credit": 103.85,
        "firstCharge": 87.19,
        "renewalPrice": 191.04
      }
    },
    { "code": "capitao", "name": "Capitão", "monthlyListPrice": 24.90, "annualPrice": 239.04, "quote": { "kind": "upgrade", "remainingDays": 265, "credit": 103.85, "firstCharge": 135.19, "renewalPrice": 239.04 } }
  ]
}
```

`quote` só aparece nos planos de tabela maior que o atual, com período pago vigente. Sem assinatura, não vai `quote` e a primeira cobrança é o anual cheio.

`GET /billing/subscription` e o bloco em `GET /me`:

```json
{
  "billing": {
    "status": "inactive",
    "planCode": null,
    "cycle": "YEARLY",
    "monthlyListPrice": null,
    "annualPrice": null,
    "discountPercent": 20,
    "renewsAt": null,
    "accessUntil": null,
    "cancelAtPeriodEnd": false
  }
}
```

| `status` | Significado |
| --- | --- |
| `inactive` | Sem assinatura (`free`, ou plano só pelo admin) |
| `pending` | Checkout aberto, ainda sem pagamento |
| `active` | Pago; `cancelAtPeriodEnd: false` renova no aniversário |
| `past_due` | Cobrança da renovação atrasada |
| `canceled` | Recorrência encerrada; `accessUntil` é o fim do ano já pago |

Ausente ou `inactive` = comportamento atual da conta.

## Cancelamento da recorrência (sem estorno)

Cancelar **para a renovação**. O valor do ano já pago não volta. Não existe botão de reembolso.

`POST /billing/subscription/cancel`:

1. Exige assinatura `active` da própria conta (`cancelAtPeriodEnd` ainda `false`).
2. Chama `DELETE /v3/subscriptions/{id}` no Asaas. Encerra a recorrência e apaga cobranças futuras/pendentes. Cobranças **já pagas permanecem**.
3. **Não** chama `POST /v3/payments/{id}/refund`.
4. Grava `CancelAtPeriodEnd = true`, `Status = canceled`, mantém `CurrentPeriodEnd` e o `PlanCode` comprado (`arrais`, `premium` ou `capitao`).
5. Inbox: “A renovação do {nome do plano} foi cancelada. Você continua com o plano até {data}. Não há estorno.”
6. Idempotente: segundo POST devolve o mesmo estado (`200`).

No vencimento, um worker rebaixa para `free` e notifica. `GET /me` também aplica o vencimento se o worker ainda não rodou.

O webhook `SUBSCRIPTION_DELETED` deste cancelamento **não** rebaixa na hora.

Estorno ou chargeback **fora** do app (`PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`) rebaixam na hora.

## Modelo

Três tabelas novas. `Users.PlanCode` não some: continua o que a previsão e os limites leem.

**BillingCustomer** — um por usuário, quando o Asaas já tiver `cus_…`.

- `UserId` (único)
- `AsaasCustomerId`
- `CpfCnpj` opcional

**BillingSubscription**

- `UserId`
- `PlanCode` (`arrais`, `premium`, `capitao`)
- `AsaasCheckoutId`
- `AsaasSubscriptionId`
- `Status` (`pending_checkout`, `active`, `past_due`, `canceled`)
- `Cycle` (`YEARLY`)
- `Price` (valor da **primeira** cobrança: anual cheio ou proporcional no upgrade)
- `RecurringPrice` (anual cheio que a renovação deve cobrar)
- `PeriodStart`
- `CurrentPeriodEnd`
- `CancelAtPeriodEnd`
- `ExternalReference` (`userId:planCode`)

**BillingWebhookEvent**

- `AsaasEventId` único
- `Event`
- `ReceivedAt`
- `ProcessedAt`

Sem PAN, token de cartão nem CVV.

## Webhooks

Um endpoint. Entrega *at least once*: gravar `AsaasEventId` antes de aplicar efeito. Responder `200` rápido. Campos novos no JSON não podem quebrar o parser.

Token próprio em `asaas-access-token`, **diferente** da API key. Sem token válido: `401`.

| Evento | Efeito no TáNoMar |
| --- | --- |
| `CHECKOUT_CREATED` | Auditoria |
| `CHECKOUT_PAID` | Liga checkout à assinatura; se `PAYMENT_CONFIRMED` ainda não chegou, pode aplicar o `PlanCode` do item |
| `CHECKOUT_CANCELED` / `CHECKOUT_EXPIRED` | Marca o checkout; o pescador gera outro |
| `SUBSCRIPTION_CREATED` | Grava `sub_…`; no upgrade, `PUT` da assinatura para `RecurringPrice` (anual cheio) sem alterar a cobrança já paga; `DELETE` da assinatura antiga sem `/refund` |
| `SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED` | Se `CancelAtPeriodEnd`, só confirma o fim da recorrência. Senão, carência e depois `free` |
| `PAYMENT_CONFIRMED` | `PlanCode` do item na **hora**; `PeriodStart = agora`; `CurrentPeriodEnd = agora + 1 ano`; notificação “Seu plano agora é {nome}.” |
| `PAYMENT_OVERDUE` | `past_due`; inbox avisa; carência (ex.: 3 dias) antes de `free` |
| `PAYMENT_REFUNDED` / `PAYMENT_CHARGEBACK_REQUESTED` | Rebaixa na hora |

Não promover só com `PAYMENT_CREATED`. `PAYMENT_RECEIVED` é liquidação e não deve atrasar o acesso.

A troca de plano reutiliza o aviso do admin (inbox + SSE + Web Push).

A conta `BOOTSTRAP_ADMIN_*` permanece Mestre (`premium`) se um webhook tentar rebaixar.

## Configuração

Somente runtime da API. Prefixo `TaNoMar__` / variáveis Coolify.

| Variável | Uso |
| --- | --- |
| `ASAAS_API_KEY` | `access_token` das chamadas à API |
| `ASAAS_BASE_URL` | Produção `https://api.asaas.com/v3`; sandbox `https://api-sandbox.asaas.com/v3` |
| `ASAAS_WEBHOOK_TOKEN` | Valor esperado em `asaas-access-token` |
| `ASAAS_ARRAIS_MONTHLY_PRICE` | Tabela Arrais (padrão `14.90`) |
| `ASAAS_MESTRE_MONTHLY_PRICE` | Tabela Mestre (padrão `19.90`) |
| `ASAAS_CAPITAO_MONTHLY_PRICE` | Tabela Capitão (padrão `24.90`) |
| `PUBLIC_APP_ORIGIN` | Origem HTTPS para `callback.*` |

Sem `ASAAS_API_KEY`, `/premium` permanece vitrine e `POST /billing/checkout` responde `503` (`billing_disabled`).

O webhook no painel Asaas aponta para `https://<domínio>/api/v1/webhooks/asaas`.

## Frontend

- `/premium`: os cards mostram anual, equivalente mensal e selo “20% de desconto”. No upgrade, o CTA usa `quote.firstCharge` (“Pagar R$ 87,19 hoje · desconto proporcional”) e deixa claro que o plano novo começa na hora e a renovação segue o anual cheio. Sem chave, permanece “A cobrança ainda não começa por aqui.”
- Retornos `?checkout=success|cancel|expired`: copy local; o plano vem de `GET /me`.
- Conta: plano atual, “Cancelar renovação” com texto de que **não há estorno** e a data de acesso. Depois, “Renovação cancelada · {nome} até {data}”.
- Upgrade: CTA só nos cards de tabela maior. Downgrade: copy apontando para o cancelamento e a nova assinatura após o vencimento.
- Components não falam com o Asaas. Page → hook → `billingService` → `/api/v1`.

Vocabulário: na interface, **Arrais**, **Mestre** e **Capitão**. “Assinatura” é o produto. O código estável do Mestre continua `premium`. Não use “pesqueiro” nem “praia” para o ponto de pesca.

## PCI, LGPD e operação

- Número do cartão não transita no container nem no service worker.
- Endpoints autenticados de billing não entram no cache PWA.
- CPF é dado de pagamento: mínimo necessário, sem logar no `audit.jsonl`.
- Sandbox primeiro. Produção só com conta Asaas aprovada para cartão.
- Sem fila extra: persistir evento e aplicar o plano no request do webhook.

## Fora desta proposta

- Pix
- Boleto
- SKU mensal no checkout
- Proration / crédito no **downgrade** (só no upgrade)
- Parcelamento `INSTALLMENT`
- Split e checkout de parceiros
- Formulário de cartão no PWA
- Mercado Pago
- Estorno pelo app
- Alterar issuer JWT, cookie, fórmula da nota ou o código `premium` do Mestre

## Ordem de implementação

1. Opções + `HttpClient` Asaas + tabelas + webhook idempotente (ainda sem promover).
2. `GET /billing/catalog` e `POST /billing/checkout { planCode }`, alinhados a `PlanRules`.
3. Aplicar `arrais` / `premium` / `capitao` nos eventos da tabela acima.
4. Cancelamento sem refund, worker de `CurrentPeriodEnd` e copy na Conta.
5. Upgrade: crédito proporcional na primeira parcela, plano novo na hora, `PUT` da recorrência para o anual cheio, `DELETE` da assinatura antiga sem refund.
6. Sandbox ponta a ponta nos três planos e um upgrade Arrais→Mestre no meio do período (conferir valor cobrado, cotas na hora e renovação futura cheia); só então chave de produção no Coolify.
