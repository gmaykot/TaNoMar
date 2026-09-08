# ADR-004 — Checkout Premium com cartão via Asaas

## Status

Proposta.

## Contexto

O TáNoMar já diferencia `free` e `premium` em `User.PlanCode`. A página `/premium` descreve os recursos e deixa explícito que ainda não inicia cobrança. Hoje só o admin troca o plano em `PUT /admin/users/{id}/plan`. Não há CPF, cliente de pagamento nem assinatura no modelo.

A vitrine de parceiros permanece fora disto: o app não vende nem intermedia produto de terceiro (`docs/partners.md`).

A necessidade é cobrar o plano Premium com cartão de crédito, sem o PWA lidar com número do cartão e sem fila externa (um container no Coolify).

## Decisão

Integrar o **Asaas Checkout hospedado**, somente cartão, com cobrança **recorrente mensal**.

- `billingTypes: ["CREDIT_CARD"]`
- `chargeTypes: ["RECURRENT"]`
- `subscription.cycle: "MONTHLY"`
- A API cria o checkout; o pescador paga na página do Asaas; o plano sobe só depois do webhook.

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`. Não usar a API de cobrança com dados de cartão no backend.

## Motivo

O Checkout hospedado entrega a tela de cartão, tokenização e PCI (SAQ A) no Asaas. O PWA só redireciona. A recorrência casa com o plano contínuo que já governa previsão, locais, alertas e votos. Pix, boleto e parcelamento avulso ficam para depois.

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

A fonte da verdade do acesso é o webhook, não o retorno do browser.

## Consequências

- Novo cliente HTTP na API para `https://api.asaas.com/v3` (sandbox: `https://api-sandbox.asaas.com/v3`).
- Segredos só no Coolify: chave de API e token do webhook. Nunca `ASAAS_API_KEY` no bundle Vite.
- CPF/CNPJ e endereço passam a ser dados de faturamento. O Google Sign-In não os fornece; o Asaas pode coletá-los no checkout, e a API guarda o `customer` devolvido.
- `PlanCode` continua o interruptor de entitlements. Billing não recalcula nota nem altera fórmula.
- Admin continua podendo promover ou rebaixar. Webhook não rebaixa a conta de bootstrap.
- Renovação falha (`PAYMENT_OVERDUE`, `SUBSCRIPTION_INACTIVATED`) volta a `free` depois de uma carência curta, com aviso no inbox.
- Fora da primeira entrega: Pix, parcelamento `INSTALLMENT`, split, checkout de parceiros, formulário de cartão no app.

Detalhe de contratos, entidades, eventos e variáveis: [billing.md](../billing.md).
