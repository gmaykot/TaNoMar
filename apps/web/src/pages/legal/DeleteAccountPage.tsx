import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import { LegalPageLayout } from './LegalPageLayout';
import { privacyContactEmail } from './privacyContact';
import styles from './legal.module.css';

export function DeleteAccountPage() {
  return (
    <LegalPageLayout>
      <PageHeader
        eyebrow="Excluir conta"
        title="Como apagar sua conta no TáNoMar."
        description="A exclusão acontece dentro do aplicativo, depois do login com Google, para ninguém apagar a conta de outra pessoa."
      />
      <Card as="section" className={styles.source}>
        <h2>Passos</h2>
        <ol>
          <li>Entre no TáNoMar com a mesma conta Google que você usa no aplicativo.</li>
          <li>Abra Conta.</li>
          <li>Toque em Excluir conta, leia o aviso e confirme.</li>
        </ol>
        <p>
          A conta inicial de operação e o último administrador não se excluem por aqui. Nesses
          casos, fale com {privacyContactEmail}.
        </p>
        <div className={styles.cta}>
          <Link className={styles.primaryCta} to={routes.account}>
            Abrir Conta
          </Link>
        </div>
      </Card>
      <Card as="section" className={styles.source}>
        <h2>O que some</h2>
        <ul>
          <li>Nome, e-mail, foto, preferências, sessões e avisos da conta.</li>
          <li>Favoritos, alertas, relatos e o endereço deste aparelho para notificações.</li>
          <li>
            Locais pessoais e compartilhados que você cadastrou, com favoritos, alertas e relatos
            ligados a eles.
          </li>
          <li>O CPF guardado no TáNoMar e o registro local da assinatura.</li>
          <li>
            A recorrência no Asaas, se existir. O período já pago acaba com a conta, sem estorno.
          </li>
          <li>Diário, previsão salva e biometria neste aparelho, depois da confirmação.</li>
        </ul>
      </Card>
      <Card as="section" className={styles.source}>
        <h2>O que permanece</h2>
        <ul>
          <li>Locais oficiais do TáNoMar.</li>
          <li>Dados de pagamento que o Asaas conserva pelo prazo fiscal.</li>
          <li>Avisos de operação já enviados à equipe.</li>
          <li>Candidatura de parceiro (nome do negócio, cidade e WhatsApp).</li>
        </ul>
      </Card>
      <nav className={styles.links} aria-label="Documentos relacionados">
        <Link to={routes.privacy}>Política de privacidade</Link>
      </nav>
    </LegalPageLayout>
  );
}
