import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isSamePersonalNumber,
  normalizePersonalDigits,
  personalJidCandidates,
  pickResolvedJid,
} from './personalJid.js';

test('corta o dígito extra do número brasileiro com 55', () => {
  assert.equal(normalizePersonalDigits('55489997710622'), '5548999771062');
  assert.equal(normalizePersonalDigits('48999771062'), '5548999771062');
});

test('inclui variante brasileira com e sem o nono dígito', () => {
  assert.deepEqual(personalJidCandidates('5548999771062@s.whatsapp.net'), [
    '5548999771062@s.whatsapp.net',
    '554899771062@s.whatsapp.net',
  ]);
  assert.deepEqual(personalJidCandidates('55489997710622@s.whatsapp.net'), [
    '5548999771062@s.whatsapp.net',
    '554899771062@s.whatsapp.net',
  ]);
});

test('não altera grupo nem JID já canônico de outro país', () => {
  assert.deepEqual(personalJidCandidates('120363000000@g.us'), ['120363000000@g.us']);
  assert.deepEqual(personalJidCandidates('351912345678@s.whatsapp.net'), [
    '351912345678@s.whatsapp.net',
  ]);
});

test('usa o JID de telefone e só cai no LID se faltar o número', () => {
  assert.equal(
    pickResolvedJid({ jid: '5548999771062@s.whatsapp.net', lid: '123@lid' }),
    '5548999771062@s.whatsapp.net',
  );
  assert.equal(
    pickResolvedJid({ lid: '123@lid' }, ['5548999771062@s.whatsapp.net']),
    '5548999771062@s.whatsapp.net',
  );
});

test('reconhece o mesmo celular com e sem o nono dígito', () => {
  assert.equal(isSamePersonalNumber('5548999771062', '554899771062'), true);
  assert.equal(isSamePersonalNumber('5548999771062', '5511999999999'), false);
});
