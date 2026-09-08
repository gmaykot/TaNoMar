# Cobrança da assinatura (Asaas)

Checkout hospedado do Asaas, só cartão. A decisão está em [ADR-004](decisions/ADR-004-asaas-checkout.md).

Os códigos, cotas e o preço mensal de tabela vêm de `Plans` (`PlanRules`, `/admin/planos`). O TáNoMar cobra só a assinatura da conta logada. Cancelar a recorrência não estorna. Não vende produto de parceiro e não guarda dados de cartão.

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

O percentual 20% é regra de produto. Só os três preços mensais de tabela são configuráveis; o anual **de catálogo** deriva da fórmula. O anual **já contratado** não usa essa fórmula de novo.

Há dois ciclos de checkout: **mensal** (tabela) e **anual** (−20%). Se a tabela mudar no meio do período já pago, **não cobra a diferença**. A **renovação** anual e a **próxima** fatura mensal usam o catálogo novo.

## Por que Checkout hospedado

| Caminho | Onde o cartão é digitado | PCI no TáNoMar | Recorrência | Encaixa no PWA |
| --- | --- | --- | --- | --- |
| **Checkout hospedado** (`POST /v3/checkouts`) | Página do Asaas | SAQ A; o app não vê o PAN | `RECURRENT` nativo | Sim: um redirect |
| API + token JS (`creditCardToken`) | Formulário no app, tokenizado | Mais superfície, 3DS próprio | Assinatura via `/v3/subscriptions` | Possível, mais trabalho |
| API com PAN no servidor | Backend | Fora de questão | — | Não |

