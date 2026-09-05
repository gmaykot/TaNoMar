import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BookOpen, Heart, Lock, MapPinned, Plus, Shield, Users, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isAdmin } from '@/features/auth/types/auth';
import { updatePreferences } from '@/features/auth/services/preferencesService';
import { RegionPicker } from '@/features/locations/components/RegionPicker';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { parseRegions, serializeRegions } from '@/features/locations/regions';
import { useDevicePush } from '@/features/notifications/hooks/useDevicePush';
import { PageHeader } from '@/pages/shared/PageHeader';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { routes } from '@/shared/constants/routes';
import accountStyles from './account.module.css';
import styles from '@/pages/shared/pages.module.css';

function AccountShortcut({
  to,
  icon: Icon,
  title,
  description,
  locked = false,
}: {
  to?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  locked?: boolean;
}) {
  const body = (
    <>
      <span>
        {locked ? <Lock size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
      </span>
      <div>
        <strong>{title}</strong>
        <small>{locked ? 'Premium' : description}</small>
      </div>
    </>
  );

  if (locked || !to) {
    return (
      <div
        className={`${accountStyles.shortcut} ${accountStyles.shortcutLocked}`}
        aria-disabled="true"
        aria-label={`${title} bloqueado no plano atual`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link className={accountStyles.shortcut} to={to}>
      {body}
    </Link>
  );
}

export function AccountPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const locations = useLocations();
  const user = auth.user;
  const canCreate = (user?.entitlements.maxPersonalSpots ?? 0) > 0;
  const canFavorite = (user?.entitlements.maxFavorites ?? 0) > 0;
  const ownedCount = locations.data?.filter((item) => item.isOwner).length ?? 0;
  const favoriteCount = locations.data?.filter((item) => item.isFavorite).length ?? 0;
  const canNotify = (user?.entitlements.maxAlerts ?? 0) > 0;
  const [regions, setRegions] = useState(() =>
    parseRegions(user?.preferences.region ?? 'Florianópolis'),
  );
  const [windUnit, setWindUnit] = useState(user?.preferences.windUnit ?? 'kmh');
  const [forecastNotifications, setForecastNotifications] = useState(
    user?.preferences.forecastNotifications ?? true,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const devicePush = useDevicePush();

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Conta" title="Sua área." description="Locais, preferências e sessão." />
      <Card className={accountStyles.profile}>
        <strong>{user?.name}</strong>
        <span>{user?.email}</span>
        <dl className={accountStyles.stats}>
          <div>
            <dt>Plano</dt>
            <dd>{user?.plan.name ?? '—'}</dd>
          </div>
          <div>
            <dt>Locais</dt>
            <dd>{`${ownedCount} / ${user?.entitlements.maxPersonalSpots ?? 0}`}</dd>
          </div>
          <div>
            <dt>Favoritos</dt>
            <dd>{`${favoriteCount} / ${user?.entitlements.maxFavorites ?? 0}`}</dd>
          </div>
        </dl>
      </Card>
      <section className={accountStyles.shortcuts} aria-label="Atalhos da conta">
        <AccountShortcut
          to={routes.locationsMine}
          icon={MapPinned}
          title="Meus locais"
          description="Abra os locais que você cadastrou."
          locked={!canCreate}
        />
        <AccountShortcut
          to={routes.locationsFavorites}
          icon={Heart}
          title="Favoritos"
          description="Veja os pontos que você marcou."
          locked={!canFavorite}
        />
        {!canNotify ? (
          <AccountShortcut
            icon={Bell}
            title="Notificações"
            description="A caixa atual fica no sino do topo."
            locked
          />
        ) : null}
        {canCreate ? (
          <AccountShortcut
            to={routes.locationNew}
            icon={Plus}
            title="Novo local"
            description="Cadastre um local pessoal."
          />
        ) : null}
        {isAdmin(user) ? (
          <AccountShortcut
            to={routes.admin}
            icon={Shield}
            title="Administração"
            description="Modere locais e gerencie planos das contas."
          />
        ) : null}
      </section>
      <Card className={accountStyles.info}>
        <h2>
          <Users size={18} aria-hidden="true" /> Comunidade
        </h2>
        <p>
          Na página de cada local, pescadores relatam como está o mar. Qualquer um vê e publica;
          confirmar ou discordar é Premium.
        </p>
        <Link className={styles.backLink} to={routes.locations}>
          Ver locais
        </Link>
      </Card>
      <Card className={accountStyles.info}>
        <h2>
          <Waves size={18} aria-hidden="true" /> Perfil costeiro
        </h2>
        <p>
          O perfil costeiro (praia aberta, semiaberta ou protegida) é definido ao criar ou editar um
          local.
        </p>
        {canCreate ? (
          <Link className={styles.backLink} to={routes.locationNew}>
            Cadastrar local
          </Link>
        ) : (
          <span
            className={accountStyles.lockedLink}
            aria-disabled="true"
            aria-label="Cadastrar local bloqueado no plano atual"
          >
            <Lock size={16} aria-hidden="true" /> Premium
          </span>
        )}
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
            void updatePreferences({
              region: serializeRegions(regions),
              windUnit,
              forecastNotifications,
            })
              .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ['me'] });
              })
              .catch(() => setError('Não foi possível salvar as preferências.'))
              .finally(() => setPending(false));
          }}
        >
          <RegionPicker
            multiple
            value={regions}
            hint="Toque em um ou mais trechos da ilha que você acompanha."
            onChange={setRegions}
          />
          <label className={formStyles.field}>
            <span>Unidade de vento</span>
            <select value={windUnit} onChange={(event) => setWindUnit(event.target.value)}>
              <option value="kmh">km/h</option>
              <option value="kt">nós</option>
            </select>
          </label>
          {canNotify ? (
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
          ) : (
            <div
              className={`${formStyles.choice} ${accountStyles.choiceLocked}`}
              aria-disabled="true"
              aria-label="Notificações de previsão bloqueadas no plano atual"
            >
              <Lock size={16} aria-hidden="true" />
              <span>
                Notificações de previsão
                <small>Premium</small>
              </span>
            </div>
          )}
          {error ? <p className={formStyles.error}>{error}</p> : null}
          <Button type="submit" disabled={pending}>
            Salvar preferências
          </Button>
        </form>
      </Card>
      {devicePush.loading || devicePush.configured ? (
        <Card className={accountStyles.formCard}>
          <h2>Avisos no aparelho</h2>
          {devicePush.iosNeedsInstall ? (
            <p className={accountStyles.note}>
              No iPhone, instale o TáNoMar na Tela de Início para receber avisos com o app fechado.
            </p>
          ) : null}
          {devicePush.available ? (
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={devicePush.enabled}
                disabled={devicePush.pending}
                onChange={(event) => void devicePush.toggle(event.target.checked)}
              />
              <span>
                Receber avisos com o app fechado
                <small>O sino do topo continua para quando você estiver usando o app.</small>
              </span>
            </label>
          ) : !devicePush.iosNeedsInstall && !devicePush.loading ? (
            <p className={accountStyles.note}>
              Este navegador não permite avisos com o app fechado.
            </p>
          ) : null}
          {devicePush.error ? <p className={formStyles.error}>{devicePush.error}</p> : null}
        </Card>
      ) : null}
      <Button variant="secondary" onClick={() => void auth.logout()}>
        Sair
      </Button>
    </div>
  );
}
