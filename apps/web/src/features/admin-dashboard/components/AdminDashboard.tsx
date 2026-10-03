import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { formatBrlFromCents } from '@/features/subscription/subscriptionPlans';
import { regionLabel } from '@/features/locations/regions';
import { routes } from '@/shared/constants/routes';
import type {
  AdminDashboardConcurrentUse,
  AdminDashboardCount,
  AdminDashboardSnapshot,
} from '../types/adminDashboard';
import styles from './adminDashboard.module.css';

interface AdminDashboardProps {
  snapshot?: AdminDashboardSnapshot;
  pending: boolean;
  error: boolean;
}

function formatCount(value: number) {
  return value.toLocaleString('pt-BR');
}

function quantity(value: number, singular: string, plural: string) {
  return `${formatCount(value)} ${value === 1 ? singular : plural}`;
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function share(count: number, total: number) {
  if (total <= 0 || count <= 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function HeroKpi({
  label,
  value,
  detail,
  to,
  warn,
}: {
  label: string;
  value: string;
  detail: string;
  to?: string;
  warn?: boolean;
}) {
  const className = `${to ? styles.kpiLink : styles.kpi} ${warn ? (to ? styles.kpiLinkWarn : styles.kpiWarn) : ''}`;
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </>
  );
  return to ? (
    <Link className={className} to={to}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function ConcurrentUseLink({ item }: { item: AdminDashboardConcurrentUse }) {
  return (
    <Link
      className={styles.attentionItem}
      to={`${routes.adminUsers}?busca=${encodeURIComponent(item.email)}`}
    >
      <strong>{item.name}</strong>
      <span>
        {item.planName} · {formatWhen(item.at)}
      </span>
      <small>{item.labels}</small>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Bars({
  items,
  total,
  labelOf,
}: {
  items: AdminDashboardCount[];
  total: number;
  labelOf?: (item: AdminDashboardCount) => string;
}) {
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li className={styles.bar} key={item.code}>
          <span>{labelOf ? labelOf(item) : item.name}</span>
          <strong>{formatCount(item.count)}</strong>
          <i style={{ '--bar': share(item.count, total) } as CSSProperties} />
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard({ snapshot, pending, error }: AdminDashboardProps) {
  if (pending) {
    return (
      <FeedbackState
        title="Painel gerencial"
        description="Somando contas, locais e assinaturas."
        busy
      />
    );
  }
  if (error || !snapshot) {
    return (
      <FeedbackState
        title="Painel indisponível"
        description="Não foi possível carregar os indicadores."
      />
    );
  }

  const { users, spots, billing, engagement, partners, attention } = snapshot;
  const updated = new Date(snapshot.generatedAt);
  const notices: Array<{ to: string; text: string; danger?: boolean }> = [];
  if (spots.sharedPending > 0) {
    notices.push({
      to: routes.adminSpots,
      text: `${quantity(spots.sharedPending, 'local na fila de moderação', 'locais na fila de moderação')}.`,
    });
  }
  if (billing.pastDue > 0) {
    notices.push({
      to: routes.adminUsers,
      danger: true,
      text: `${quantity(billing.pastDue, 'assinatura atrasada', 'assinaturas atrasadas')}.`,
    });
  }
  if (spots.officialWithoutCoordinates > 0) {
    notices.push({
      to: routes.adminOfficialSpots,
      text: `${quantity(spots.officialWithoutCoordinates, 'local do sistema sem coordenadas', 'locais do sistema sem coordenadas')}.`,
    });
  }

  return (
    <div className={styles.dashboard}>
      <p className={styles.updated}>
        Atualizado em {Number.isNaN(updated.getTime()) ? '—' : updated.toLocaleString('pt-BR')}
      </p>
      <Card as="section" className={styles.attention} aria-labelledby="dashboard-attention">
        <div className={styles.sectionHeader}>
          <h2 id="dashboard-attention">Atenção</h2>
        </div>
        <p className={styles.quiet}>Uso simultâneo dos últimos 7 dias e filas que pedem ação.</p>
        {notices.length === 0 && attention.concurrentUses.length === 0 ? (
          <p className={styles.quiet}>Nada pede atenção agora.</p>
        ) : (
          <>
            {notices.length ? (
              <div className={styles.notices}>
                {notices.map((notice) => (
                  <Link
                    key={notice.to + notice.text}
                    className={`${styles.notice} ${notice.danger ? styles.noticeDanger : ''}`}
                    to={notice.to}
                  >
                    {notice.text}
                  </Link>
                ))}
              </div>
            ) : null}
            {attention.concurrentUses.length ? (
              <ul className={styles.attentionList}>
                {attention.concurrentUses.map((item) => (
                  <li key={item.userId}>
                    <ConcurrentUseLink item={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </Card>
      <div className={styles.hero} aria-label="Indicadores principais">
        <HeroKpi
          label="Contas ativas"
          value={formatCount(users.active)}
          detail={`${quantity(users.newLast7Days, 'nova em 7 dias', 'novas em 7 dias')} · ${formatCount(users.total)} no total`}
          to={routes.adminUsers}
        />
        <HeroKpi
          label="Assinantes"
          value={formatCount(users.paid)}
          detail={`${formatCount(Math.max(0, users.total - users.paid))} sem plano pago ativo`}
          to={routes.adminUsers}
        />
        <HeroKpi
          label="Fila de locais"
          value={formatCount(spots.sharedPending)}
          detail={`${formatCount(spots.sharedApproved)} compartilhados no mapa`}
          to={routes.adminSpots}
          warn={spots.sharedPending > 0}
        />
        <HeroKpi
          label="Recorrência mensal"
          value={formatBrlFromCents(billing.monthlyRecurringCents)}
          detail={`${formatCount(billing.active)} assinaturas ativas`}
          to={routes.adminPlans}
        />
      </div>
      <div className={styles.grid}>
        <Card as="section" className={styles.section} aria-labelledby="dashboard-users">
          <div className={styles.sectionHeader}>
            <h2 id="dashboard-users">Usuários</h2>
            <Link to={routes.adminUsers}>Ver contas</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Bloqueadas" value={formatCount(users.blocked)} />
            <Stat label="Admins" value={formatCount(users.admins)} />
            <Stat label="Novas em 30 dias" value={formatCount(users.newLast30Days)} />
          </div>
          <Bars items={users.byPlan} total={users.total} />
        </Card>
        <Card as="section" className={styles.section} aria-labelledby="dashboard-spots">
          <div className={styles.sectionHeader}>
            <h2 id="dashboard-spots">Locais</h2>
            <Link to={routes.adminOfficialSpots}>Ver catálogo</Link>
          </div>
          <div className={styles.stats}>
            <Stat
              label="Oficiais no mapa"
              value={`${formatCount(spots.officialEnabled)} de ${formatCount(spots.official)}`}
            />
            <Stat label="Padrão do Free" value={formatCount(spots.officialFreeDefault)} />
            <Stat label="Pessoais" value={formatCount(spots.personal)} />
            <Stat label="Com câmera" value={formatCount(spots.officialWithWebcam)} />
          </div>
          <Bars
            items={spots.byRegion}
            total={spots.official}
            labelOf={(item) => regionLabel(item.code)}
          />
        </Card>
        <Card as="section" className={styles.section} aria-labelledby="dashboard-billing">
          <div className={styles.sectionHeader}>
            <h2 id="dashboard-billing">Assinaturas</h2>
            <Link to={routes.adminPlans}>Ver planos</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Mensais" value={formatCount(billing.monthlyCount)} />
            <Stat label="Anuais" value={formatCount(billing.yearlyCount)} />
            <Stat
              label="Cancelam no fim do período"
              value={formatCount(billing.cancelAtPeriodEnd)}
            />
            <Stat label="Checkout pendente" value={formatCount(billing.pendingCheckout)} />
            <Stat
              label="Acesso até o fim do ciclo"
              value={formatCount(billing.canceledWithAccess)}
            />
          </div>
        </Card>
        <Card as="section" className={styles.section} aria-labelledby="dashboard-usage">
          <div className={styles.sectionHeader}>
            <h2 id="dashboard-usage">Uso e parceiros</h2>
            <Link to={routes.adminPartners}>Ver vitrine</Link>
          </div>
          <div className={styles.stats}>
            <Stat label="Relatos no ar" value={formatCount(engagement.activeReports)} />
            <Stat label="Relatos em 7 dias" value={formatCount(engagement.reportsLast7Days)} />
            <Stat label="Alertas ativos" value={formatCount(engagement.activeAlerts)} />
            <Stat label="Locais nas previsões" value={formatCount(engagement.enabledSpots)} />
            <Stat label="Favoritos" value={formatCount(engagement.favorites)} />
            <Stat label="Aparelhos com push" value={formatCount(engagement.pushDevices)} />
            <Stat
              label="Parceiros publicados"
              value={`${formatCount(partners.published)} · ${formatCount(partners.featured)} em destaque`}
            />
            <Stat label="Parceiros em rascunho" value={formatCount(partners.unpublished)} />
          </div>
        </Card>
      </div>
    </div>
  );
}
