# ADR-004 — Checkout de assinatura com cartão via Asaas

## Status

Proposta. Alinhada aos planos de `cursor/planos-assinatura-arrais-mestre-capitao-d738`.

## Contexto

A conta nasce em `free`. Planos pagos na interface: **Arrais** (`arrais`), **Mestre** (`premium`) e **Capitão** (`capitao`). O código `premium` permanece estável (Mestre). Recursos qualitativos valem para qualquer plano pago; cotas mudam por plano. `/premium` ainda não cobra. O admin atribui o plano em `PUT /admin/users/{id}/plan`.

A vitrine de parceiros permanece fora disto (`docs/partners.md`).

A necessidade é cobrar Arrais, Mestre ou Capitão com cartão, sem o PWA lidar com número do cartão e sem fila externa.

## Decisão

Integrar o **Asaas Checkout hospedado**, somente cartão, um checkout por plano, cobrança **recorrente anual** com 20% de desconto sobre 12 meses da tabela daquele plano.

- `billingTypes: ["CREDIT_CARD"]`
- `chargeTypes: ["RECURRENT"]`
- `subscription.cycle: "YEARLY"`
- `POST /billing/checkout` recebe `{ planCode: "arrais" | "premium" | "capitao" }`
- Preço cobrado: `arredondar(mensal_do_plano × 12 × 0,80; 2)`
- O plano na conta sobe só depois do webhook, para o `PlanCode` comprado.
- Cancelar a recorrência chama `DELETE /v3/subscriptions/{id}` e **não** chama `/refund`. O `PlanCode` pago permanece até o fim do período.

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`.

## Motivo

Três SKUs no Asaas batem com `PlanRules` (Arrais, Mestre, Capitão). O ciclo anual com desconto é a oferta comercial. Cancelar encerra a renovação e preserva o valor já pago. Pix, boleto, SKU mensal no checkout e proration ficam para depois.

## Fluxo

```text
Pescador em /premium escolhe Arrais, Mestre ou Capitão
        │
        ▼
POST /api/v1/billing/checkout { planCode }
        │
        ▼
redirect → asaas.com/checkoutSession
        │
        ├── cancela / expira → /premium?checkout=cancel|expired
        └── paga
                │
                ├── browser → /premium?checkout=success  (só UX)
                └── webhook CHECKOUT_PAID + PAYMENT_CONFIRMED
                                │
                                ▼
                        PlanCode = arrais | premium | capitao
```

Cancelar a renovação:

```text
POST /api/v1/billing/subscription/cancel
        │
        ▼
DELETE Asaas /v3/subscriptions/{id}   (não chama /refund)
        │
        ▼
PlanCode permanece o plano pago até CurrentPeriodEnd
        │
        ▼
Worker no vencimento → PlanCode = free
```

## Consequências

- Um item Asaas por plano (nome Arrais, Mestre ou Capitão). `externalReference` liga usuário + `planCode`.
- Upgrade (tabela maior) no meio do ano: novo checkout do plano destino, paga o anual cheio, assinatura antiga é removida sem estorno. Downgrade só depois do período pago (ou pelo admin).
- Bootstrap admin permanece Mestre (`premium`) mesmo se um webhook tentar rebaixar.
- Fora da primeira entrega: Pix, SKU mensal, proration, parcelamento, split, checkout de parceiros, botão de estorno.

Detalhe: [billing.md](../billing.md).
