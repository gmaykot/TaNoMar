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
  Sparkles,
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
import { SubscriptionBillingCard } from '@/features/billing/components/SubscriptionBillingCard';
import { useLocations } from '@/features/locations/hooks/useLocations';
import { PageHeader } from '@/pages/shared/PageHeader';
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
  const paid = isPaidPlan(user);
  const billingEnabled = user?.billing?.enabled === true;
  const pendingCheckout = user?.billing?.status === 'pending';

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

      <section className={accountStyles.accountSection} aria-labelledby="account-subscription">
        <h2 id="account-subscription">Assinatura</h2>
        <SubscriptionBillingCard
          planName={user?.plan.name}
          billing={user?.billing}
          isPaid={paid}
          showPlansLink
        />
        <div className={accountStyles.shortcuts}>
          <AccountShortcut
            to={paid || pendingCheckout ? `${routes.premium}#assinatura` : routes.premium}
            icon={Sparkles}
            title={
              pendingCheckout
                ? 'Continuar pagamento'
                : paid
                  ? 'Gerenciar assinatura'
                  : 'Conhecer os planos'
            }
            description={
              pendingCheckout
                ? 'Há um checkout aberto. Continue no Asaas para concluir.'
                : paid
                  ? billingEnabled
                    ? 'Cancele a renovação para voltar ao Free no fim do período, ou troque de plano.'
                    : 'Abra a página da assinatura para ver o plano atual e os demais comandos.'
                  : 'Arrais, Mestre ou Capitão: mais contexto para planejar a saída.'
            }
          />
        </div>
      </section>

      <section className={accountStyles.accountSection} aria-labelledby="account-preferences">
        <h2 id="account-preferences">Preferências</h2>
        <div className={accountStyles.shortcuts}>
          <AccountShortcut
            to={routes.accountPreferences}
            icon={Settings}
            title="Previsão e regiões"
            description="Escolha o foco, as regiões e a exibição."
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
            description="Planeje a próxima saída e registre o resultado neste aparelho."
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
