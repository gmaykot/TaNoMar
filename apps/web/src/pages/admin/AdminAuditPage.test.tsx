import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AdminAuditPage } from './AdminAuditPage';

const { runAdminAudit } = vi.hoisted(() => ({
  runAdminAudit: vi.fn(() =>
    Promise.resolve({
      audit: {
        spotId: 'matadeiro',
        date: '2026-09-08',
        hourCount: 24,
        bestHourCount: 3,
        passed: true,
        rawSourceComparisonAvailable: true,
        findings: [],
        hours: [
          {
            time: '07:00',
            isBestHour: true,
            normalized: {
              score: 9.8,
              windSpeedKmh: 5.3,
              windGustKmh: 12.6,
              windDirection: 'Sudoeste',
              rainMm: 0,
              rainProbability: 9,
              rainProbabilityBestMatch: 9,
              rainProbabilityGfs: 8,
              airTemperatureC: 12,
              waterTemperatureC: 18.4,
              waveMeters: 0.66,
              wavePeriodSeconds: 8,
              swellMeters: 0.4,
              swellPeriodSeconds: 7,
              waveDirection: 'Sul',
              swellDirection: 'Sul',
              seaLevelHeightMsl: null,
              pressureHpa: 1012,
            },
            sources: null,
          },
        ],
      },
      sourceRefresh: true,
      snapshot: null,
    }),
  ),
}));

vi.mock('@/features/admin-audit/services/adminAuditService', () => ({ runAdminAudit }));
vi.mock('@/features/locations/services/locationsService', () => ({
  getLocations: () =>
    Promise.resolve([
      { id: 'matadeiro', name: 'Matadeiro' },
      { id: 'armacao', name: 'Armação' },
      { id: 'acores', name: 'Açores' },
    ]),
}));

describe('AdminAuditPage', () => {
  it('lista os locais em ordem alfabética e executa a auditoria', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminAuditPage />);

    const spot = await screen.findByRole('combobox', { name: 'Local' });
    expect(await screen.findByRole('option', { name: 'Açores' })).toBeInTheDocument();
    expect([...spot.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      'Escolha um local',
      'Açores',
      'Armação',
      'Matadeiro',
    ]);
    await user.selectOptions(spot, 'matadeiro');
    const date = screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/) as HTMLInputElement;
    await user.click(screen.getByRole('button', { name: /Executar auditoria/ }));

    await waitFor(() => {
      expect(runAdminAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          spotId: 'matadeiro',
          date: date.value,
          refreshSources: true,
        }),
        expect.anything(),
      );
    });
    expect(await screen.findByText('Auditoria aprovada')).toBeInTheDocument();
    expect(screen.getByText('Dados normalizados pelo TáNoMar')).toBeInTheDocument();
    expect(screen.getByText('5,3 km/h')).toBeInTheDocument();
  });
});
