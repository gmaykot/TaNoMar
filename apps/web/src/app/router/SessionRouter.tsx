import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { RequireAdmin } from '@/app/router/RequireAdmin';
import { RequireAuth } from '@/app/router/RequireAuth';
import { RequireFocus } from '@/app/router/RequireFocus';
import { RequirePremium } from '@/app/router/RequirePremium';
import { AuthSessionProvider } from '@/features/auth/providers/AuthSessionProvider';
import { AccountNotificationsPage } from '@/pages/account/AccountNotificationsPage';
import { AccountPage } from '@/pages/account/AccountPage';
import { AccountPreferencesPage } from '@/pages/account/AccountPreferencesPage';
import { AdminHomePage } from '@/pages/admin/AdminHomePage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { AdminPartnerFormPage } from '@/pages/admin/AdminPartnerFormPage';
import { AdminPartnersPage } from '@/pages/admin/AdminPartnersPage';
import { AdminOfficialSpotFormPage } from '@/pages/admin/AdminOfficialSpotFormPage';
import { AdminOfficialSpotsPage } from '@/pages/admin/AdminOfficialSpotsPage';
import { AdminPlansPage } from '@/pages/admin/AdminPlansPage';
import { AdminSpotsPage } from '@/pages/admin/AdminSpotsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminWorkersPage } from '@/pages/admin/AdminWorkersPage';
import { AboutPage } from '@/pages/about/AboutPage';
import { DiaryPage } from '@/pages/diary/DiaryPage';
import { HomePage } from '@/pages/home/HomePage';
import { EditLocationPage } from '@/pages/location-edit/EditLocationPage';
import { LocationDetailsPage } from '@/pages/location-details/LocationDetailsPage';
import { NewLocationPage } from '@/pages/location-new/NewLocationPage';
import { LocationsPage } from '@/pages/locations/LocationsPage';
import { LoginPage } from '@/pages/login/LoginPage';
import { FocusOnboardingPage } from '@/pages/onboarding/FocusOnboardingPage';
import { PartnerDetailsPage } from '@/pages/partners/PartnerDetailsPage';
import { PartnersPage } from '@/pages/partners/PartnersPage';
import { PremiumPage } from '@/pages/premium/PremiumPage';
import { RankingPage } from '@/pages/ranking/RankingPage';
import { routes } from '@/shared/constants/routes';

export function SessionRouter() {
  return (
    <AuthSessionProvider>
      <Routes>
        <Route path={routes.login} element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path={routes.onboarding} element={<FocusOnboardingPage />} />
          <Route element={<RequireFocus />}>
            <Route element={<AppShell />}>
              <Route path={routes.home} element={<HomePage />} />
              <Route path={routes.ranking} element={<RankingPage />} />
              <Route path={routes.locations} element={<LocationsPage />} />
              <Route path={routes.locationNew} element={<NewLocationPage />} />
              <Route path="/locais/:locationId/editar" element={<EditLocationPage />} />
              <Route path="/locais/:locationId" element={<LocationDetailsPage />} />
              <Route path={routes.account} element={<AccountPage />} />
              <Route path={routes.accountPreferences} element={<AccountPreferencesPage />} />
              <Route path={routes.accountNotifications} element={<AccountNotificationsPage />} />
              <Route path={routes.premium} element={<PremiumPage />} />
              <Route element={<RequirePremium />}>
                <Route path={routes.diary} element={<DiaryPage />} />
              </Route>
              <Route path={routes.about} element={<AboutPage />} />
              <Route path={routes.partners} element={<PartnersPage />} />
              <Route path="/parceiros/:partnerSlug" element={<PartnerDetailsPage />} />
              <Route element={<RequireAdmin />}>
                <Route path={routes.admin} element={<AdminHomePage />} />
                <Route path={routes.adminAudit} element={<AdminAuditPage />} />
                <Route path={routes.adminSpots} element={<AdminSpotsPage />} />
                <Route path={routes.adminOfficialSpots} element={<AdminOfficialSpotsPage />} />
                <Route path={routes.adminOfficialSpotNew} element={<AdminOfficialSpotFormPage />} />
                <Route
                  path="/admin/locais-sistema/:locationId"
                  element={<AdminOfficialSpotFormPage />}
                />
                <Route path={routes.adminUsers} element={<AdminUsersPage />} />
                <Route path={routes.adminPlans} element={<AdminPlansPage />} />
                <Route path={routes.adminWorkers} element={<AdminWorkersPage />} />
                <Route path={routes.adminPartners} element={<AdminPartnersPage />} />
                <Route path={routes.adminPartnerNew} element={<AdminPartnerFormPage />} />
                <Route path="/admin/parceiros/:partnerSlug" element={<AdminPartnerFormPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Routes>
    </AuthSessionProvider>
  );
}
