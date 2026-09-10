import { afterEach, describe, expect, it } from 'vitest';
import { offlineAuthUser } from '@/features/auth/fixtures/user';
import { forecastFixture } from '@/features/forecast/fixtures/forecast';
import { saveOfflineForecast } from '@/features/forecast/utils/offlineForecast';
import {
  canRestoreOfflineSession,
  clearOfflineUser,
  readOfflineUser,
  saveOfflineUser,
} from './offlineSession';

describe('offlineSession', () => {
  afterEach(() => {
    clearOfflineUser();
    localStorage.removeItem('tanomar.offline-forecast.v1');
  });

  it('grava e lê o snapshot do usuário', () => {
    expect(saveOfflineUser(offlineAuthUser)).toBe(true);
    expect(readOfflineUser()).toMatchObject({
      id: 'user-1',
      email: 'ana@example.com',
      plan: { code: 'premium' },
      modules: { offline: true },
    });
  });

  it('só restaura a sessão com módulo offline e previsão salva', () => {
    saveOfflineUser(offlineAuthUser);
    expect(canRestoreOfflineSession()).toBe(false);
    saveOfflineForecast(forecastFixture);
    expect(canRestoreOfflineSession()).toBe(true);
  });

  it('não restaura a sessão do plano Free', () => {
    saveOfflineUser({
      ...offlineAuthUser,
      plan: { code: 'free', name: 'Free' },
      modules: { ...offlineAuthUser.modules!, offline: false },
    });
    saveOfflineForecast(forecastFixture);
    expect(canRestoreOfflineSession()).toBe(false);
  });
});
