# ADR-001 — Arquitetura do frontend

## Status

Aceita.

## Decisão

Usar React, TypeScript strict, Vite e organização por feature. Pages orquestram, hooks coordenam, services acessam dados e componentes renderizam. TanStack Query representa toda fonte assíncrona da API.

## Motivo

O produto terá múltiplas leituras da mesma previsão e futura integração HTTP. A separação mantém páginas pequenas, contratos localizáveis e troca de dados sem reescrever a UI.

## Consequências

Não haverá Redux, store global genérica, chamadas HTTP em JSX nem pastas globais de componentes de feature.
