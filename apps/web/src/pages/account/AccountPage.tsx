import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Handshake,
  Heart,
  Lock,
  MapPinned,
  Settings,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  hasPlanModule,
  isAdmin,
  isPaidPlan,
  showsPartners,
  SUBSCRIPTION_LOCK_LABEL,
} from '@/features/auth/types/auth';
import { formatBillingDate } from '@/features/billing/billing';
import { useCancelBillingSubscription } from '@/features/billing/hooks/useBillingCheckout';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { formatBrlFromCents } from '@/features/subscription/subscriptionPlans';
import { PageHeader } from '@/pages/shared/PageHeader';
import { ApiError } from '@/shared/api/errors';
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
        <small>{locked ? SUBSCRIPTION_LOCK_LABEL : description}</small>
      </div>
      {!locked ? (
        <ChevronRight className={accountStyles.shortcutChevron} size={18} aria-hidden="true" />
      ) : null}
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
  const locations = useLocations();
  const user = auth.user;
  const canCreate = (user?.entitlements.maxPersonalSpots ?? 0) > 0;
  const canFavorite = (user?.entitlements.maxFavorites ?? 0) > 0;
  const ownedCount = locations.data?.filter((item) => item.isOwner).length ?? 0;
  const favoriteCount = locations.data?.filter((item) => item.isFavorite).length ?? 0;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Conta"
        title="Sua conta."
        description="Perfil, preferências e acessos."
      />
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
            <dd>{ownedCount + ' / ' + (user?.entitlements.maxPersonalSpots ?? 0)}</dd>
          </div>
          <div>
            <dt>Favoritos</dt>
            <dd>{favoriteCount + ' / ' + (user?.entitlements.maxFavorites ?? 0)}</dd>
          </div>
        </dl>
      </Card>

      <BillingSummary />

      {!isPaidPlan(user) ? (
        <Link className={accountStyles.premiumCallout} to={routes.premium}>
          <strong>Conhecer os planos</strong>
          <small>Arrais, Mestre ou Capitão: mais contexto para planejar a saída.</small>
        </Link>
      ) : null}

      <section className={accountStyles.accountSection} aria-labelledby="account-preferences">
        <h2 id="account-preferences">Preferências</h2>
        <div className={accountStyles.shortcuts}>
          <AccountShortcut
            to={routes.accountPreferences}
            icon={Settings}
            title="Previsão e regiões"
            description="Escolha regiões, unidade de vento e indicadores."
          />
          <AccountShortcut
            to={routes.accountNotifications}
            icon={Bell}
            title="Notificações"
            description="Configure avisos da conta e deste aparelho."
          />
        </div>
      </section>

      <section className={accountStyles.accountSection} aria-labelledby="account-locations">
        <h2 id="account-locations">Seus locais</h2>
        <div className={accountStyles.shortcuts}>
          <AccountShortcut
            to={routes.locationsMine}
            icon={MapPinned}
            title="Meus locais"
            description={
              ownedCount === 1 ? '1 local cadastrado.' : ownedCount + ' locais cadastrados.'
            }
            locked={!canCreate}
          />
          <AccountShortcut
            to={routes.locationsFavorites}
            icon={Heart}
            title="Favoritos"
            description={
              favoriteCount === 1 ? '1 local favorito.' : favoriteCount + ' locais favoritos.'
            }
            locked={!canFavorite}
          />
        </div>
      </section>

      <section className={accountStyles.accountSection} aria-labelledby="account-app">
        <h2 id="account-app">Aplicativo</h2>
        <div className={accountStyles.shortcuts}>
          {showsPartners(user) ? (
            <AccountShortcut
              to={routes.partners}
              icon={Handshake}
              title="Parceiros"
              description="Lojas e guias da ilha."
            />
          ) : null}
          <AccountShortcut
            to={routes.about}
            icon={BookOpen}
            title="Sobre o TáNoMar"
            description="Entenda a previsão, a nota e as fontes utilizadas."
          />
          <AccountShortcut
            to={routes.diary}
            icon={BookOpen}
            title="Diário de pesca"
            description="Guarde o resultado das suas saídas neste aparelho."
            locked={!hasPlanModule(user, 'diary')}
          />
        </div>
      </section>

      {isAdmin(user) ? (
        <section className={accountStyles.accountSection} aria-labelledby="account-admin">
          <h2 id="account-admin">Administração</h2>
          <div className={accountStyles.shortcuts}>
            <AccountShortcut
              to={routes.admin}
              icon={Shield}
              title="Abrir painel administrativo"
              description="Moderação, usuários, planos e parceiros."
            />
          </div>
        </section>
      ) : null}

      <Button variant="secondary" onClick={() => void auth.logout()}>
        Sair
      </Button>
    </div>
  );
}

function formatReais(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return formatBrlFromCents(Math.round(value * 100));
}

function BillingSummary() {
  const auth = useAuth();
  const cancel = useCancelBillingSubscription();
  const billing = auth.user?.billing;
  if (!billing?.enabled) return null;
  const accessUntil = formatBillingDate(billing.accessUntil);
  const contracted = formatReais(billing.contractedPrice);
  const renewal = formatReais(billing.renewalPrice);
  const canCancel =
    (billing.status === 'active' || billing.status === 'past_due') && !billing.cancelAtPeriodEnd;
  const cancelError =
    cancel.error instanceof ApiError
      ? cancel.error.message
      : cancel.isError
        ? 'Não foi possível cancelar a renovação.'
        : null;

  function handleCancel() {
    const until = accessUntil ?? 'o fim do período já pago';
    if (
      !window.confirm(
        `Cancelar a renovação? Você continua com o plano até ${until}. Não há estorno.`,
      )
    ) {
      return;
    }
    cancel.mutate();
  }

  if (billing.status === 'inactive' && !isPaidPlan(auth.user)) return null;

  return (
    <Card className={accountStyles.billingCard}>
      <strong>Assinatura</strong>
      {billing.status === 'pending' ? (
        <p>Há um pagamento em aberto. Conclua ou gere outro checkout na página de Assinatura.</p>
      ) : null}
      {billing.status === 'past_due' ? (
        <p>A renovação está atrasada. Atualize o pagamento para manter o plano.</p>
      ) : null}
      {billing.cancelAtPeriodEnd && accessUntil ? (
        <p>
          Renovação cancelada · {auth.user?.plan.name} até {accessUntil}. Não há estorno.
        </p>
      ) : null}
      {canCancel && accessUntil ? <p>Acesso do período atual até {accessUntil}.</p> : null}
      {contracted && renewal && contracted !== renewal ? (
        <p>
          Neste período você pagou {contracted}. A renovação será {renewal}. A diferença não é
          cobrada agora.
        </p>
      ) : null}
      {cancelError ? <p className={accountStyles.billingError}>{cancelError}</p> : null}
      {canCancel ? (
        <Button variant="secondary" onClick={handleCancel} disabled={cancel.isPending}>
          {cancel.isPending ? 'Cancelando…' : 'Cancelar renovação'}
        </Button>
      ) : null}
      <Link className={styles.backLink} to={routes.premium}>
        Ver planos
      </Link>
    </Card>
  );
}
