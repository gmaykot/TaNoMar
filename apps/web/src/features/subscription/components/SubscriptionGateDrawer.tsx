import { useNavigate } from 'react-router-dom';
import { ConfirmDrawer } from '@/design-system/components/ConfirmDrawer';
import { routes } from '@/shared/constants/routes';

interface SubscriptionGateDrawerProps {
  action: string;
  onCancel: () => void;
}

export function SubscriptionGateDrawer({ action, onCancel }: SubscriptionGateDrawerProps) {
  const navigate = useNavigate();

  return (
    <ConfirmDrawer
      title="Ver os planos?"
      description={`${action} está na Assinatura. Continuar abre a página de planos.`}
      confirmLabel="Ver planos"
      onCancel={onCancel}
      onConfirm={() => {
        onCancel();
        void navigate(routes.premium);
      }}
    />
  );
}
