import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { RequireAdmin } from '@/app/router/RequireAdmin';
import { RequireAuth } from '@/app/router/RequireAuth';
import { AboutPage } from '@/pages/about/AboutPage';
import { AccountPage } from '@/pages/account/AccountPage';
import { AdminHomePage } from '@/pages/admin/AdminHomePage';
import { AdminSpotsPage } from '@/pages/admin/AdminSpotsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { HomePage } from '@/pages/home/HomePage';
import { EditLocationPage } from '@/pages/location-edit/EditLocationPage';
import { LocationDetailsPage } from '@/pages/location-details/LocationDetailsPage';
import { NewLocationPage } from '@/pages/location-new/NewLocationPage';
import { LocationsPage } from '@/pages/locations/LocationsPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { RankingPage } from '@/pages/ranking/RankingPage';
import { routes } from '@/shared/constants/routes';

export function AppRouter() {
  return (
    <Routes>
      <Route path={routes.login} element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path={routes.home} element={<HomePage />} />
          <Route path={routes.ranking} element={<RankingPage />} />
          <Route path={routes.locations} element={<LocationsPage />} />
          <Route path={routes.locationNew} element={<NewLocationPage />} />
          <Route path="/locais/:locationId/editar" element={<EditLocationPage />} />
          <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
          <Route path={routes.account} element={<AccountPage />} />
          <Route path={routes.about} element={<AboutPage />} />
          <Route element={<RequireAdmin />}>
            <Route path={routes.admin} element={<AdminHomePage />} />
            <Route path={routes.adminSpots} element={<AdminSpotsPage />} />
            <Route path={routes.adminUsers} element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={routes.home} replace />} />
    </Routes>
  );
}
