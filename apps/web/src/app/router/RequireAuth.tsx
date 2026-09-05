import { Compass } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { routes } from '@/shared/constants/routes';

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'booting') {
    return (
      <FeedbackState
        title="Abrindo sua sessão"
        description="Confirmando se você já está dentro."
        icon={Compass}
        busy
      />
    );
  }

  if (auth.status === 'anonymous') {
    return <Navigate to={routes.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
