import { Link } from 'react-router-dom';
import { BadgePercent, Handshake, Shield, Users } from 'lucide-react';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import adminStyles from './admin.module.css';
import styles from '@/pages/shared/pages.module.css';

export function AdminHomePage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Quem entra e o que a comunidade publica."
        description="Locais compartilhados, contas, planos e parceiros."
      />
      <section className={adminStyles.shortcuts} aria-label="Áreas administrativas">
        <Link className={adminStyles.shortcut} to={routes.adminSpots}>
          <span>
            <Shield size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Moderação</strong>
            <small>Aprove ou recuse locais compartilhados.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminUsers}>
          <span>
            <Users size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Usuários</strong>
            <small>Troque o plano ou bloqueie uma conta.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminPlans}>
          <span>
            <BadgePercent size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Planos</strong>
            <small>Preço, cotas e módulos da assinatura.</small>
          </div>
        </Link>
        <Link className={adminStyles.shortcut} to={routes.adminPartners}>
          <span>
            <Handshake size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>Parceiros</strong>
            <small>Cadastre landings da vitrine.</small>
          </div>
        </Link>
      </section>
    </div>
  );
}
