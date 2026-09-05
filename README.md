# TáNoMar

**Pesque no momento certo.**

Monorepo com PWA React e API ASP.NET Core. O frontend chama `/api/v1` na mesma origem, com login Google e previsão calculada só na API.

## Estrutura

```text
apps/
├── web/                    # React + TypeScript + Vite + PWA
└── api/
    └── TaNoMar.Api/        # ASP.NET Core + EF Core + PostgreSQL
docs/                       # Arquitetura, contratos, deploy e decisões
```

## Frontend

Requer Node.js 22 ou superior. Copie `apps/web/.env.example` para `apps/web/.env` e defina `VITE_GOOGLE_CLIENT_ID` com o mesmo valor de `TaNoMar__GoogleClientId` na API.

```bash
cd apps/web
npm install
npm run dev
```

Rotas: `/entrar`, `/`, `/ranking`, `/locais`, `/locais/novo`, `/locais/:locationId`, `/conta`, `/admin`, `/admin/locais` e `/admin/usuarios`. O Vite encaminha `/api` para `http://127.0.0.1:5000`. No celular use `http://<ip-lan>.nip.io:5173/` e, para instalar o PWA, `https://<ip-lan>.nip.io:5174/` — detalhes em [docs/pwa.md](docs/pwa.md).

| Comando             | Uso                            |
| ------------------- | ------------------------------ |
| `npm run build`     | TypeScript e build de produção |
| `npm run lint`      | ESLint sem warnings            |
| `npm run typecheck` | TypeScript strict              |
| `npm run test`      | Testes Vitest                  |
| `npm run check`     | Todas as validações do web app |

## Backend

Requer .NET 10 e acesso ao PostgreSQL externo. O startup aplica as migrations existentes nesse banco.

```powershell
cd apps/api/TaNoMar.Api
dotnet restore
dotnet build
$env:ConnectionStrings__Default = "Host=<host>;Port=5432;Database=<database>;Username=<user>;Password=<password>"
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run
```

A API expõe `/api/v1`; Swagger fica disponível em Development. Identificadores de runtime e contratos estão em [docs/api-contracts.md](docs/api-contracts.md).

Para desenvolvimento local, execute React e .NET diretamente nos dois terminais acima. Docker não faz parte do fluxo local; a sessão `default` de `.vscode/sessions.json` já inicia ambos os processos.

## Produção no Coolify

O deploy usa `docker-compose.yml` na raiz. Web e API sobem no **mesmo container** — o build do React vira arquivos estáticos servidos pela API em `wwwroot/`. O PostgreSQL continua externo.

Guia completo: **[docs/deployment.md](docs/deployment.md)**.

## Estado atual

- A web chama a API por `/api/v1`, com mappers de contrato e Google Sign-In.
- A API vive em `apps/api/TaNoMar.Api`, com namespace e assembly `TaNoMar.Api`.
- Comunidade, favoritos e locais pessoais têm API e telas: criar/editar pesqueiro, favoritar, relatos, moderação admin, gestão de usuários e inbox de notificações.
- Alertas de previsão (`MaxAlerts`) continuam reservados no plano, sem cadastro nesta versão.

Antes de alterar o projeto, leia [AGENTS.md](AGENTS.md) e [docs/architecture.md](docs/architecture.md).
