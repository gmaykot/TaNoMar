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
- **Upgrade** (tabela maior) começa na hora. A primeira cobrança é `anual_novo − crédito_proporcional` dos dias que ainda restavam no plano atual. A renovação seguinte cobra o anual cheio do plano novo. Não há estorno no cartão da assinatura antiga.
- Cancelar a recorrência chama `DELETE /v3/subscriptions/{id}` e **não** chama `/refund`. O `PlanCode` pago permanece até o fim do período.

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`.

## Motivo

Três SKUs no Asaas batem com `PlanRules` (Arrais, Mestre, Capitão). O ciclo anual com desconto é a oferta comercial. No upgrade, o comando novo vale na hora e o que já foi pago vira desconto na primeira parcela — sem devolver dinheiro no cartão. Cancelar encerra a renovação e preserva o valor já pago. Pix, boleto e SKU mensal no checkout ficam para depois.

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

Upgrade (ex.: Arrais → Mestre), ainda com período pago:

```text
POST /billing/checkout { planCode: "premium" }
        │
        ▼
primeira cobrança = anual(Mestre) − crédito dos dias restantes
        │
        ▼
paga no Asaas → PlanCode = premium na hora
assinatura antiga DELETE sem /refund
renovação daqui a 1 ano = anual cheio do Mestre
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
- Upgrade no meio do ano: plano novo na hora; primeira parcela com desconto proporcional; recorrência futura no valor cheio. Downgrade só depois do período pago (ou pelo admin).
- Bootstrap admin permanece Mestre (`premium`) mesmo se um webhook tentar rebaixar.
- Fora da primeira entrega: Pix, SKU mensal, parcelamento, split, checkout de parceiros, botão de estorno.

Detalhe: [billing.md](../billing.md).
