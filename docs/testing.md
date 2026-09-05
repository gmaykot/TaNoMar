# Testes

## Estratégia atual

- Vitest + Testing Library para componentes, páginas, hooks e services.
- jsdom para interações e acessibilidade básica.
- TypeScript strict e ESLint fazem parte da validação.
- Build valida manifest e geração do service worker.

## Prioridades

1. Decisões que mudam o local ou dia exibido.
2. Ordenação e representação acessível da nota.
3. Busca de locais.
4. Services e mapeadores de contrato.
5. Estados vazio, erro, offline, login e rota inválida.

No web, use `npm --prefix apps/web run check`. Na API, use `dotnet build apps/api/TaNoMar.Api/TaNoMar.Api.csproj`; ainda não existe projeto de testes .NET. E2E com Playwright fica para quando os fluxos autenticados estiverem estáveis em ambiente compartilhado.
