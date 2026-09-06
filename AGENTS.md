# AGENTS.md — TáNoMar

TáNoMar ajuda pescadores a decidir onde e quando pescar. O repositório contém web e API no mesmo monorepo, sem compartilhar código-fonte entre eles.

## Mapa rápido

- Web: `apps/web` — React, TypeScript, Vite e PWA.
- API: `apps/api/TaNoMar.Api` — ASP.NET Core, EF Core e PostgreSQL.
- Web: `npm --prefix apps/web run check`.
- API: `dotnet build apps/api/TaNoMar.Api/TaNoMar.Api.csproj`.
- Desenvolvimento local executa React e .NET diretamente; não usa Docker.
- Docker é exclusivo do deploy de produção no Coolify (`docker-compose.yml` + Dockerfile da API). Ver `docs/deployment.md`.
- PostgreSQL é externo em todos os ambientes e chega pela configuração `ConnectionStrings__Default`.
- Pages web orquestram em `apps/web/src/pages`; hooks coordenam, services acessam dados e componentes renderizam.
- Regras e cálculo de pesca pertencem à API; o frontend nunca recalcula a nota.
- Tokens e componentes globais ficam em `apps/web/src/design-system`.
- Contratos e identificadores de runtime estão em `docs/api-contracts.md`.
- Na interface, o ponto de pesca se chama **local** (plural **locais**). Não use “pesqueiro” nem “praia” para nomear a entidade. Ver `docs/frontend-guidelines.md`.
- Parceiros (vitrine, sem venda no app) estão em `docs/partners.md`. A vitrine pública é ligada pelo admin em `/admin/parceiros`.

## Antes de alterar uma feature

1. Leia `AGENTS.md`.
2. Leia `docs/architecture.md`.
3. Leia a documentação específica da feature quando existir.
4. Preserve contratos públicos.
5. Reutilize padrões existentes.
6. Evite novas abstrações sem necessidade.
7. Atualize a documentação se a arquitetura ou comportamento relevante mudar.

Não altere migrations, fórmula de pesca, issuer/audience JWT, cookie, seção de configuração ou caminhos persistentes sem análise de compatibilidade. Detalhes em `docs/api-contracts.md`.
