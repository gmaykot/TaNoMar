import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { getAccountDeletionStatus } from '@/features/auth/services/authService';
import { PageHeader } from '@/pages/shared/PageHeader';
import { routes } from '@/shared/constants/routes';
import { LegalPageLayout } from './LegalPageLayout';
import { privacyContactEmail } from './privacyContact';
import styles from './legal.module.css';

export function DeleteAccountPage() {
  const location = useLocation();
  const initialProtocol =
    new URLSearchParams(location.hash.replace(/^#/, '')).get('protocolo') ?? '';
  const [protocol, setProtocol] = useState(initialProtocol);
  const [status, setStatus] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');
  const [checking, setChecking] = useState(false);
  const initialStatus = useQuery({
    queryKey: ['account-deletion-status', initialProtocol],
    queryFn: () => getAccountDeletionStatus(initialProtocol),
    enabled: Boolean(initialProtocol),
    retry: false,
  });

  async function checkStatus(value = protocol) {
    const normalized = value.trim();
    if (!normalized) return;
    setChecking(true);
    setStatusError('');
    try {
      const result = await getAccountDeletionStatus(normalized);
      setStatus(result.status);
    } catch {
      setStatus(null);
      setStatusError('Protocolo não encontrado, expirado ou temporariamente indisponível.');
    } finally {
      setChecking(false);
    }
  }

  const visibleStatus = status ?? initialStatus.data?.status ?? null;
  const visibleError =
    statusError ||
    (initialStatus.isError
      ? 'Protocolo não encontrado, expirado ou temporariamente indisponível.'
      : '');
  const statusBusy = checking || (Boolean(initialProtocol) && initialStatus.isPending);

  return (
    <LegalPageLayout>
      <PageHeader
        eyebrow="Excluir conta"
        title="Como apagar sua conta no TáNoMar."
        description="A exclusão acontece dentro do aplicativo, depois do login com Google, para ninguém apagar a conta de outra pessoa."
      />
      <Card as="section" className={styles.source}>
        <h2>Acompanhar exclusão</h2>
        <p>
          Informe o protocolo mostrado antes da exclusão. A consulta revela apenas o andamento do
          encerramento, sem dados pessoais ou dados da assinatura.
        </p>
        <label>
          Protocolo
          <input
            value={protocol}
            autoComplete="off"
            onChange={(event) => setProtocol(event.target.value)}
          />
        </label>
        <div className={styles.cta}>
          <Button disabled={statusBusy || !protocol.trim()} onClick={() => void checkStatus()}>
            {statusBusy ? 'Consultando…' : 'Consultar protocolo'}
          </Button>
        </div>
        {visibleStatus ? (
          <p role="status">
            {visibleStatus === 'completed'
              ? 'Exclusão concluída e recorrência encerrada.'
              : visibleStatus === 'action_required'
                ? `O encerramento exige ação do suporte. Fale com ${privacyContactEmail}.`
                : visibleStatus === 'prepared'
                  ? 'O protocolo foi criado, mas a exclusão da conta ainda não foi concluída.'
                  : 'A conta foi excluída e o encerramento da recorrência continua pendente.'}
          </p>
        ) : null}
        {visibleError ? <p role="alert">{visibleError}</p> : null}
      </Card>
      <Card as="section" className={styles.source}>
        <h2>Passos</h2>
        <ol>
          <li>Entre no TáNoMar com a mesma conta Google que você usa no aplicativo.</li>
          <li>Abra Conta.</li>
          <li>Toque em Excluir conta, gere e guarde o protocolo.</li>
          <li>
            Confirme a exclusão e use o protocolo nesta página para acompanhar o encerramento.
          </li>
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
