# Forecast

A feature apresenta a decisão produzida pelo backend. Ela não calcula nota nem classificação.

- `services`: chamam `/forecasts/ranking`, `/fishing-spots/{id}/forecast` e `/fishing-spots/{id}/marine`.
- `hooks`: integração de services com TanStack Query.
- `components`: seleção de data, carrossel do dia na home, destaque, métricas do ar e o detalhe expansível de mar e maré.
- Na home, data e previsão ficam no mesmo carrossel: um gesto troca o dia inteiro, sem recalcular a nota no cliente.
- O dia ativo mostra o anterior e o próximo numa trilha, para a sequência entre os dias ficar visível.
- `fixtures`: dados determinísticos usados só nos testes de página.

Os DTOs HTTP passam por validação e mapper antes de chegar às páginas. O contrato está em `docs/api-contracts.md`.
