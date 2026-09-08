# Câmeras ao vivo

Feature exclusiva do plano **Capitão**, ligada pelo módulo `liveWebcams` em `Plans.CanLiveWebcams`.

## Responsabilidades

| Peça | Onde | Papel |
| --- | --- | --- |
| `WebcamService` | `apps/api/TaNoMar.Api/Webcams/WebcamService.cs` | Autorização, vínculo 1:1, cache de disponibilidade e DTOs. Não fala com a Windy |
| `WebcamProviderCatalog` | `apps/api/TaNoMar.Api/Webcams/WebcamProviderCatalog.cs` | Resolve o `IWebcamProvider` pelo `Provider` persistido |
| `IWebcamProvider` | `apps/api/TaNoMar.Api/Webcams/IWebcamProvider.cs` | Pesquisa e detalhes. Não conhece local nem plano |
| `WindyWebcamProvider` | `apps/api/TaNoMar.Api/Webcams/WindyWebcamProvider.cs` | Única implementação nesta entrega. HTTP para a Windy Webcams API v3 |
| `FishingSpotWebcam` | `apps/api/TaNoMar.Api/Data/TaNoMarDbContext.cs` | Persistência: `Provider` + `ExternalId`. URL não é identidade |
| Endpoints | `apps/api/TaNoMar.Api/Webcams/WebcamEndpoints.cs` | Minimal API sob `/api/v1` |
| UI | `apps/web/src/features/webcam` | Card, player, pesquisa, gestão e convite do Capitão |

O frontend **não** envia URL, embed ou stream. A vinculação envia só `{ provider, externalId }`. O backend consulta o provider de novo antes de gravar.

## Identidade

```text
Provider + ExternalId
```

- Windy: `provider = windy`, `externalId` = id da câmera na Windy.
- URL de embed/stream pode mudar e **não** identifica a câmera.

Metadado opcional de origem: `providerDisplayName`. Na Windy vale `"Windy"`. A UI ainda não precisa exibir.

## Quem faz o quê

- **Admin**: pesquisa, seleciona, troca e remove a câmera de qualquer local (`/admin/fishing-spots/{id}/…`). Liga ou desliga a feature em `/admin` (`Mostrar câmeras ao vivo`).
- **Capitão dono de Meu Local** (local pessoal, `OwnerUserId` = usuário autenticado): o mesmo fluxo em `/fishing-spots/{id}/…`, se a feature estiver ligada.
- **Capitão**: vê a transmissão de um local que já tem câmera válida (`GET /fishing-spots/{id}/webcam`), se a feature estiver ligada.
- **Demais planos**: `403` nesse GET. O DTO do local pode trazer `hasLiveWebcam` (booleano, sem URL) para o convite do plano.

Com a feature desligada no admin (`PlatformSettings.ShowLiveWebcams`, padrão `true`):

- `GET /me` devolve `features.showLiveWebcams: false`
- Capitão recebe `403 feature_disabled` no GET da câmera, sem URL/embed
- `hasLiveWebcam` fica `false` no DTO do local
- Admin continua pesquisando, vinculando e removendo

O CRUD admin não depende do interruptor. `GET/PUT /admin/settings` troca `{ showPartners, showLiveWebcams }` sem redeploy. O PUT só altera os campos enviados.

Pesquisa e seleção continuam: local → coordenadas → provider de proximidade → resultados → selecionar → vincular. Sem cadastro manual de URL.

## Provider atual

Windy Webcams API v3, encapsulada em `WindyWebcamProvider`. A pesquisa automática por proximidade (latitude/longitude do local) é responsabilidade dela.

- Base: `https://api.windy.com/webcams/api/v3/`
- Auth: header `x-windy-api-key`
- Pesquisa: `GET /webcams?nearby={lat},{lon},{radiusKm}&include=images,location,player,urls`
- Detalhe: `GET /webcams/{webcamId}?include=images,location,player,urls`
- Documentação: [api.windy.com/webcams/docs](https://api.windy.com/webcams/docs)

Só entram câmeras `active` com `player.live` (embed HTTPS). Timelapse (`player.day` sem live) não é oferecido. Preview usa `images.current.preview|thumbnail|icon` quando a API devolve URL HTTPS.

A chave é opcional. Sem `WINDY_WEBCAMS_API_KEY` a API sobe normalmente; a pesquisa responde `503 webcam_unconfigured`.

## Providers futuros (não implementados)

O catálogo aceita novas implementações de `IWebcamProvider` sem migration estrutural do vínculo (`Provider` + `ExternalId` já é genérico).

Previsto, **sem código nesta entrega**:

| Id | Classe | Uso |
| --- | --- | --- |
| `windy` | `WindyWebcamProvider` | Pesquisa automática de câmeras próximas (atual) |
| `partner` | `PartnerWebcamProvider` | Câmeras de parceiros locais |
| `youtube` | — | Transmissão YouTube |
| `custom` | — | Fonte própria, ainda via seleção no backend |

Câmeras parceiras poderão vir de pousadas, marinas, lojas de pesca, restaurantes, empresas de monitoramento de praias e redes de webcams. O `PartnerWebcamProvider` devolveria `providerDisplayName` com o nome do parceiro (ex.: "Parceiro XYZ") para a UI mostrar "Câmera fornecida por". **Não implementar agora.**

## Configuração

```bash
WINDY_WEBCAMS_API_KEY=
Webcams__SearchRadiusKm=10
Webcams__AvailabilityCacheMinutes=15
```

Chave: [api.windy.com](https://api.windy.com/) → Webcams API. Não versionar a chave.

## Teste local do Capitão (sem pagamento)

Em Development, um Admin troca o plano da conta em `/admin/usuarios` para **Capitão** (`capitao`). Isso já existia e não é um bypass de produção.

## Teste local de Admin

`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_GOOGLE_SUBJECT` promovem a conta Google correspondente. No primeiro login essa conta entra no Mestre; o admin pode depois atribuir Capitão se quiser ver o player na página do local (o gerenciamento admin não depende do plano).
