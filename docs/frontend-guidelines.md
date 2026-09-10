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

Na interface, o ponto de pesca se chama **local** (plural **locais**): navegação, títulos, formulários, erros e atalhos. Não use “pesqueiro” nem “praia” para nomear essa entidade. O **tipo** (`praia`, `ilha`, `canal`, `lagoa`…) diz o que o ponto é. O **perfil** (`praia_aberta`, `praia_semi_aberta`, `praia_protegida`) descreve só a exposição; na UI use Aberta, Semiaberta e Protegida. A **região** do local é `norte`, `sul`, `leste`, `oeste`, `continente` ou `ilhas` — não use “Ilha de Santa Catarina” como região de um ponto. Identificadores de contrato (`fishing-spots`, `praia_aberta`) não mudam.

O carimbo **Meu local** aparece só para o dono. Em local compartilhado, a comunidade vê **Compartilhado**; o dono continua vendo **Meu local**. O carimbo **Favorito** usa o mesmo padrão e pode aparecer junto de **Meu local** ou **Compartilhado**; não altera nota, ranking nem ordenação.

A área comercial se chama **Assinatura**. Os planos pagos são **Arrais**, **Mestre** e **Capitão**. Não use “Premium” nem “Assinante” como nome do produto: assinante é quem já tem um plano pago. O código estável do Mestre continua `premium`. Bloqueios de recurso usam o rótulo **Assinatura**. Preço, cotas, módulos e disponibilidade são configurados pelo admin em `/admin/planos`; a tela `/premium` lê o catálogo em `GET /billing/catalog`. Um plano só desliga se não houver conta ativa nele.

O foco do aplicativo (`pescador`, `surfista` ou `ambos`) é preferência de apresentação e só existe se o admin ligar `features.showAppFocus`. Desligado, o padrão é pesca e a escolha some. Não recalcule a nota nem mude o ranking por causa do foco: só mostre ou oculte blocos e indicadores. Surfista não vê comunidade nem envio de alerta de previsão. Sem foco escolhido e com a flag ligada, a web interrompe o primeiro acesso em `/comecar`.

Câmeras ao vivo usam `hasLiveWebcams(user)` (`modules.liveWebcams` e `features.showLiveWebcams`). Não compare `plan.code === 'capitao'` na interface. Só o admin inclui câmera, em `/admin/locais-sistema`. A página de detalhes só reproduz a transmissão. A web envia o link na consulta e o POST de vínculo leva só `{ provider, externalId }`.
