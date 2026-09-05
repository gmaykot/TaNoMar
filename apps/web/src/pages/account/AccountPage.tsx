import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Heart, MapPinned, Plus, Shield, Users, Waves } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isAdmin } from '@/features/auth/types/auth';
import { updatePreferences } from '@/features/auth/services/preferencesService';
import { PageHeader } from '@/pages/shared/PageHeader';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { routes } from '@/shared/constants/routes';
import accountStyles from './account.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AccountPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const user = auth.user;
  const canCreate = (user?.entitlements.maxPersonalSpots ?? 0) > 0;
  const [region, setRegion] = useState(user?.preferences.region ?? 'Florianópolis');
  const [windUnit, setWindUnit] = useState(user?.preferences.windUnit ?? 'kmh');
  const [forecastNotifications, setForecastNotifications] = useState(
    user?.preferences.forecastNotifications ?? true,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Conta"
        title="Sua área."
        description="Gerencie pesqueiros, preferências e a sessão nesta página."
      />
      <Card className={accountStyles.profile}>
        <strong>{user?.name}</strong>
        <span>{user?.email}</span>
        <small>
          Plano {user?.plan.name ?? ''}. Pesqueiros pessoais:{' '}
          {user?.entitlements.maxPersonalSpots ?? 0}. Favoritos:{' '}
          {user?.entitlements.maxFavorites ?? 0}. Alertas de previsão ficam reservados no plano (
          {user?.entitlements.maxAlerts ?? 0}), sem cadastro nesta versão.
        </small>
      </Card>
      <section className={accountStyles.shortcuts} aria-label="Atalhos da conta">
        <Link className={accountStyles.shortcut} to={routes.locationsMine}>
          <span>
            <MapPinned size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Meus pesqueiros</strong>
            <small>Abra os locais que você cadastrou.</small>
          </div>
        </Link>
        <Link className={accountStyles.shortcut} to={routes.locationsFavorites}>
          <span>
            <Heart size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Favoritos</strong>
            <small>Veja os pontos que você marcou.</small>
          </div>
        </Link>
        {canCreate ? (
          <Link className={accountStyles.shortcut} to={routes.locationNew}>
            <span>
              <Plus size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Novo local</strong>
              <small>Cadastre um pesqueiro pessoal.</small>
            </div>
          </Link>
        ) : (
          <p className={accountStyles.note}>
            Pesqueiros pessoais entram no plano Premium. Os favoritos e as praias oficiais continuam
            disponíveis.
          </p>
        )}
        {isAdmin(user) ? (
          <Link className={accountStyles.shortcut} to={routes.admin}>
            <span>
              <Shield size={18} aria-hidden="true" />
            </span>
            <div>
              <strong>Administração</strong>
              <small>Modere locais e gerencie planos das contas.</small>
            </div>
          </Link>
        ) : null}
      </section>
      <Card className={accountStyles.info}>
        <h2>
          <Users size={18} aria-hidden="true" /> Comunidade
        </h2>
        <p>
          Relatos de condição e perigo ficam na página de cada local público ou compartilhado
          aprovado. Quem favoritou o local recebe um aviso no sino do topo. Você pode apagar o
          próprio relato.
        </p>
        <Link className={styles.backLink} to={routes.locations}>
          Ver locais
        </Link>
      </Card>
      <Card className={accountStyles.info}>
        <h2>
          <Waves size={18} aria-hidden="true" /> Praias
        </h2>
        <p>
          O perfil costeiro (praia aberta, semiaberta ou protegida) é definido ao criar ou editar um
          pesqueiro.
        </p>
        <Link
          className={styles.backLink}
          to={canCreate ? routes.locationNew : routes.locationsMine}
        >
          {canCreate ? 'Novo pesqueiro' : 'Meus pesqueiros'}
        </Link>
      </Card>
      <Card className={accountStyles.info}>
        <h2>
          <BookOpen size={18} aria-hidden="true" /> Fontes
        </h2>
        <p>Veja de onde vêm o clima, a nota de pesca, os locais e os relatos da comunidade.</p>
        <Link className={styles.backLink} to={routes.about}>
          Ver fontes
        </Link>
      </Card>
      <Card className={accountStyles.formCard}>
        <h2>Preferências</h2>
        <form
          className={formStyles.form}
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void updatePreferences({ region, windUnit, forecastNotifications })
              .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ['me'] });
              })
              .catch(() => setError('Não foi possível salvar as preferências.'))
              .finally(() => setPending(false));
          }}
        >
          <label className={formStyles.field}>
            <span>Região</span>
            <input value={region} onChange={(event) => setRegion(event.target.value)} />
          </label>
          <label className={formStyles.field}>
            <span>Unidade de vento</span>
            <select value={windUnit} onChange={(event) => setWindUnit(event.target.value)}>
              <option value="kmh">km/h</option>
              <option value="kt">nós</option>
            </select>
          </label>
          <label className={formStyles.choice}>
            <input
              type="checkbox"
              checked={forecastNotifications}
              onChange={(event) => setForecastNotifications(event.target.checked)}
            />
            <span>
              Quero notificações de previsão
              <small>
                Quando os alertas existirem, usaremos esta preferência. A caixa atual fica no sino
                do topo.
              </small>
            </span>
          </label>
          {error ? <p className={formStyles.error}>{error}</p> : null}
          <Button type="submit" disabled={pending}>
            Salvar preferências
          </Button>
        </form>
      </Card>
      <Button variant="secondary" onClick={() => void auth.logout()}>
        Sair
      </Button>
    </div>
  );
}
