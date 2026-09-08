import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Download,
  Heart,
  SlidersHorizontal,
  Sparkles,
  Users,
  Waves,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isPaidPlan } from '@/features/auth/types/auth';
import { useBillingCatalog } from '@/features/billing/hooks/useBillingCatalog';
import { useBillingCheckout } from '@/features/billing/hooks/useBillingCheckout';
import type { BillingCycle } from '@/features/billing/billing';
import { SubscriptionBillingCard } from '@/features/billing/components/SubscriptionBillingCard';
import { useSubscriptionPlans } from '@/features/subscription/hooks/useSubscriptionPlans';
import { plansWithFreeBaseline } from '@/features/subscription/subscriptionPlans';
import { ApiError } from '@/shared/api/errors';
import { PageHeader } from '@/pages/shared/PageHeader';
import { SubscriptionPlanCards } from '@/pages/premium/SubscriptionPlanCards';
import { routes } from '@/shared/constants/routes';
import styles from '@/pages/shared/pages.module.css';
import premiumStyles from './premium.module.css';

const benefits = [
  {
    icon: Waves,
    title: 'Previsão ampliada',
    description: 'Consulte até 8 dias de previsão e veja os detalhes do mar para planejar melhor.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Leitura sob medida',
    description:
      'Destaque vento, chuva ou ondas e escolha os indicadores mais importantes para você.',
  },
  {
    icon: Heart,
    title: 'Seus locais e favoritos',
    description: 'Cadastre locais privados e guarde pontos favoritos conforme o plano.',
  },
  {
    icon: Bell,
    title: 'Alertas de oportunidade',
    description: 'Configure alertas para acompanhar as condições dos seus locais.',
  },
  {
    icon: BookOpen,
    title: 'Diário de pesca',
    description: 'Planeje a saída e registre capturas ou saídas sem captura neste aparelho.',
  },
  {
    icon: Download,
    title: 'Previsão offline',
    description:
      'Salve a previsão mais recente e consulte seus dados mesmo quando estiver sem conexão.',
  },
  {
    icon: Users,
    title: 'Confirmação da comunidade',
    description:
      'Confirme ou conteste os relatos de outros pescadores para deixar a comunidade mais confiável.',
  },
];

function maxForecastCaption(plans: { name: string; entitlements: { maxForecastDays: number } }[]) {
  if (plans.length === 0) return { days: 8, caption: 'conforme o plano' };
  const maxDays = Math.max(...plans.map((plan) => plan.entitlements.maxForecastDays));
  const names = plans
    .filter((plan) => plan.entitlements.maxForecastDays === maxDays)
    .map((plan) => plan.name);
  if (names.length === 0) return { days: maxDays, caption: 'conforme o plano' };
  if (names.length === 1) return { days: maxDays, caption: `no plano ${names[0]}` };
  return {
    days: maxDays,
    caption: `no plano ${names.slice(0, -1).join(', ')} e ${names.at(-1)}`,
  };
}

function checkoutMessage(value: string | null) {
  if (value === 'success') {
    return 'Recebemos o retorno do pagamento. O plano entra quando a cobrança for confirmada.';
  }
  if (value === 'cancel') {
    return 'O pagamento foi cancelado. Você pode escolher o plano de novo.';
  }
  if (value === 'expired') {
    return 'O checkout expirou. Gere um novo pagamento.';
  }
  return null;
}

