export function whatsAppHref(whatsApp: string) {
  const digits = whatsApp.replace(/\D/g, '');
  const text = encodeURIComponent('Vi vocês no TáNoMar.');
  return `https://wa.me/${digits}?text=${text}`;
}

export function instagramHref(instagram: string) {
  if (instagram.startsWith('http://') || instagram.startsWith('https://')) return instagram;
  const handle = instagram.replace(/^@/, '');
  return `https://instagram.com/${handle}`;
}
