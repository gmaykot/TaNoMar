import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Link2, MessageCircle, Unlink } from 'lucide-react';
import { showSaveConfirmation } from '@/app/layout/saveConfirmationEvents';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import {
  adminWhatsAppQueryKey,
  useWhatsAppDestinations,
  useWhatsAppIntegration,
  useWhatsAppQrCode,
} from '@/features/admin-whatsapp/hooks/useAdminWhatsApp';
import {
  runWhatsAppAction,
  updateWhatsAppIntegration,
} from '@/features/admin-whatsapp/services/adminWhatsAppService';
import { WhatsAppDestinationFields } from '@/features/admin-whatsapp/components/WhatsAppDestinationFields';
import type {
  WhatsAppDestinationType,
  WhatsAppIntegration,
} from '@/features/admin-whatsapp/types/adminWhatsApp';
import {
  groupDestinationId,
  personalDestinationDisplay,
  personalDestinationId,
} from '@/features/admin-whatsapp/utils/whatsAppDestination';
import formStyles from '@/features/locations/components/spotForm.module.css';
import { PageHeader } from '@/pages/shared/PageHeader';
import pageStyles from '@/pages/shared/pages.module.css';
import { ApiError } from '@/shared/api/errors';
import styles from './adminWhatsApp.module.css';

const statusLabel = {
  connected: 'Conectado',
  connecting: 'Conectando',
  disconnected: 'Desconectado',
  error: 'Erro',
} as const;

