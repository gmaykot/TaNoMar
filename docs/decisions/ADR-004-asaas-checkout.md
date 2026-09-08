# ADR-004 — Checkout de assinatura com cartão via Asaas

## Status

Proposta. Alinhada aos planos de `cursor/planos-assinatura-arrais-mestre-capitao-d738`.

## Contexto

A conta nasce em `free`. Planos pagos na interface: **Arrais** (`arrais`), **Mestre** (`premium`) e **Capitão** (`capitao`). O código `premium` permanece estável (Mestre). Recursos qualitativos valem para qualquer plano pago; cotas mudam por plano. `/premium` ainda não cobra. O admin atribui o plano em `PUT /admin/users/{id}/plan`.

A vitrine de parceiros permanece fora disto (`docs/partners.md`).

A necessidade é cobrar Arrais, Mestre ou Capitão com cartão, sem o PWA lidar com número do cartão e sem fila externa.

## Decisão

Integrar o **Asaas Checkout hospedado**, somente cartão, um checkout por plano e ciclo (`MONTHLY` ou `YEARLY`). O anual tem 20% de desconto sobre 12 meses da tabela vigente **no momento do contrato**.

- `billingTypes: ["CREDIT_CARD"]`
- `chargeTypes: ["RECURRENT"]`
- `POST /billing/checkout` recebe `{ planCode, cycle: "MONTHLY" | "YEARLY" }`
- Anual cobrado: `arredondar(mensal_tabela × 12 × 0,80; 2)` na data da contratação; esse valor **fica congelado** na assinatura (`RecurringPrice`)
- Mensal cobrado: tabela vigente; se o preço do plano mudar, a **próxima** cobrança mensal usa o novo valor
- Mudar a tabela **não** altera anual já contratado nem a renovação anual desse contrato
- **Upgrade** (tabela maior) começa na hora. A primeira cobrança tem desconto proporcional. Recorrência futura: anual congelado no catálogo da hora do upgrade, ou mensal acompanhando a tabela
- Cancelar a recorrência chama `DELETE /v3/subscriptions/{id}` e **não** chama `/refund`. O plano pago permanece até o fim do período

Não coletar PAN, CVV nem validade no TáNoMar. Não confirmar pagamento pelo `successUrl`.

## Motivo

Três SKUs no Asaas batem com `PlanRules`. Quem fecha o anual leva o preço daquele contrato até cancelar — reajuste de tabela não reescreve o que já foi assinado. Quem paga o mês acompanha a tabela na fatura seguinte. No upgrade, o comando novo vale na hora e o restante vira desconto na primeira parcela, sem estorno no cartão.

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
renovação daqui a 1 ano = anual **contratado** do Mestre (congelado)
```

Reajuste de tabela:

```text
ASAAS_*_MONTHLY_PRICE muda
        │
        ├── YEARLY ativo → RecurringPrice intacto; Asaas não é atualizado
        └── MONTHLY ativo → próxima fatura = tabela nova (PUT no Asaas)
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
- Preço anual contratado é imutável naquela assinatura, inclusive na renovação. Preço mensal vigente incide na próxima cobrança.
- Upgrade no meio do período: plano novo na hora; primeira parcela proporcional; sem estorno. Downgrade só depois do período pago (ou pelo admin).
- Bootstrap admin permanece Mestre (`premium`) mesmo se um webhook tentar rebaixar.
- Fora da primeira entrega: Pix, parcelamento, split, checkout de parceiros, botão de estorno.

Detalhe: [billing.md](../billing.md).
