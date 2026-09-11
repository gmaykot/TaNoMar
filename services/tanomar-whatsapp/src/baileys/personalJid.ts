const personalSuffix = '@s.whatsapp.net';

export function personalDigits(destinationId: string): string {
  return destinationId.endsWith(personalSuffix)
    ? destinationId.slice(0, -personalSuffix.length)
    : destinationId.replace(/\D/g, '');
}

export function normalizePersonalDigits(value: string): string | null {
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55'))
    digits = `55${digits}`;
  if (digits.startsWith('55') && digits.length > 13) digits = digits.slice(0, 13);
  return digits.length === 12 || digits.length === 13 ? digits : null;
}

export function personalJidCandidates(destinationId: string): string[] {
  if (destinationId.endsWith('@g.us')) return [destinationId];
  const normalized = normalizePersonalDigits(personalDigits(destinationId));
  if (!normalized) return [];
  const variants = new Set([normalized]);
  if (normalized.startsWith('55') && normalized.length === 13 && normalized[4] === '9')
    variants.add(`${normalized.slice(0, 4)}${normalized.slice(5)}`);
  if (normalized.startsWith('55') && normalized.length === 12)
    variants.add(`${normalized.slice(0, 4)}9${normalized.slice(4)}`);
  return [...variants].map((value) => `${value}${personalSuffix}`);
}

export function pickResolvedJid(
  result: { jid?: string; lid?: unknown } | undefined,
  candidates: string[] = [],
): string | null {
  if (result?.jid?.includes('@s.whatsapp.net')) return result.jid;
  const phoneJid = candidates.find((id) => id.endsWith(personalSuffix) && personalDigits(id).length === 13)
    ?? candidates.find((id) => id.endsWith(personalSuffix));
  if (phoneJid) return phoneJid;
  return typeof result?.lid === 'string' && result.lid ? result.lid : null;
}

export function isSamePersonalNumber(left: string, right: string): boolean {
  const leftDigits = new Set(personalJidCandidates(`${personalDigits(left)}${personalSuffix}`).map(personalDigits));
  const rightDigits = personalDigits(right);
  return leftDigits.has(rightDigits) || [...leftDigits].some((value) => value === normalizePersonalDigits(rightDigits));
}
