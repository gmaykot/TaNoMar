# Design system TáNoMar

## Direção

O sistema segue o kit em `docs/brand/tanomar-brand-kit`: oceano profundo para confiança, turquesa para movimento, coral para ação e areia para respiro. A aplicação fala de pesca; ondas e clima são indicadores, não posicionamento de surf.

## Tokens

`apps/web/src/design-system/tokens/tokens.css` concentra:

- cores e estados semânticos;
- tipografia Sora (interface) e Caveat (destaques emocionais);
- espaçamento;
- radius e shadows;
- breakpoints;
- transições;
- z-index.

Âncoras: Ocean `#063B4C`, Sea `#42C5BA`, Coral `#FF7448`, Sand `#F3E9D7` e Foam `#F8FBFA`.

Sora e Caveat são servidas localmente. Caveat não entra em botões, formulários, navegação nem textos funcionais.

## Componentes iniciais

- `Button`: ações primária, secundária e quiet.
- `Card`: superfície de conteúdo.
- `Badge`: classificação com texto e ícone.
- `ScoreIndicator`: nota de 0 a 10 com descrição acessível.
- `MetricTile`: indicador meteorológico ou marinho.
- `IconButton`, `SearchField` e `FeedbackState` (vazio, erro ou `busy` para carregamento).

## Marca

Logos e ícones oficiais em `apps/web/public/brand` e `apps/web/public/icons` vêm do brand kit raster. `TaNoMarLogo` usa os PNG horizontais (login e desktop) e o compacto (barra estreita). O símbolo serve a espaços quadrados; ícones de navegação continuam semânticos (Lucide), não o símbolo da marca.
