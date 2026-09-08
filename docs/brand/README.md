# Marca TáNoMar

A fonte aprovada da identidade é este kit. Não use outra pasta, prancha antiga ou recorte da referência para gerar assets.

Os arquivos de implementação estão em `logos/`, `simbolos/`, `pwa/` e `favicons/`. A prancha em `referencia/` é direção visual.

O app serve em `apps/web/public/brand` as cópias usadas em runtime. O PNG mestre (`logos/tanomar-horizontal-master.png`) fica só neste kit: é grande demais para o precache do PWA e não entra na interface. Tokens da interface ficam em `apps/web/src/design-system/tokens/tokens.css`, ancorados nesta paleta.

Slogan: **PESQUE NO MOMENTO CERTO.**
Marca visual: **TáNoMar**. Identificadores técnicos, URLs e contratos permanecem `tanomar`.

## Paleta

- Oceano `#00384A`
- Mar `#08BDC7`
- Sol `#FF783D`
- Espuma `#FAF7EF`

A arte raster tem pequenas variações de tom. Os tokens são os valores de referência da interface.

## Uso no app

- Landing, login e áreas amplas: logo horizontal com slogan.
- Navbar e barras estreitas: logo horizontal sem slogan.
- Espaços quadrados: símbolo colorido; em fundo escuro, símbolo turquesa e laranja ou logo branca.
- PWA e ícone instalado: só o símbolo com fundo azul-mar. Arquivos maskable ficam com `purpose: maskable`.
- Favicon e Apple touch icon vêm de `favicons/` e `pwa/apple-touch-icon.png`.

Não distorça, rotacione, recolora nem acrescente sombra ao logo. Coral/sol é cor de ação, não dominante. Não grave cantos arredondados nos ícones PWA.

Detalhe do pacote: [LEIA-ME.md](LEIA-ME.md) e [INVENTARIO.md](INVENTARIO.md).