Documentação: [Asaas Checkout](https://docs.asaas.com/docs/checkout-asaas), [cartão](https://docs.asaas.com/docs/checkout-para-cart%C3%A3o-de-cr%C3%A9dito), [assinatura](https://docs.asaas.com/docs/checkout-com-assinatura-recorrente).

## Checkout (mensal ou anual)

`DETACHED` cobraria uma vez e exigiria outro checkout no vencimento. `INSTALLMENT` parcela uma compra. O checkout usa `RECURRENT` com `MONTHLY` ou `YEARLY`.

Anual (Mestre, tabela vigente no contrato):

```json
{
  "billingTypes": ["CREDIT_CARD"],
  "chargeTypes": ["RECURRENT"],
  "minutesToExpire": 60,
  "externalReference": "<userId>:<planCode>:YEARLY",
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

Mensal usa o mesmo payload com `"cycle": "MONTHLY"`, `value` da tabela mensal e `externalReference` `…:MONTHLY`.

`endDate` fica de fora para renovar até o pescador cancelar. O `successUrl` só mostra “estamos confirmando”. `GET /me` continua `free` (ou o plano anterior) até `PAYMENT_CONFIRMED` / `CHECKOUT_PAID`.

No **upgrade**, o `items[].value` da primeira cobrança é o valor proporcional (abaixo). A recorrência **não** pode ficar nesse valor reduzido: depois do pagamento ela vai para `RecurringPrice` (anual ou mensal de catálogo na hora do upgrade). Renovação futura acompanha o catálogo.

## Reajuste de tabela

A tabela (`Plans.MonthlyPriceCents`, editável em `/admin/planos`) é o preço de **catálogo**. Mudar a tabela **não cobra a mais** no meio do período já pago.

| Ciclo da assinatura ativa | O que acontece se a tabela mudar |
| --- | --- |
| `YEARLY` no meio do ano | Nada agora. Sem boleto complementar, sem estorno. A **renovação** (próximo aniversário) cobra o novo anual de catálogo (`mensal × 12 × 0,80`). `PUT` no Asaas só na cobrança futura. |
| `MONTHLY` | A **próxima** fatura usa o mensal novo. O mês já pago não é complementado nem estornado. |

Não existe recálculo retroativo. Não chama `/refund` por reajuste. Não gera cobrança avulsa pela diferença dos dias restantes.

Conta pode mostrar: “Este ano você pagou R$ 191,04 · a renovação será R$ 210,24”.

## Upgrade com desconto proporcional

Upgrade = destino com tabela mensal **maior** (Arrais → Mestre → Capitão). O `PlanCode` novo vale **na hora** do `PAYMENT_CONFIRMED`. Não há estorno no cartão da assinatura antiga: o que ainda restava vira desconto na primeira parcela do plano novo.

```text
dias_periodo    = max(1, dias corridos de PeriodStart até CurrentPeriodEnd)
dias_restantes  = max(0, dias corridos de agora até CurrentPeriodEnd)
crédito         = arredondar(preço_contratado_atual × dias_restantes / dias_periodo; 2)
primeira_parcela = arredondar(max(0,01; preço_catálogo_novo − crédito); 2)
renovação       = catálogo vigente na hora de cada renovação (YEARLY ou MONTHLY)
CurrentPeriodEnd do plano novo = agora + 1 ano (YEARLY) ou + 1 mês (MONTHLY)
```

Exemplo: Arrais anual R$ 143,04, 100 dias usados, 265 restantes, período de 365 dias.

| | Valor |
| --- | --- |
| Crédito (265/365 de R$ 143,04) | R$ 103,85 |
| Anual Mestre | R$ 191,04 |
| **Paga hoje** | **R$ 87,19** |
| Próxima renovação (daqui a 1 ano) | R$ 191,04 |

O crédito usa o **valor pago neste período** (não o catálogo novo, se a tabela subiu no meio). O destino usa o **catálogo vigente**. Upgrade mensal→anual do mesmo plano é permitido (ciclo maior); anual→mensal no meio do período não.

O checkout hospedado cobra `primeira_parcela`. Em seguida a API grava `RecurringPrice` no Asaas (`PUT`, sem mexer na cobrança já paga) e faz `DELETE` da assinatura antiga **sem** `/refund`.

Assinatura `canceled` com `accessUntil` no futuro ainda gera crédito: o período foi pago.

## Papel de cada lado

```text
apps/web                         /premium escolhe plano e ciclo (mês ou ano)
                                 POST /billing/checkout { planCode, cycle }
                                 Conta → cancelar renovação
apps/api                         cria checkout do plano, aplica PlanCode no webhook
                                 cancela recorrência sem refund
Asaas                            tela de cartão, token, cobrança, webhooks
PostgreSQL                       BillingCustomer, BillingSubscription, BillingWebhookEvent
```

Regras de pesca, fórmula e entitlements permanecem na API. O frontend não “libera plano” localmente.

## Contratos

Base `/api/v1`. Autenticados, exceto o webhook.

| Método | Rota | Papel |
| --- | --- | --- |
| `GET` | `/billing/catalog` | Três planos com tabela mensal, anual de catálogo e, se couber, `quote` de upgrade |
| `POST` | `/billing/checkout` | Body `{ planCode, cycle: "MONTHLY" \| "YEARLY" }` |
| `GET` | `/billing/subscription` | Estado da assinatura da conta |
| `POST` | `/billing/subscription/cancel` | Encerra a recorrência; **não estorna**; o plano pago segue até o fim do período |
| `POST` | `/webhooks/asaas` | Público. Valida `asaas-access-token`. Sem JWT |

`POST /billing/checkout`:

- exige sessão válida, conta ativa, `planCode` em `arrais` | `premium` | `capitao` (`mestre` → `premium`) e `cycle` em `MONTHLY` | `YEARLY`;
- recusa o **mesmo** plano e **mesmo** ciclo se já há assinatura `active` ou período pago vigente;
- **upgrade** (tabela maior, ou mensal→anual do mesmo plano): permitido; `PlanCode` novo no `PAYMENT_CONFIRMED`; primeira parcela proporcional; `RecurringPrice` do destino = catálogo da hora (a renovação seguinte pode acompanhar tabela nova); assinatura antiga removida **sem** `/refund`;
- **downgrade** (tabela menor ou anual→mensal no meio do período): recusa (`plan_downgrade_period`);
- recusa checkout `ACTIVE` não expirado do mesmo usuário, `planCode` e `cycle`;
- a chave Asaas nunca sai da API.

`GET /billing/catalog`:

```json
{
  "enabled": true,
  "discountPercent": 20,
  "plans": [
    {
      "code": "arrais",
      "name": "Arrais",
      "monthlyPriceCents": 1490,
      "annualPriceCents": 14304
    },
    {
      "code": "premium",
      "name": "Mestre",
      "monthlyPriceCents": 1990,
      "annualPriceCents": 19104,
      "quotes": [
        {
          "kind": "upgrade",
          "cycle": "YEARLY",
          "remainingDays": 265,
          "creditCents": 10385,
          "firstChargeCents": 8719,
          "renewalPriceCents": 19104
        }
      ]
    }
  ]
}
```

`quotes` só aparece nos destinos permitidos, com período pago vigente, um item por ciclo (`MONTHLY` ou `YEARLY`). Sem assinatura, a primeira cobrança é o preço de catálogo do ciclo escolhido (`monthlyPriceCents` ou `annualPriceCents`).

`GET /billing/subscription` e o bloco em `GET /me`:

```json
{
  "billing": {
    "status": "active",
    "planCode": "premium",
    "cycle": "YEARLY",
    "catalogMonthlyPrice": 19.90,
    "catalogAnnualPrice": 191.04,
    "contractedPrice": 191.04,
    "renewalPrice": 191.04,
    "discountPercent": 20,
    "renewsAt": "2027-09-08",
    "accessUntil": "2027-09-08",
    "cancelAtPeriodEnd": false
  }
}
```

`contractedPrice` é o que vale **neste período** (já pago). `renewalPrice` é o catálogo para a próxima cobrança. Se a tabela subir no meio do anual, `contractedPrice` permanece e `renewalPrice` muda — sem cobrar a diferença agora. No mensal, a próxima fatura já é `renewalPrice`.

| `status` | Significado |
| --- | --- |
| `inactive` | Sem assinatura (`free`, ou plano só pelo admin) |
| `pending` | Checkout aberto, ainda sem pagamento |
| `active` | Pago; `cancelAtPeriodEnd: false` renova no aniversário |
| `past_due` | Cobrança da renovação atrasada |
| `canceled` | Recorrência encerrada; `accessUntil` é o fim do período já pago |

Ausente ou `inactive` = comportamento atual da conta.

## Cancelamento da recorrência (sem estorno)

Cancelar **para a renovação**. O valor do período já pago não volta. Não existe botão de reembolso.

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
- `Cycle` (`MONTHLY` ou `YEARLY`)
- `Price` (valor da **primeira** cobrança)
- `RecurringPrice` (catálogo para a **próxima** renovação; atualiza se a tabela mudar)
- `PeriodStart`
- `CurrentPeriodEnd` (agora + 1 mês ou + 1 ano, conforme o ciclo)
- `CancelAtPeriodEnd`
- `ExternalReference` (`userId:planCode:cycle`)

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
| `SUBSCRIPTION_CREATED` | Grava `sub_…`; no upgrade, `PUT` para `RecurringPrice` sem alterar a cobrança já paga; `DELETE` da assinatura antiga sem `/refund` |
| `SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED` | Se `CancelAtPeriodEnd`, só confirma o fim da recorrência. Senão, carência e depois `free` |
| `PAYMENT_CONFIRMED` | `PlanCode` do item na **hora**; `PeriodStart = agora`; `CurrentPeriodEnd` = +1 mês ou +1 ano; notificação “Seu plano agora é {nome}.” |
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
| `PUBLIC_APP_ORIGIN` | Origem HTTPS para `callback.*` |

O preço de catálogo **não** vem do ambiente: vive em `Plans.MonthlyPriceCents`. Sem `ASAAS_API_KEY`, `/premium` permanece vitrine e `POST /billing/checkout` responde `503` (`billing_disabled`).

O webhook no painel Asaas aponta para `https://<domínio>/api/v1/webhooks/asaas`.

## Frontend

- `/premium`: cada card oferece **mês** (tabela) e **ano** (−20%). No upgrade, o CTA usa `quotes[].firstChargeCents` e deixa claro que o plano novo começa na hora. Se a tabela mudar no meio do anual, a Conta mostra o valor deste período e o da renovação, sem cobrar a diferença agora. Sem chave, permanece “A cobrança ainda não começa por aqui.”
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

## Fora desta integração

- Pix
- Boleto
- Proration / crédito no **downgrade** (só no upgrade)
- Parcelamento `INSTALLMENT`
- Split e checkout de parceiros
- Formulário de cartão no PWA
- Mercado Pago
- Estorno pelo app
- Alterar issuer JWT, cookie, fórmula da nota ou o código `premium` do Mestre

Sandbox primeiro. Produção só com conta Asaas aprovada para cartão.
