import { Shield } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { isAdmin } from '@/features/auth/types/auth';
import { routes } from '@/shared/constants/routes';

export function RequireAdmin() {
  const auth = useAuth();

  if (auth.status === 'booting' || auth.userLoading) {
    return (
      <FeedbackState
        title="Abrindo a moderação"
        description="Confirmando se você pode aprovar locais."
        icon={Shield}
      />
    );
  }

  if (!isAdmin(auth.user)) return <Navigate to={routes.account} replace />;
  return <Outlet />;
}
