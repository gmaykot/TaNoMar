# ADR-003 — Fronteira de integração da API

## Status

Aceita; web integrada à API por mesma origem, com Google Sign-In.

## Decisão

A API vive em `apps/api/TaNoMar.Api`. O frontend não copia regra de negócio do backend. Services chamam `/api/v1` por mesma origem, validam DTOs de wire e os convertem por mappers explícitos. Autenticação usa Google Identity Services, access token em memória e refresh no cookie HttpOnly.

## Motivo

Centralizar web e API no mesmo repositório simplifica deploy e evolução. Os DTOs atuais ainda são anônimos e a API não habilita CORS; proxy de mesma origem preserva cookies e evita acoplar componentes ao formato instável.

## Consequências

Fixtures permanecem só para testes de página. Endpoints autenticados nunca entram no cache do service worker. Identificadores de runtime estáveis usam o prefixo TáNoMar (ver `docs/api-contracts.md`).
