import { useState } from 'react';
import { Bell, Lock, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useLocations } from '@/features/locations/hooks/useLocations';
import formStyles from '@/features/locations/components/spotForm.module.css';
import accountStyles from '@/pages/account/account.module.css';
import {
  createForecastAlert,
  deleteForecastAlert,
  getForecastAlerts,
  updateForecastAlert,
} from '../services/forecastAlertService';
import type { ForecastAlert } from '../types/forecastAlert';

const queryKey = ['forecast-alerts'] as const;

export function ForecastAlerts() {
  const auth = useAuth();
  const locations = useLocations();
  const queryClient = useQueryClient();
  const premium = auth.user?.plan.code === 'premium';
  const available = locations.data?.filter((item) => item.isEnabled) ?? [];
  const [spotId, setSpotId] = useState('');
  const [minimumScore, setMinimumScore] = useState(8);
  const [leadHours, setLeadHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const alerts = useQuery({ queryKey, queryFn: getForecastAlerts, enabled: premium });
  const create = useMutation({
    mutationFn: createForecastAlert,
    onSuccess: async () => {
      setSpotId('');
      setError(null);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (reason) =>
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o alerta.'),
  });
  const toggle = useMutation({
    mutationFn: updateForecastAlert,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });
  const remove = useMutation({
    mutationFn: deleteForecastAlert,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  if (!premium) {
    return (
      <Card className={accountStyles.formCard}>
        <div className={accountStyles.formHeader}>
          <h2>
            <Lock size={17} aria-hidden="true" /> Alertas de oportunidade
          </h2>
          <p>Premium: escolha um local, uma nota mínima e a antecedência do aviso.</p>
        </div>
      </Card>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!spotId) return;
    create.mutate({ spotId, minimumScore, leadHours });
  }

  return (
    <Card className={accountStyles.formCard}>
      <div className={accountStyles.formHeader}>
        <h2>
          <Bell size={17} aria-hidden="true" /> Alertas de oportunidade
        </h2>
        <p>
          Receba um aviso quando a previsão atingir sua nota mínima. Você pode criar até{' '}
          {auth.user?.entitlements.maxAlerts ?? 0} alertas.
        </p>
      </div>
      <form className={formStyles.form} onSubmit={submit}>
        <label className={formStyles.field}>
          <span>Local</span>
          <select value={spotId} onChange={(event) => setSpotId(event.target.value)} required>
            <option value="">Escolha um local</option>
            {available.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Nota mínima</span>
          <select
            value={minimumScore}
            onChange={(event) => setMinimumScore(Number(event.target.value))}
          >
            {[7, 8, 8.5, 9].map((score) => (
              <option key={score} value={score}>
                {score.toLocaleString('pt-BR')}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Antecedência</span>
          <select value={leadHours} onChange={(event) => setLeadHours(Number(event.target.value))}>
            <option value={6}>No mesmo dia</option>
            <option value={24}>Um dia antes</option>
            <option value={48}>Dois dias antes</option>
          </select>
        </label>
        {error ? <p className={formStyles.error}>{error}</p> : null}
        <Button type="submit" disabled={create.isPending || !spotId}>
          Criar alerta
        </Button>
      </form>
      {alerts.data?.length ? (
        <div className={accountStyles.metricChoices}>
          {alerts.data.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onToggle={() => toggle.mutate({ ...alert, isActive: !alert.isActive })}
              onDelete={() => remove.mutate(alert.id)}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function AlertRow({
  alert,
  onToggle,
  onDelete,
}: {
  alert: ForecastAlert;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={formStyles.choice}>
      <input
        type="checkbox"
        checked={alert.isActive}
        onChange={onToggle}
        aria-label={`Ativar alerta de ${alert.spotName}`}
      />
      <span>
        <strong>{alert.spotName}</strong>
        <small>
          Nota {alert.minimumScore.toLocaleString('pt-BR')} · {alert.leadHours}h antes
        </small>
      </span>
      <button type="button" aria-label={`Apagar alerta de ${alert.spotName}`} onClick={onDelete}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
