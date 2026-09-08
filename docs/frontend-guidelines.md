# Diretrizes de frontend

## Componentes

- Page orquestra composição e estado da rota; alvo de referência: até aproximadamente 200 linhas.
- Componente de feature renderiza um comportamento específico; não acessa HTTP ou fixture.
- Hook coordena consulta e estado reutilizável.
- Service é a fronteira de acesso a dados.
- Componente do design system não contém regra de pesca.

Prefira props explícitas, arquivos pequenos e HTML semântico. Não crie `Helpers`, `Common`, components globais genéricos ou barrels sem necessidade comprovada.

## Estilos

- Use CSS Modules nos componentes e os tokens em `apps/web/src/design-system/tokens/tokens.css`.
- Não espalhe novos hexadecimais, espaçamentos ou shadows.
- Estados precisam de texto ou ícone além de cor.
- Preserve foco visível, alvos de toque de pelo menos 44px e `prefers-reduced-motion`.

## Dados

- Não calcule score/classificação no frontend.
- Não importe fixtures em páginas ou componentes.
- Novos DTOs HTTP devem ficar separados dos modelos consumidos pela UI e passar por mapper explícito.
- Valide o contrato da API nos mappers antes de expor dados à UI.

## Imports e nomes

Use alias `@/` para imports entre domínios e imports relativos dentro da mesma pasta. Nomes devem expressar o domínio: `forecastService`, não `DataService`.

Na interface, o ponto de pesca se chama **local** (plural **locais**): navegação, títulos, formulários, erros e atalhos. Não use “pesqueiro” nem “praia” para nomear essa entidade. “Praia aberta”, “praia semiaberta” e “águas protegidas” ficam só no perfil costeiro. Identificadores de contrato (`fishing-spots`, `praia_aberta`) não mudam.

A área comercial se chama **Assinatura**. Os planos pagos são **Arrais**, **Mestre** e **Capitão**. Não use “Premium” nem “Assinante” como nome do produto: assinante é quem já tem um plano pago. O código estável do Mestre continua `premium`. Bloqueios de recurso usam o rótulo **Assinatura**. Preço, cotas, módulos e disponibilidade são configurados pelo admin em `/admin/planos`; a tela `/premium` lê o catálogo em `GET /billing/catalog`. Um plano só desliga se não houver conta ativa nele.
