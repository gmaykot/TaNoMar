export type InstallPlatform = 'android' | 'ios' | 'desktop';

export function detectInstallPlatform(userAgent: string): InstallPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  if (/android/i.test(userAgent)) return 'android';
  return 'desktop';
}
