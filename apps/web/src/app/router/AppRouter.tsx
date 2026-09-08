import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { FeedbackState } from '@/design-system/components/FeedbackState';
import { LandingPage } from '@/pages/landing/LandingPage';
import { routes } from '@/shared/constants/routes';

const SessionRouter = lazy(async () => {
  const module = await import('./SessionRouter');
  return { default: module.SessionRouter };
});

export function AppRouter() {
  return (
    <Routes>
      <Route path={routes.landing} element={<LandingPage />} />
      <Route
        path="*"
        element={
          <Suspense
            fallback={
              <FeedbackState
                title="Abrindo o TáNoMar"
                description="Preparando o aplicativo para você."
                busy
              />
            }
          >
            <SessionRouter />
          </Suspense>
        }
      />
    </Routes>
  );
}
