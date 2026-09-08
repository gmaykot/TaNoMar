import { useState } from 'react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import formStyles from '@/features/locations/components/spotForm.module.css';
import type { PlanCatalog } from '@/features/subscription/subscriptionPlans';
import {
  inputToUpdate,
  planModuleFields,
  planToInput,
  type AdminPlanInput,
  type AdminPlanUpdate,
} from '../types/adminPlan';
import styles from './adminPlans.module.css';

function availabilityMessage(plan: PlanCatalog) {
  if (plan.code === 'free') return 'O plano gratuito não pode ser desligado.';
  if (plan.enabled && plan.activeUserCount === 1) {
    return 'Há 1 conta ativa neste plano. Mova essa conta em Usuários antes de desligar.';
  }
  if (plan.enabled && plan.activeUserCount > 1) {
    return `Há ${plan.activeUserCount} contas ativas neste plano. Mova essas contas em Usuários antes de desligar.`;
  }
  return 'Desligado some da assinatura e não recebe contas novas.';
}

interface AdminPlanCardProps {
  plan: PlanCatalog;
  pending?: boolean;
  error?: string | null;
  onSave: (input: AdminPlanUpdate) => void;
}

export function AdminPlanCard({ plan, pending = false, error, onSave }: AdminPlanCardProps) {
  const [form, setForm] = useState(() => planToInput(plan));
  const [localError, setLocalError] = useState<string | null>(null);

  function patch<K extends keyof AdminPlanInput>(key: K, next: AdminPlanInput[K]) {
    setForm((current) => ({ ...current, [key]: next }));
  }

  const isFree = plan.code === 'free';
  const hasActiveUsers = plan.enabled && plan.activeUserCount > 0;
  const canToggleEnabled = !isFree && !hasActiveUsers;
  const availabilityHint = availabilityMessage(plan);

  return (
    <Card
      as="article"
      className={`${styles.card} ${plan.enabled ? '' : styles.cardDisabled}`}
      aria-labelledby={`admin-plan-${plan.code}`}
    >
      <div className={styles.header}>
        <div>
          <h2 id={`admin-plan-${plan.code}`}>{plan.name}</h2>
          <p className={styles.code}>
            Código <strong>{plan.code}</strong>
            {plan.code === 'premium' ? ' · estável para contas já assinantes' : null}
          </p>
        </div>
        <div className={styles.badges}>
          {plan.enabled ? null : <span className={styles.badgeWarn}>Desligado</span>}
          {plan.featured ? <span className={styles.badge}>Mais escolhido</span> : null}
        </div>
      </div>
      <form
        className={formStyles.form}
        onSubmit={(event) => {
          event.preventDefault();
          const payload = inputToUpdate(form);
          if (!payload) {
            setLocalError('Informe um preço mensal válido.');
            return;
          }
          setLocalError(null);
          onSave(payload);
        }}
      >
        <label className={formStyles.choice}>
          <input
            type="checkbox"
            checked={form.enabled}
            disabled={!canToggleEnabled}
            onChange={(event) => patch('enabled', event.target.checked)}
          />
          <span>
            Plano disponível
            <small>{availabilityHint}</small>
          </span>
        </label>
        <label className={formStyles.field}>
          <span>Nome do plano</span>
          <input
            value={form.name}
            maxLength={40}
            required
            onChange={(event) => patch('name', event.target.value)}
          />
        </label>
        <label className={formStyles.field}>
          <span>Texto de apoio</span>
          <input
            value={form.tagline}
            maxLength={160}
            onChange={(event) => patch('tagline', event.target.value)}
          />
        </label>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>Preço mensal (R$)</span>
            <input
              type="number"
              min={0}
              max={9999}
              step={0.01}
              inputMode="decimal"
              value={form.monthlyPrice}
              onChange={(event) => patch('monthlyPrice', event.target.value)}
            />
          </label>
          <label className={formStyles.field}>
            <span>Ordem na vitrine</span>
            <input
              type="number"
              min={0}
              max={99}
              value={form.sortOrder}
              onChange={(event) => patch('sortOrder', Number(event.target.value))}
            />
          </label>
        </div>
        <label className={formStyles.choice}>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => patch('featured', event.target.checked)}
          />
          <span>
            Destacar como mais escolhido
            <small>Só um plano fica em destaque na tela de assinatura.</small>
          </span>
        </label>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>Dias de previsão</span>
            <input
              type="number"
              min={1}
              max={8}
              value={form.maxForecastDays}
              onChange={(event) => patch('maxForecastDays', Number(event.target.value))}
            />
          </label>
          <label className={formStyles.field}>
            <span>Locais pessoais</span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxPersonalSpots}
              onChange={(event) => patch('maxPersonalSpots', Number(event.target.value))}
            />
          </label>
        </div>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>Favoritos</span>
            <input
              type="number"
              min={0}
              max={200}
              value={form.maxFavorites}
              onChange={(event) => patch('maxFavorites', Number(event.target.value))}
            />
          </label>
          <label className={formStyles.field}>
            <span>Alertas</span>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxAlerts}
              onChange={(event) => patch('maxAlerts', Number(event.target.value))}
            />
          </label>
        </div>
        <fieldset className={styles.modules}>
          <legend>Módulos do plano</legend>
          {planModuleFields.map((module) => (
            <label className={formStyles.choice} key={module.key}>
              <input
                type="checkbox"
                checked={form[module.key]}
                onChange={(event) => patch(module.key, event.target.checked)}
              />
              <span>
                {module.label}
                <small>{module.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {localError || error ? <p className={formStyles.error}>{localError || error}</p> : null}
        <Button type="submit" disabled={pending}>
          Salvar plano
        </Button>
      </form>
    </Card>
  );
}
