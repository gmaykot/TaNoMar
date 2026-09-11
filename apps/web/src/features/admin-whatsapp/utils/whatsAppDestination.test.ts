import { describe, expect, it } from 'vitest';
import {
  groupDestinationId,
  personalDestinationDisplay,
  personalDestinationId,
} from './whatsAppDestination';

describe('whatsAppDestination', () => {
  it('normaliza número com DDD para JID', () => {
    expect(personalDestinationId('48999999999')).toBe('5548999999999@s.whatsapp.net');
    expect(personalDestinationId('(48) 99999-9999')).toBe('5548999999999@s.whatsapp.net');
    expect(personalDestinationId('55489997710622')).toBe('5548999771062@s.whatsapp.net');
    expect(personalDestinationId('5548999999999@s.whatsapp.net')).toBe(
      '5548999999999@s.whatsapp.net',
    );
    expect(personalDestinationId('123456789012345@lid')).toBe('123456789012345@lid');
  });

  it('mostra o número sem o sufixo do WhatsApp e preserva LID', () => {
    expect(personalDestinationDisplay('5548999999999@s.whatsapp.net')).toBe('5548999999999');
    expect(personalDestinationDisplay('55489997710622@s.whatsapp.net')).toBe('55489997710622');
    expect(personalDestinationDisplay('123456789012345@lid')).toBe('123456789012345@lid');
    expect(personalDestinationDisplay(null)).toBe('');
  });

  it('aceita JID de grupo', () => {
    expect(groupDestinationId('120363001234567890@g.us')).toBe('120363001234567890@g.us');
    expect(groupDestinationId('5548999771062@s.whatsapp.net')).toBeNull();
  });
});