function WhatsAppSettingsForm({ integration }: { integration: WhatsAppIntegration }) {
  const queryClient = useQueryClient();
  const connected = integration.status.state === 'connected';
  const showQr =
    integration.status.state === 'connecting' || integration.status.state === 'disconnected';
  const destinations = useWhatsAppDestinations(connected);
  const qr = useWhatsAppQrCode(showQr);
  const [enabled, setEnabled] = useState(integration.enabled);
  const [notifyByEmail, setNotifyByEmail] = useState(integration.notifyByEmail);
  const [instanceName, setInstanceName] = useState(integration.instanceName);
  const [destinationType, setDestinationType] = useState<WhatsAppDestinationType>(
    integration.defaultDestinationType ?? 'personal',
  );
  const [destinationId, setDestinationId] = useState(integration.defaultDestinationId ?? '');
  const [personalNumber, setPersonalNumber] = useState(
    integration.defaultDestinationType === 'personal'
      ? personalDestinationDisplay(integration.defaultDestinationId)
      : '',
  );
  const [notifyNewUser, setNotifyNewUser] = useState(integration.notifyNewUser);
  const [notifyPlanRequested, setNotifyPlanRequested] = useState(integration.notifyPlanRequested);
  const [notifyPlanChanged, setNotifyPlanChanged] = useState(integration.notifyPlanChanged);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const personalChats = destinations.data?.personal ?? [];
  const groups = destinations.data?.groups ?? [];

  const save = useMutation({
    mutationFn: () => {
      const pastedGroup = groupDestinationId(personalNumber) ?? groupDestinationId(destinationId);
      if (destinationType === 'personal' && !pastedGroup) {
        const id = personalDestinationId(personalNumber);
        const selected = personalChats.find((item) => item.id === id);
        return updateWhatsAppIntegration({
          enabled,
          notifyByEmail,
          instanceName,
          defaultDestinationType: 'personal',
          defaultDestinationId: id,
          defaultDestinationName: selected?.name ?? (id ? personalDestinationDisplay(id) : null),
          notifyNewUser,
          notifyPlanRequested,
          notifyPlanChanged,
        });
      }

      const groupId = pastedGroup ?? groupDestinationId(destinationId) ?? destinationId;
      const selected = groups.find((item) => item.id === groupId);
      return updateWhatsAppIntegration({
        enabled,
        notifyByEmail,
        instanceName,
        defaultDestinationType: 'group',
        defaultDestinationId: groupId || null,
        defaultDestinationName:
          selected?.name ??
          (groupId === integration.defaultDestinationId
            ? integration.defaultDestinationName
            : groupId || null),
        notifyNewUser,
        notifyPlanRequested,
        notifyPlanChanged,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminWhatsAppQueryKey });
      showSaveConfirmation('Configuração das notificações salva.');
    },
  });
  const action = useMutation({
    mutationFn: runWhatsAppAction,
    onSuccess: async (detail) => {
      setActionMessage(detail);
      await queryClient.invalidateQueries({ queryKey: adminWhatsAppQueryKey });
    },
  });

  return (
    <div className={styles.layout}>
      <Card as="section" className={styles.card} aria-label="Status da integração">
        <div className={styles.statusHeader}>
          <span className={`${styles.status} ${styles[integration.status.state]}`}>
            {integration.status.state === 'connected' ? (
              <CheckCircle2 size={16} aria-hidden="true" />
            ) : integration.status.state === 'error' ? (
              <CircleAlert size={16} aria-hidden="true" />
            ) : (
              <Unlink size={16} aria-hidden="true" />
            )}
            {statusLabel[integration.status.state]}
          </span>
          <MessageCircle size={22} aria-hidden="true" />
        </div>
        <h2>{connected ? 'WhatsApp conectado' : 'WhatsApp não conectado'}</h2>
        <dl className={styles.details}>
          <div>
            <dt>Número conectado</dt>
            <dd>{integration.status.phoneNumber ?? '—'}</dd>
          </div>
          <div>
            <dt>Nome da instância</dt>
            <dd>{integration.instanceName}</dd>
          </div>
          <div>
            <dt>Última conexão</dt>
            <dd>
              {integration.status.lastConnectedAt
                ? new Date(integration.status.lastConnectedAt).toLocaleString('pt-BR')
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Destino configurado</dt>
            <dd>{integration.defaultDestinationName ?? '—'}</dd>
          </div>
        </dl>
        {integration.status.error ? (
          <p className={formStyles.error}>{integration.status.error}</p>
        ) : null}
        <div className={formStyles.actions}>
          {!connected && integration.status.state !== 'error' ? (
            <Button
              type="button"
              disabled={action.isPending}
              onClick={() => action.mutate('connect')}
            >
              <Link2 size={16} aria-hidden="true" /> Conectar WhatsApp
            </Button>
          ) : null}
          {connected ? (
            <Button
              type="button"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate('disconnect')}
            >
              Desconectar
            </Button>
          ) : null}
          {connected || integration.status.state === 'error' ? (
            <Button
              type="button"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate('reconnect')}
            >
              Reconectar
            </Button>
          ) : null}
        </div>
        {actionMessage ? (
          <p className={styles.success} role="status">
            {actionMessage}
          </p>
        ) : null}
        {action.isError ? (
          <p className={formStyles.error} role="alert">
            {errorMessage(action.error)}
          </p>
        ) : null}
      </Card>

      {showQr ? (
        <Card as="section" className={styles.card} aria-label="Conectar por QR Code">
          <h2>Conectar por QR Code</h2>
          <p>Abra o WhatsApp no celular, acesse Aparelhos conectados e leia o código.</p>
          {qr.data ? (
            <img className={styles.qr} src={qr.data} alt="QR Code para conectar o WhatsApp" />
          ) : qr.isError ? (
            <p className={formStyles.error} role="alert">
              O QR Code ainda não está disponível. Tente conectar novamente.
            </p>
          ) : (
            <p className={styles.muted}>Gerando QR Code…</p>
          )}
        </Card>
      ) : null}

      <Card as="section" className={styles.card} aria-label="Configuração das notificações">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <label className={formStyles.field}>
            <span>Canais das notificações administrativas</span>
            <select
              value={enabled ? (notifyByEmail ? 'both' : 'whatsapp') : 'email'}
              disabled={save.isPending}
              onChange={(event) => {
                setEnabled(event.target.value !== 'email');
                setNotifyByEmail(event.target.value !== 'whatsapp');
              }}
            >
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="both">E-mail e WhatsApp</option>
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Nome da instância</span>
            <input
              value={instanceName}
              maxLength={80}
              required
              disabled={save.isPending}
              onChange={(event) => setInstanceName(event.target.value)}
            />
          </label>
          <WhatsAppDestinationFields
            destinationType={destinationType}
            personalNumber={personalNumber}
            destinationId={destinationId}
            personalChats={personalChats}
            groups={groups}
            savedGroup={
              integration.defaultDestinationType === 'group' && integration.defaultDestinationId
                ? {
                    id: integration.defaultDestinationId,
                    name: integration.defaultDestinationName ?? integration.defaultDestinationId,
                  }
                : null
            }
            connected={connected}
            loading={destinations.isPending}
            listError={destinations.isError}
            disabled={save.isPending}
            onTypeChange={setDestinationType}
            onPersonalNumberChange={(value) => {
              setPersonalNumber(value);
              const groupId = groupDestinationId(value);
              if (groupId) {
                setDestinationType('group');
                setDestinationId(groupId);
                return;
              }
              setDestinationId(personalDestinationId(value) ?? '');
            }}
            onDestinationIdChange={(value) => {
              setDestinationId(value);
              if (destinationType === 'personal')
                setPersonalNumber(personalDestinationDisplay(value));
            }}
          />
          <fieldset className={formStyles.group} disabled={save.isPending}>
            <legend>Eventos</legend>
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={notifyNewUser}
                onChange={(event) => setNotifyNewUser(event.target.checked)}
              />
              <span>Novo usuário cadastrado</span>
            </label>
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={notifyPlanRequested}
                onChange={(event) => setNotifyPlanRequested(event.target.checked)}
              />
              <span>Novo plano solicitado</span>
            </label>
            <label className={formStyles.choice}>
              <input
                type="checkbox"
                checked={notifyPlanChanged}
                onChange={(event) => setNotifyPlanChanged(event.target.checked)}
              />
              <span>Plano de usuário alterado</span>
            </label>
          </fieldset>
          {save.isError ? (
            <p className={formStyles.error} role="alert">
              {errorMessage(save.error)}
            </p>
          ) : null}
          <div className={formStyles.actions}>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar configuração'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!connected || !destinationId || action.isPending}
              onClick={() => action.mutate('test')}
            >
              Enviar mensagem de teste
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function AdminWhatsAppPage() {
  const integration = useWhatsAppIntegration();
  return (
    <div className={pageStyles.page}>
      <PageHeader
        eyebrow="Administração · Integrações"
        title="WhatsApp"
        description="Escolha os canais dos avisos administrativos e conecte o WhatsApp quando necessário."
      />
      {integration.isPending ? (
        <FeedbackState
          title="Carregando integração"
          description="Consultando o serviço WhatsApp."
          busy
        />
      ) : integration.isError ? (
        <FeedbackState
          title="Não foi possível carregar o WhatsApp"
          description={errorMessage(integration.error)}
          action={
            <Button type="button" onClick={() => integration.refetch()}>
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <WhatsAppSettingsForm key={integration.data.updatedAt} integration={integration.data} />
      )}
    </div>
  );
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.';
}
