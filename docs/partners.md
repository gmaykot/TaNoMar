# Parceiros

Vitrine de lojas, guias e serviços da ilha. O TáNoMar não vende nem intermedia: o pescador vê a landing e fala com o parceiro por WhatsApp, Instagram, site ou Maps. A cobrança da listagem acontece fora do app.

## Flag

A vitrine pública é ligada pelo admin em `/admin/parceiros` (`Mostrar vitrine de parceiros`). O valor fica em `PlatformSettings.ShowPartners`, padrão `false`.

Com a vitrine desligada:

- `GET /me` devolve `features.showPartners: false`
- `GET /partners` e `GET /partners/{slug}` respondem `404` (`feature_disabled`)
- o menu e `/parceiros` somem para o pescador

O CRUD em `/admin/parceiros` continua ativo. `GET/PUT /admin/settings` troca a flag sem redeploy.

## O que entra

- Diretório em `/parceiros` e landing em `/parceiros/:slug`
- Categorias: loja, guia (leva para pescar), hospedagem, outro
- Ofertas com preço em texto e validade opcional
- Destaque (`isFeatured`): Home, entre o ranking e “Explore todos os locais”, e no topo do diretório

## O que fica de fora

- Login ou painel do parceiro
- Carrinho, checkout ou Mercado Pago
- Vínculo com local ou Ranking
- Upload de imagem no servidor (só URL)
