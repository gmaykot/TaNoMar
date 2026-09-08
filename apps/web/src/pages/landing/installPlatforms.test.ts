import { describe, expect, it } from 'vitest';
import { detectInstallPlatform } from './installPlatforms';

describe('detectInstallPlatform', () => {
  it('destaca a instrução mais provável sem remover as demais', () => {
    expect(detectInstallPlatform('Mozilla/5.0 (Linux; Android 15) Chrome/140')).toBe('android');
    expect(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0) Safari/605')).toBe(
      'ios',
    );
    expect(detectInstallPlatform('Mozilla/5.0 (Windows NT 10.0) Chrome/140')).toBe('desktop');
  });
});
