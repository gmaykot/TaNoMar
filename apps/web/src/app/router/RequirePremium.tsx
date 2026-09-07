import { BookOpen } from 'lucide-react';
import { Navigate, Outlet } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { routes } from '@/shared/constants/routes';

export function RequirePremium() {
  const auth = useAuth();

  if (auth.status === 'booting' || auth.userLoading) {
    return (
      <FeedbackState
        title="Abrindo o Diário"
        description="Confirmando se o recurso está disponível no seu plano."
        icon={BookOpen}
      />
    );
  }

  if (auth.user?.plan.code !== 'premium') return <Navigate to={routes.premium} replace />;
  return <Outlet />;
}
