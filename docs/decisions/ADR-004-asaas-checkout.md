# ADR-004 — Checkout Premium com cartão via Asaas

## Status

Proposta.

## Contexto

O TáNoMar já diferencia `free` e `premium` em `User.PlanCode`. A página `/premium` descreve os recursos e deixa explícito que ainda não inicia cobrança. Hoje só o admin troca o plano em `PUT /admin/users/{id}/plan`. Não há CPF, cliente de pagamento nem assinatura no modelo.

A vitrine de parceiros permanece fora disto: o app não vende nem intermedia produto de terceiro (`docs/partners.md`).

A necessidade é cobrar o plano Premium com cartão de crédito, sem o PWA lidar com número do cartão e sem fila externa (um container no Coolify).

## Decisão

Integrar o **Asaas Checkout hospedado**, somente cartão, com cobrança **recorrente anual** e 20% de desconto sobre o equivalente a 12 meses.

- `billingTypes: ["CREDIT_CARD"]`
- `chargeTypes: ["RECURRENT"]`
- `subscription.cycle: "YEARLY"`
- Preço cobrado: `arredondar(preço_mensal_de_tabela × 12 × 0,80; 2)`
- A API cria o checkout; o pescador paga na página do Asaas; o plano sobe só depois do webhook.
- A conta pode **cancelar a recorrência**. Isso chama `DELETE /v3/subscriptions/{id}` no Asaas, **não** chama estorno (`POST /v3/payments/{id}/refund`). O Premium permanece até o fim do período já pago.

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`. Não usar a API de cobrança com dados de cartão no backend.

## Motivo

O Checkout hospedado entrega a tela de cartão, tokenização e PCI (SAQ A) no Asaas. O PWA só redireciona. O ciclo anual com desconto é a oferta comercial; a recorrência `YEARLY` cobra de novo só no ano seguinte. Cancelar encerra essa renovação e preserva o valor já pago — no Asaas, remover a assinatura não estorna cobranças confirmadas. Pix, boleto, mensal como SKU à parte e parcelamento avulso ficam para depois.

A alternativa de tokenizar no app (`creditCardToken` + `POST /v3/payments`) manteria o pescador na origem, mas exige formulário PCI, 3DS e mais superfície. Não é o primeiro passo.

## Fluxo

```text
Pescador em /premium (autenticado, plano free)
        │
        ▼
POST /api/v1/billing/checkout     ← API cria sessão no Asaas
        │                         (chave só no servidor)
        ▼
302 / JSON { checkoutUrl }        ← redireciona para asaas.com/checkoutSession
        │
        ▼
Pagador informa cartão no Asaas
        │
        ├── cancela / expira → /premium?checkout=cancel|expired
        └── paga
                │
                ├── browser → /premium?checkout=success  (só UX)
                └── Asaas POST /api/v1/webhooks/asaas
                        CHECKOUT_PAID
                        SUBSCRIPTION_CREATED
                        PAYMENT_CONFIRMED
                                │
                                ▼
                        PlanCode = premium + notificação
```

Cancelar a renovação (conta autenticada):

```text
POST /api/v1/billing/subscription/cancel
        │
        ▼
DELETE Asaas /v3/subscriptions/{id}   ← para a recorrência
        │                             (não chama /refund)
        ▼
CancelAtPeriodEnd = true
PlanCode permanece premium até CurrentPeriodEnd
        │
        ▼
Worker no vencimento → PlanCode = free + notificação
```

A fonte da verdade do acesso é o webhook (e o fim do período pago), não o retorno do browser.

## Consequências

- Novo cliente HTTP na API para `https://api.asaas.com/v3` (sandbox: `https://api-sandbox.asaas.com/v3`).
- Segredos só no Coolify: chave de API e token do webhook. Nunca `ASAAS_API_KEY` no bundle Vite.
- CPF/CNPJ e endereço passam a ser dados de faturamento. O Google Sign-In não os fornece; o Asaas pode coletá-los no checkout, e a API guarda o `customer` devolvido.
- `PlanCode` continua o interruptor de entitlements. Billing não recalcula nota nem altera fórmula.
- Admin continua podendo promover ou rebaixar. Webhook não rebaixa a conta de bootstrap.
- Renovação falha (`PAYMENT_OVERDUE`) volta a `free` depois de uma carência curta, com aviso no inbox.
- `SUBSCRIPTION_DELETED` após cancelamento pelo usuário **não** rebaixa na hora: só marca a recorrência encerrada.
- Fora da primeira entrega: Pix, SKU mensal no checkout, parcelamento `INSTALLMENT`, split, checkout de parceiros, formulário de cartão no app, botão de estorno.

Detalhe de contratos, entidades, eventos e variáveis: [billing.md](../billing.md).
