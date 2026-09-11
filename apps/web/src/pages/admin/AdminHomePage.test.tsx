import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminHomePage } from './AdminHomePage';

const { setPlatformShowAppFocus, setPlatformShowLiveWebcams, settingsState } = vi.hoisted(() => ({
  setPlatformShowAppFocus: vi.fn(() =>
    Promise.resolve({ showPartners: false, showAppFocus: true, showLiveWebcams: true }),
  ),
  setPlatformShowLiveWebcams: vi.fn(() =>
    Promise.resolve({ showPartners: false, showAppFocus: false, showLiveWebcams: false }),
  ),
  settingsState: { showAppFocus: false, showLiveWebcams: true },
}));

vi.mock('@/features/admin-dashboard/hooks/useAdminDashboard', () => ({
  adminDashboardQueryKey: ['admin-dashboard'],
  useAdminDashboard: () => ({
    isPending: false,
    isError: false,
    data: {
      generatedAt: '2026-09-10T22:00:00+00:00',
      users: {
        total: 3,
        active: 3,
        blocked: 0,
        admins: 1,
        paid: 1,
        newLast7Days: 0,
        newLast30Days: 1,
        byPlan: [{ code: 'free', name: 'Free', count: 2 }],
      },
      spots: {
        official: 2,
        officialEnabled: 2,
        officialDisabled: 0,
        officialFreeDefault: 1,
        officialWithoutCoordinates: 0,
        officialWithWebcam: 0,
        personal: 0,
        sharedApproved: 0,
        sharedPending: 0,
        byRegion: [{ code: 'sul', name: 'sul', count: 2 }],
      },
      billing: {
        active: 1,
        cancelAtPeriodEnd: 0,
        pastDue: 0,
        pendingCheckout: 0,
        canceledWithAccess: 0,
        monthlyCount: 1,
        yearlyCount: 0,
        monthlyRecurringCents: 1990,
      },
      engagement: {
        activeAlerts: 0,
        pushDevices: 0,
        favorites: 0,
        enabledSpots: 0,
        activeReports: 0,
        reportsLast7Days: 0,
        reportsLast30Days: 0,
      },
      partners: { published: 0, unpublished: 0, featured: 0 },
    },
  }),
}));

vi.mock('@/features/partners/hooks/usePartners', () => ({
  platformSettingsQueryKey: ['admin-platform-settings'],
  usePlatformSettings: () => ({
    isPending: false,
    data: {
      showPartners: false,
      showAppFocus: settingsState.showAppFocus,
      showLiveWebcams: settingsState.showLiveWebcams,
    },
  }),
}));

vi.mock('@/features/partners/services/partnersService', () => ({
  setPlatformShowAppFocus,
  setPlatformShowLiveWebcams,
}));

vi.mock('@/app/layout/saveConfirmationEvents', () => ({
  showSaveConfirmation: vi.fn(),
}));

describe('AdminHomePage', () => {
  beforeEach(() => {
    settingsState.showAppFocus = false;
    settingsState.showLiveWebcams = true;
    setPlatformShowAppFocus.mockClear();
    setPlatformShowLiveWebcams.mockClear();
  });

  it('abre as áreas administrativas', () => {
    renderWithProviders(<AdminHomePage />);
    expect(screen.getByRole('link', { name: /Auditoria de dados/ })).toHaveAttribute(
      'href',
      '/admin/auditoria',
    );
    expect(screen.getByRole('link', { name: /Locais do sistema/ })).toHaveAttribute(
      'href',
      '/admin/locais-sistema',
    );
    expect(screen.getByRole('link', { name: /Moderação/ })).toHaveAttribute(
      'href',
      '/admin/locais',
    );
    expect(screen.getByRole('link', { name: /Usuários/ })).toHaveAttribute(
      'href',
      '/admin/usuarios',
    );
    expect(screen.getByRole('link', { name: /Parceiros/ })).toHaveAttribute(
      'href',
      '/admin/parceiros',
    );
    expect(screen.getByRole('link', { name: /Planos/ })).toHaveAttribute('href', '/admin/planos');
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
      'href',
      '/admin/integracoes/whatsapp',
    );
    expect(screen.getByRole('link', { name: /Workers/ })).toHaveAttribute(
      'href',
      '/admin/workers',
    );
    expect(screen.getByRole('checkbox', { name: /Mostrar câmeras ao vivo/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Permitir escolha de perfil/ })).not.toBeChecked();
    expect(screen.getByRole('heading', { name: 'Painel gerencial.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contas ativas/ })).toBeInTheDocument();
    expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
  });

  it('liga ou desliga câmeras ao vivo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHomePage />);
    const toggle = screen.getByRole('checkbox', { name: /Mostrar câmeras ao vivo/ });
    await user.click(toggle);
    expect(setPlatformShowLiveWebcams).toHaveBeenCalledWith(false);
  });

  it('liga a escolha de perfil pelo admin', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHomePage />);

    const toggle = screen.getByRole('checkbox', { name: /Permitir escolha de perfil/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => {
      expect(setPlatformShowAppFocus).toHaveBeenCalledWith(true);
    });
  });
});