export function PremiumPage() {
  const auth = useAuth();
  const catalog = useBillingCatalog();
  const publicPlans = useSubscriptionPlans();
  const checkout = useBillingCheckout();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const isPaid = isPaidPlan(auth.user);
  const currentPlanName = isPaid ? auth.user?.plan.name : undefined;
  const billing = catalog.data;
  const plans = billing?.plans ?? [];
  const comparisonPlans = plansWithFreeBaseline(plans, publicPlans.data);
  const highlight = maxForecastCaption(plans);
  const returnMessage = checkoutMessage(searchParams.get('checkout'));
  const checkoutError =
    checkout.error instanceof ApiError
      ? checkout.error.message
      : checkout.isError
        ? 'Não foi possível abrir o pagamento.'
        : null;

  useEffect(() => {
    if (!catalog.isSuccess) return;
    const id =
      location.hash === '#planos' || location.hash === '#assinatura' ? location.hash.slice(1) : '';
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, [catalog.isSuccess, location.hash]);

  function handleCheckout(planCode: string, cycle: BillingCycle) {
    setPendingKey(`${planCode}:${cycle}`);
    checkout.mutate(
      { planCode, cycle },
      {
        onSettled: () => setPendingKey(null),
      },
    );
  }

  if (catalog.isPending) {
    return (
      <FeedbackState
        title="Assinatura"
        description="Carregando os planos disponíveis."
        icon={Sparkles}
        busy
      />
    );
  }
  if (catalog.isError) {
    return (
      <FeedbackState
        title="Planos indisponíveis"
        description="Não foi possível carregar os planos da assinatura."
      />
    );
  }

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} to={routes.account}>
        <ArrowLeft size={16} aria-hidden="true" /> Conta
      </Link>
      <PageHeader
        eyebrow="Assinatura"
        title={isPaid ? 'Gerencie o comando da sua pesca.' : 'Escolha o comando da sua pesca.'}
        description={
          isPaid
            ? 'Troque de plano ou cancele a renovação. O período já pago continua válido até o fim.'
            : 'Arrais, Mestre ou Capitão. Três planos para ver mais dias, guardar seus locais e sair com mais contexto.'
        }
      />
      {returnMessage ? (
        <p className={premiumStyles.checkoutBanner} role="status">
          {returnMessage}
        </p>
      ) : null}
      {checkoutError ? (
        <p className={premiumStyles.checkoutError} role="alert">
          {checkoutError}
        </p>
      ) : null}
      <SubscriptionBillingCard
        planName={currentPlanName}
        billing={auth.user?.billing}
        isPaid={isPaid}
      />
      <section className={premiumStyles.hero} aria-labelledby="premium-hero-title">
        <div className={premiumStyles.heroCopy}>
          <span className={premiumStyles.heroEyebrow}>
            <Sparkles size={16} aria-hidden="true" /> O próximo passo para sua pesca
          </span>
          <h2 id="premium-hero-title">Encontre a melhor janela antes de sair.</h2>
          <p>
            Compare mais dias, acompanhe o mar com detalhes e personalize a previsão para o que
            realmente importa na sua pescaria.
          </p>
          <div className={premiumStyles.heroActions}>
            <a className={premiumStyles.heroLink} href="#planos">
              Ver os planos <ArrowRight size={17} aria-hidden="true" />
            </a>
            {isPaid ? (
              <a className={premiumStyles.heroQuiet} href="#assinatura">
                Cancelar renovação
              </a>
            ) : null}
            <span>
              {isPaid
                ? `Você já é assinante${currentPlanName ? ` · ${currentPlanName}` : ''}`
                : 'Conheça os recursos incluídos'}
            </span>
          </div>
        </div>
        <div
          className={premiumStyles.heroHighlight}
          aria-label="Resumo dos benefícios da assinatura"
        >
          <strong>{highlight.days} dias</strong>
          <span>{highlight.caption}</span>
          <div>
            <Check size={16} aria-hidden="true" /> Detalhes do mar
          </div>
          <div>
            <Check size={16} aria-hidden="true" /> Alertas nos seus locais
          </div>
        </div>
      </section>
      <div className={premiumStyles.benefitIntro} id="planos">
        <div>
          <span>Planos</span>
          <h2>Três rotas. O mesmo mar.</h2>
        </div>
        <p>
          {billing?.enabled
            ? 'Escolha o mês ou o ano. O anual tem 20% de desconto. No upgrade, o plano novo começa na hora.'
            : 'Escolha o ritmo da sua pesca. A cobrança ainda não começa por aqui.'}
        </p>
      </div>
      <SubscriptionPlanCards
        plans={plans}
        comparisonPlans={comparisonPlans}
        currentPlanCode={auth.user?.plan.code}
        currentCycle={auth.user?.billing?.cycle}
        currentStatus={auth.user?.billing?.status}
        cancelAtPeriodEnd={auth.user?.billing?.cancelAtPeriodEnd === true}
        billingEnabled={billing?.enabled === true}
        pendingKey={pendingKey}
        onCheckout={handleCheckout}
      />
      <section className={premiumStyles.notes} aria-labelledby="premium-notes-title">
        <div className={premiumStyles.benefitIntro}>
          <div>
            <span>Antes de assinar</span>
            <h2 id="premium-notes-title">Pagamento e câmeras</h2>
          </div>
          <p>Cartão só no Asaas. As transmissões ao vivo dependem de terceiros.</p>
        </div>
        <div className={premiumStyles.notesGrid}>
          <Card as="article" className={premiumStyles.infoCard}>
            <div>
              <span>Pagamento</span>
              <h3>
                {billing?.enabled
                  ? 'Cartão só na página do Asaas'
                  : 'Os planos já existem na conta'}
              </h3>
            </div>
            <p>
              {billing?.enabled
                ? 'O TáNoMar não vê o número do cartão. Cancelar a renovação não estorna o período já pago: você usa o plano até o fim do mês ou do ano contratado e depois volta para Free. Se a tabela mudar no meio do ciclo, a diferença não é cobrada agora — a renovação usa o preço novo.'
                : 'Arrais, Mestre e Capitão já podem ser liberados pelo administrador. A cobrança automática ainda está sendo configurada pela equipe do TáNoMar e esta página não inicia pagamento nem cria assinatura sozinha.'}
            </p>
          </Card>
          <Card as="article" className={premiumStyles.infoCard}>
            <div>
              <span>Câmeras ao vivo</span>
              <h3>Transmissão de terceiros</h3>
            </div>
            <p>
              As câmeras do Capitão são streams de terceiros. O TáNoMar apenas as exibe, não se
              responsabiliza pelas imagens e não garante manutenção nem disponibilidade.
            </p>
          </Card>
        </div>
      </section>
      <div className={premiumStyles.benefitIntro}>
        <div>
          <span>O que muda</span>
          <h2>Mais controle para cada saída</h2>
        </div>
        <p>Recursos pensados para transformar previsão em decisão.</p>
      </div>
      <div className={premiumStyles.benefitGrid}>
        {benefits.map(({ icon: Icon, title, description }) => (
          <Card as="article" className={premiumStyles.benefitCard} key={title}>
            <span className={premiumStyles.benefitIcon}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
