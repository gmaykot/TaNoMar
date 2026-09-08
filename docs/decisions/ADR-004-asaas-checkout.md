# ADR-004 — Checkout de assinatura com cartão via Asaas

## Status

Aceita. Preço de catálogo em `Plans.MonthlyPriceCents`.

## Contexto

A conta nasce em `free`. Planos pagos na interface: **Arrais** (`arrais`), **Mestre** (`premium`) e **Capitão** (`capitao`). O código `premium` permanece estável (Mestre). Recursos qualitativos valem para qualquer plano pago; cotas mudam por plano. `/premium` ainda não cobra. O admin atribui o plano em `PUT /admin/users/{id}/plan`.

A vitrine de parceiros permanece fora disto (`docs/partners.md`).

A necessidade é cobrar Arrais, Mestre ou Capitão com cartão, sem o PWA lidar com número do cartão e sem fila externa.

## Decisão

Integrar o **Asaas Checkout hospedado**, somente cartão, um checkout por plano e ciclo (`MONTHLY` ou `YEARLY`). O anual tem 20% de desconto sobre 12 meses da tabela vigente **naquela cobrança**.

- `billingTypes: ["CREDIT_CARD"]`
- `chargeTypes: ["RECURRENT"]`
- `POST /billing/checkout` recebe `{ planCode, cycle: "MONTHLY" | "YEARLY" }`
- Anual cobrado: `arredondar(mensal_tabela × 12 × 0,80; 2)` na data da cobrança
- O período anual **já pago** não ganha cobrança extra se a tabela mudar no meio
- A **renovação** anual usa o catálogo vigente (novo anual com −20%)
- Mensal: se o preço mudar, a **próxima** fatura usa o novo valor
- **Upgrade** (tabela maior) começa na hora. A primeira cobrança tem desconto proporcional. Sem estorno no cartão antigo
- Cancelar a recorrência chama `DELETE /v3/subscriptions/{id}` e **não** chama `/refund`. O plano pago permanece até o fim do período

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`.

## Motivo

Três SKUs no Asaas batem com `PlanRules`. Reajuste no meio do ano **não cobra a diferença** do período já pago. A renovação anual e a próxima fatura mensal usam a tabela nova. No upgrade, o comando novo vale na hora e o restante vira desconto na primeira parcela, sem estorno no cartão.

## Fluxo

```text
Pescador em /premium escolhe Arrais, Mestre ou Capitão
        │
        ▼
POST /api/v1/billing/checkout { planCode, cycle }
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
POST /billing/checkout { planCode: "premium", cycle: "YEARLY" }
        │
        ▼
primeira cobrança = anual(Mestre) − crédito dos dias restantes
        │
        ▼
paga no Asaas → PlanCode = premium na hora
assinatura antiga DELETE sem /refund
renovação daqui a 1 ano = anual de **catálogo** vigente
```

Reajuste de tabela:

```text
Plans.MonthlyPriceCents muda em /admin/planos
        │
        ├── YEARLY vigente → não cobra a diferença agora
        │                     renovação = novo anual de catálogo (PUT só a cobrança futura)
        └── MONTHLY → próxima fatura = tabela nova
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

- Um item Asaas por plano e ciclo. `externalReference` liga usuário + `planCode` + `cycle`.
- Preço do período já pago não é complementado nem estornado se a tabela mudar no meio. Renovação anual e próxima fatura mensal usam o catálogo novo.
- Upgrade no meio do período: plano novo na hora; primeira parcela proporcional; sem estorno. Downgrade só depois do período pago (ou pelo admin).
- Bootstrap admin permanece Mestre (`premium`) mesmo se um webhook tentar rebaixar.
- Fora da primeira entrega: Pix, parcelamento, split, checkout de parceiros, botão de estorno.

Detalhe: [billing.md](../billing.md).
