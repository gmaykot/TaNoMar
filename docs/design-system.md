# Design system TáNoMar

## Direção

O sistema segue o kit em `docs/brand`: oceano profundo para confiança, turquesa para movimento, sol para ação e espuma para respiro. A aplicação fala de pesca; ondas e clima são indicadores, não posicionamento de surf.

## Tokens

`apps/web/src/design-system/tokens/tokens.css` concentra:

- cores e estados semânticos;
- tipografia Sora (interface) e Caveat (destaques emocionais);
- espaçamento;
- radius e shadows;
- breakpoints;
- transições;
- z-index.

Âncoras: Oceano `#00384A`, Mar `#08BDC7`, Sol `#FF783D` e Espuma `#FAF7EF`. Erro, sucesso e aviso continuam semânticos e não vêm da prancha.

Sora e Caveat são servidas localmente. Caveat não entra em botões, formulários, navegação nem textos funcionais.

## Componentes iniciais

- `Button`: ações primária, secundária e quiet.
- `Card`: superfície de conteúdo.
- `Badge`: classificação com texto e ícone.
- `ScoreIndicator`: nota de 0 a 10 com descrição acessível.
- `MetricTile`: indicador meteorológico ou marinho.
- `IconButton`, `SearchField`, `FeedbackState` (vazio, erro ou `busy` para carregamento) e `ConfirmDrawer` (gaveta no rodapé para confirmar uma ação).

## Marca

A fonte aprovada é `docs/brand`. O app serve as cópias em `apps/web/public/brand`. `TaNoMarLogo` usa a horizontal com slogan nas áreas amplas, a versão sem slogan na navbar e o símbolo nos espaços quadrados; em fundo escuro entra a variante branca ou o símbolo para fundo escuro. Ícones de navegação continuam semânticos (Lucide), não o símbolo da marca.
