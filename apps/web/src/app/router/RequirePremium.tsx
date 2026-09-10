import { BookOpen } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasPlanModule } from '@/features/auth/types/auth';
import { routes } from '@/shared/constants/routes';

export function RequirePremium() {
  const auth = useAuth();

  if (auth.status === 'booting' || (auth.userLoading && !auth.user)) {
    return (
      <FeedbackState
        title="Abrindo o Diário"
        description="Confirmando se o recurso está disponível no seu plano."
        icon={BookOpen}
      />
    );
  }

  if (!hasPlanModule(auth.user, 'diary')) return <Navigate to={routes.premium} replace />;
  return <Outlet />;
}
