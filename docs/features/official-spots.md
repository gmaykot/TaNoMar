# Locais oficiais do sistema

Administração em `/admin/locais-sistema`. Contrato: `GET/POST/PUT/DELETE /admin/fishing-spots`.

## Conceitos

| Campo | Significado | Valores |
| --- | --- | --- |
| `type` | O que o local é | `praia`, `costao`, `canal`, `lagoa`, `rio`, `estuario`, `ilha`, `pier`, `outro` |
| `profile` | Exposição física (fórmula atual) | `praia_aberta`, `praia_semi_aberta`, `praia_protegida` |
| `fishingEnvironment` | Ambiente de pesca (persistido; a fórmula ainda não usa) | `mar_aberto`, `baia`, `lagunar`, `estuarino`, `fluvial` |
| `accessType` | Como se acessa/pesca no ponto | `terrestre`, `trilha`, `embarcado`, `caiaque`, `misto` |
| `region` | Localização geográfica principal | `norte`, `sul`, `leste`, `oeste`, `continente`, `ilhas` |
| `restrictionNotes` | Observação administrativa opcional | texto livre |
| `seaOrientationDegrees` | Azimute para o mar | número ou `null` quando não se aplica |

`profile` não identifica o tipo do local. Os valores internos `praia_*` permanecem para não alterar a fórmula da nota.

A preferência de conta `Ilha de Santa Catarina` cobre norte, sul, leste e oeste. Continente e ilhas são escolhas à parte.

## Seed da Grande Florianópolis

`OfficialSpotCatalog` + `TaNoMarDbSeeder.SeedOfficialSpotsAsync` são idempotentes: casam por slug ou nome e não duplicam. Em atualização, complementam classificação e preenchem coordenadas/orientação só se estiverem vazias. Não alteram `isActive`, `isFreeDefault` nem IDs.

Pendências de coordenadas (sem valor público inequívoco no catálogo):

- Ilha das Campanhas
- Ilha das Cabras

Orientação do mar fica vazia em pontos em que um único azimute não descreve o local:

- Ponte da Lagoa / Rendeiras, Costa da Lagoa, Rio Tavares
- Ilhas (incluindo as duas sem coordenadas)
- Rio Biguaçu e Rio Cubatão

Os 11 locais do seed original conservam as coordenadas e a orientação já gravadas. Ribeirão da Ilha passa a região `sul` (lista da Grande Florianópolis), sem alterar coordenadas nem orientação. Novos pontos costeiros usam posições públicas dos nomes oficiais; o seed não chama a Geoapify.

## Fórmula de previsão

A nota continua usando vento, ondas (Open-Meteo Marine), chuva, hora e `profile`. Não usa `type`, `fishingEnvironment` nem `accessType`.

Limitações atuais:

- Lagoas, rios, canais e estuários recebem altura/período de onda marinha, que em geral não descrevem o corpo d’água.
- Ilhas não têm um único `seaOrientationDegrees`; sem orientação, a parcela direcional da nota usa o valor já existente da fórmula para vento cruzado (6,5) e `windOrigin` fica vazio.
- Locais sem latitude/longitude não entram no ranking nem no aquecimento.

Não altere a fórmula nesta evolução; `fishingEnvironment` existe para uma etapa posterior.
