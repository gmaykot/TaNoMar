export function personalDestinationId(input: string) {
  const trimmed = input.trim();
  if (trimmed.endsWith('@lid')) {
    const lid = trimmed.slice(0, -'@lid'.length);
    return /^\d{10,20}$/.test(lid) ? trimmed : null;
  }

  if (trimmed.endsWith('@s.whatsapp.net')) {
    const user = trimmed.slice(0, -'@s.whatsapp.net'.length).split(':')[0] ?? '';
    return /^\d{10,15}$/.test(user) ? `${user}@s.whatsapp.net` : null;
  }

  let digits = trimmed.replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55'))
    digits = `55${digits}`;
  if (digits.startsWith('55') && digits.length > 13) digits = digits.slice(0, 13);
  return digits.length === 12 || digits.length === 13 ? `${digits}@s.whatsapp.net` : null;
}

export function groupDestinationId(input: string) {
  const trimmed = input.trim();
  if (!trimmed.endsWith('@g.us')) return null;
  const user = trimmed.slice(0, -'@g.us'.length);
  return /^\d{10,25}$/.test(user) ? trimmed : null;
}

export function personalDestinationDisplay(id: string | null) {
  if (!id) return '';
  if (id.endsWith('@lid')) return id;
  const normalized = personalDestinationId(id);
  return (normalized ?? id).replace(/@s\.whatsapp\.net$/, '');
}
