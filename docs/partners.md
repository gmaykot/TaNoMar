# Parceiros

Vitrine de lojas, guias e serviços da ilha. O TáNoMar não vende nem intermedia: o pescador vê a landing e fala com o parceiro por WhatsApp, Instagram, site ou Maps. A cobrança da listagem acontece fora do app.

## Flag

`TaNoMar:ShowPartners` (env `TaNoMar__ShowPartners`) controla a vitrine pública. Padrão `false`. Em Development o `appsettings.Development.json` liga a flag para o admin revisar a landing.

Com a flag desligada:

- `GET /me` devolve `features.showPartners: false`
- `GET /partners` e `GET /partners/{slug}` respondem `404` (`feature_disabled`)
- o menu e `/parceiros` somem para o pescador

O CRUD em `/admin/parceiros` continua ativo.

## O que entra

- Diretório em `/parceiros` e landing em `/parceiros/:slug`
- Categorias: loja, guia (leva para pescar), hospedagem, outro
- Ofertas com preço em texto e validade opcional
- Destaque no diretório (`isFeatured`)

## O que fica de fora

- Login ou painel do parceiro
- Carrinho, checkout ou Mercado Pago
- Vínculo com local, Home ou Ranking
- Upload de imagem no servidor (só URL)
