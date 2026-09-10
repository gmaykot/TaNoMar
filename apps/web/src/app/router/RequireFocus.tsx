import { Compass } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { hasChosenAppFocus } from '@/features/auth/appFocus';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { showsAppFocus } from '@/features/auth/types/auth';
import { routes } from '@/shared/constants/routes';

export function RequireFocus() {
  const auth = useAuth();

  if (auth.status === 'booting' || (auth.userLoading && !auth.user)) {
    return (
      <FeedbackState
        title="Abrindo sua sessão"
        description="Confirmando o seu foco no aplicativo."
        icon={Compass}
        busy
        screen
      />
    );
  }

  if (showsAppFocus(auth.user) && !hasChosenAppFocus(auth.user?.preferences.focus)) {
    return <Navigate to={routes.onboarding} replace />;
  }

  return <Outlet />;
}
