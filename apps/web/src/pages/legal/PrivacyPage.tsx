import { CreditCard, MapPinned, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/design-system/components/Card';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import { LegalPageLayout } from './LegalPageLayout';
import { privacyContactEmail } from './privacyContact';
import styles from './legal.module.css';

export function PrivacyPage() {
  return (
    <LegalPageLayout>
      <PageHeader
        eyebrow="Privacidade"
        title="Como o TáNoMar trata seus dados."
        description="Esta política descreve o que o aplicativo coleta, para que usa e como você pede a exclusão da conta."
      />
      <Card as="section" className={styles.source}>
        <h2>
          <Shield size={18} aria-hidden="true" /> Conta
        </h2>
        <p>
          Você entra com o Google. Guardamos o identificador da conta Google, o nome, o e-mail e a
          foto do perfil para autenticar, mostrar a Conta e enviar avisos de operação. Sem essa
          conta o aplicativo não libera ranking, locais nem a previsão do seu plano.
        </p>
        <p>
          Também guardamos preferências (foco, regiões, unidade de vento, indicadores visíveis e
          avisos de previsão), favoritos, locais habilitados, rumo de vento ideal, alertas de
          previsão, relatos da comunidade e o endereço deste aparelho para notificações.
        </p>
      </Card>
      <Card as="section" className={styles.source}>
        <h2>
          <MapPinned size={18} aria-hidden="true" /> Locais e aparelho
        </h2>
        <p>
          Locais pessoais e compartilhados que você cadastra ficam no servidor, com nome,
          coordenadas e o restante do cadastro. Relatos que você envia aparecem para outras pessoas
          no aplicativo enquanto estiverem ativos.
        </p>
        <p>
          A localização e a bússola são lidas só neste aparelho, para preencher um local ou mostrar
          o rumo. O TáNoMar não grava uma trilha da sua posição.
        </p>
        <p>
          O diário de pesca, a previsão salva para uso sem rede e a biometria (Face ID, Touch ID ou
          impressão digital) ficam só neste aparelho. A biometria não substitui o Google e a API não
          guarda essa credencial.
        </p>
      </Card>
      <Card as="section" className={styles.source}>
        <h2>
          <CreditCard size={18} aria-hidden="true" /> Assinatura e operadores
        </h2>
        <p>
          Se você assina Arrais, Mestre ou Capitão, o TáNoMar guarda o plano e o CPF informado no
          cadastro de cobrança. O número do cartão permanece no Asaas; não transita no aplicativo.
        </p>
        <p>Operadores que recebem dados para prestar o serviço:</p>
        <ul>
          <li>Google, para o login.</li>
          <li>Asaas, para o pagamento da assinatura.</li>
          <li>Open-Meteo e Marinha, para clima, mar e tábua de maré, sem a sua conta.</li>
          <li>
            Resend e WhatsApp, para avisos internos de operação, com nome e e-mail quando um evento
            da conta precisa chegar à equipe.
          </li>
        </ul>
        <p>
          Se você se candidata a parceiro, o nome do negócio, a cidade e o WhatsApp ficam como
          cadastro comercial, sem vínculo com a exclusão da conta.
        </p>
      </Card>
      <Card as="section" className={styles.source}>
        <h2>
          <Users size={18} aria-hidden="true" /> Seus pedidos
        </h2>
        <p>
          Para apagar a conta, entre com o Google e confirme em Conta. O passo a passo está em
          Excluir conta. A exclusão remove os dados da conta no TáNoMar. O Asaas pode conservar
          registros de pagamento pelo prazo fiscal. Avisos já enviados à operação não são desfeitos.
        </p>
        <p>
          Dúvidas sobre esta política: {privacyContactEmail}. O controlador dos dados é o TáNoMar.
        </p>
      </Card>
      <nav className={styles.links} aria-label="Documentos relacionados">
        <Link to={routes.deleteAccount}>Excluir conta</Link>
        <Link to={routes.login}>Entrar no aplicativo</Link>
      </nav>
    </LegalPageLayout>
  );
}
