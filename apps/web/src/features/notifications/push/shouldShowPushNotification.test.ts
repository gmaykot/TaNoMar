import { describe, expect, it } from 'vitest';
import { parsePushPayload, shouldShowPushNotification } from './shouldShowPushNotification';

describe('shouldShowPushNotification', () => {
  it('não mostra toast quando o app está visível', () => {
    expect(shouldShowPushNotification([{ visibilityState: 'visible' }])).toBe(false);
  });

  it('mostra toast sem janela visível', () => {
    expect(shouldShowPushNotification([])).toBe(true);
    expect(shouldShowPushNotification([{ visibilityState: 'hidden' }])).toBe(true);
  });

  it('usa título e corpo do payload', () => {
    expect(parsePushPayload({ title: 'Novo relato', body: 'Campeche' })).toEqual({
      title: 'Novo relato',
      body: 'Campeche',
    });
    expect(parsePushPayload(null).title).toBe('TáNoMar');
  });
});
