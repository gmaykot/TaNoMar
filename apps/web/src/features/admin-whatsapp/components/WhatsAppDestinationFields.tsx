import type { WhatsAppDestination, WhatsAppDestinationType } from '../types/adminWhatsApp';
import formStyles from '@/features/locations/components/spotForm.module.css';
import styles from '@/pages/admin/adminWhatsApp.module.css';

interface WhatsAppDestinationFieldsProps {
  destinationType: WhatsAppDestinationType;
  personalNumber: string;
  destinationId: string;
  personalChats: WhatsAppDestination[];
  groups: WhatsAppDestination[];
  savedGroup?: WhatsAppDestination | null;
  connected: boolean;
  loading: boolean;
  listError: boolean;
  disabled: boolean;
  onTypeChange: (type: WhatsAppDestinationType) => void;
  onPersonalNumberChange: (value: string) => void;
  onDestinationIdChange: (value: string) => void;
}

export function WhatsAppDestinationFields({
  destinationType,
  personalNumber,
  destinationId,
  personalChats,
  groups,
  savedGroup,
  connected,
  loading,
  listError,
  disabled,
  onTypeChange,
  onPersonalNumberChange,
  onDestinationIdChange,
}: WhatsAppDestinationFieldsProps) {
  const groupOptions =
    savedGroup && !groups.some((item) => item.id === savedGroup.id)
      ? [savedGroup, ...groups]
      : groups;

  return (
    <fieldset className={formStyles.group} disabled={disabled}>
      <legend>Destino das notificações administrativas</legend>
      <p className={formStyles.groupHint}>
        Conversa pessoal usa número ou JID `…@s.whatsapp.net`. Grupo usa JID `…@g.us`, que você pode
        colar ou escolher na lista.
      </p>
      <div className={styles.destinationTypes}>
        <label>
          <input
            type="radio"
            name="destinationType"
            checked={destinationType === 'personal'}
            onChange={() => onTypeChange('personal')}
          />{' '}
          Conversa pessoal
        </label>
        <label>
          <input
            type="radio"
            name="destinationType"
            checked={destinationType === 'group'}
            onChange={() => onTypeChange('group')}
          />{' '}
          Grupo
        </label>
      </div>
      {destinationType === 'personal' ? (
        <>
          <label className={formStyles.field}>
            <span>Número ou JID do WhatsApp</span>
            <input
              value={personalNumber}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="48999771062 ou 5548999771062@s.whatsapp.net"
              disabled={disabled}
              onChange={(event) => onPersonalNumberChange(event.target.value)}
            />
          </label>
          {personalChats.length > 0 ? (
            <label className={formStyles.field}>
              <span>Ou escolha uma conversa sincronizada</span>
              <select
                value={personalChats.some((item) => item.id === destinationId) ? destinationId : ''}
                disabled={disabled}
                onChange={(event) => onDestinationIdChange(event.target.value)}
              >
                <option value="">Selecione</option>
                {personalChats.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </>
      ) : (
        <>
          <label className={formStyles.field}>
            <span>JID do grupo</span>
            <input
              value={destinationId.endsWith('@g.us') ? destinationId : ''}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="120363001234567890@g.us"
              disabled={disabled}
              onChange={(event) => onDestinationIdChange(event.target.value.trim())}
            />
          </label>
          <label className={formStyles.field}>
            <span>Ou escolha um grupo sincronizado</span>
            <select
              value={groupOptions.some((item) => item.id === destinationId) ? destinationId : ''}
              disabled={disabled || loading || (groupOptions.length === 0 && !destinationId)}
              onChange={(event) => onDestinationIdChange(event.target.value)}
            >
              <option value="">Selecione</option>
              {groupOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {destinationType === 'group' && !connected ? (
        <p className={formStyles.groupHint}>
          Conecte o WhatsApp para listar os grupos disponíveis.
        </p>
      ) : null}
      {listError ? (
        <p className={formStyles.error} role="alert">
          Não foi possível carregar as conversas e grupos.
        </p>
      ) : null}
    </fieldset>
  );
}
