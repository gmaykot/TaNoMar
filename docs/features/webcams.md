# Câmeras ao vivo

Feature exclusiva do plano **Capitão**, ligada pelo módulo `liveWebcams` em `Plans.CanLiveWebcams`.

## Responsabilidades

| Peça | Onde | Papel |
| --- | --- | --- |
| `WebcamService` | `apps/api/TaNoMar.Api/Webcams/WebcamService.cs` | Autorização, vínculo 1:1, cache de disponibilidade e DTOs. Não fala com a Windy |
| `WebcamProviderCatalog` | `apps/api/TaNoMar.Api/Webcams/WebcamProviderCatalog.cs` | Resolve o `IWebcamProvider` pelo `Provider` persistido |
| `IWebcamProvider` | `apps/api/TaNoMar.Api/Webcams/IWebcamProvider.cs` | Pesquisa, lookup e detalhes. Não conhece local nem plano |
| `WindyWebcamProvider` | `apps/api/TaNoMar.Api/Webcams/WindyWebcamProvider.cs` | HTTP para a Windy Webcams API v3 (proximidade) |
| `YouTubeWebcamProvider` | `apps/api/TaNoMar.Api/Webcams/YouTubeWebcamProvider.cs` | HTTP para a YouTube Data API v3 (admin, por link) |
| `FishingSpotWebcam` | `apps/api/TaNoMar.Api/Data/TaNoMarDbContext.cs` | Persistência: `Provider` + `ExternalId`. URL não é identidade |
| Endpoints | `apps/api/TaNoMar.Api/Webcams/WebcamEndpoints.cs` | Minimal API sob `/api/v1` |
| UI | `apps/web/src/features/webcam` | Card, player expandido (vire o celular para preencher), pesquisa, gestão, convite do Capitão e aviso de que a transmissão é de terceiros, sem garantia de manutenção ou disponibilidade |

O frontend **não** envia URL, embed ou stream. A vinculação envia só `{ provider, externalId }`. O backend consulta o provider de novo antes de gravar.

A UI avisa que a transmissão, a manutenção e a disponibilidade são de terceiros. O TáNoMar só exibe o stream e não garante que a câmera esteja no ar.

## Identidade

```text
Provider + ExternalId
```

- Windy: `provider = windy`, `externalId` = id da câmera na Windy.
- YouTube: `provider = youtube`, `externalId` = id do vídeo na YouTube Data API.
- URL de embed/stream pode mudar e **não** identifica a câmera.

Metadado opcional de origem: `providerDisplayName`. Windy vale `"Windy"`; YouTube vale `"YouTube"`.

## Quem faz o quê

- **Admin**: pesquisa Windy por proximidade, consulta live do YouTube pelo link, seleciona, troca e remove a câmera de qualquer local (`/admin/fishing-spots/{id}/…`). Liga ou desliga a feature em `/admin` (`Mostrar câmeras ao vivo`). Só o perfil Admin inclui câmera.
- **Capitão**: vê a transmissão de um local que já tem câmera válida (`GET /fishing-spots/{id}/webcam`), se a feature estiver ligada. Não pesquisa, vincula nem remove câmera.
- **Demais planos**: `403` nesse GET. O DTO do local pode trazer `hasLiveWebcam` (booleano, sem URL). A web não mostra câmera nem convite no detalhe do local sem `modules.liveWebcams`.

Com a feature desligada no admin (`PlatformSettings.ShowLiveWebcams`, padrão `true`):

- `GET /me` devolve `features.showLiveWebcams: false`
- Capitão recebe `403 feature_disabled` no GET da câmera, sem URL/embed
- `hasLiveWebcam` fica `false` no DTO do local
- Admin continua pesquisando, vinculando e removendo

O CRUD admin não depende do interruptor. `GET/PUT /admin/settings` troca `{ showPartners, showLiveWebcams }` sem redeploy. O PUT só altera os campos enviados.

Pesquisa Windy: local → coordenadas → câmeras próximas → selecionar → vincular `{ provider, externalId }`. YouTube (só admin): colar o link da live, do canal ou de um vídeo desse canal → a API confirma `liveBroadcastContent = live` e embeddable. Se o vídeo já encerrou, lista as lives atuais do mesmo canal. A UI seleciona → o POST envia só `{ provider: "youtube", externalId }`. Sem persistir URL. Gravação antiga não vira câmera ao vivo.

## Providers

### Windy (proximidade)

Windy Webcams API v3, encapsulada em `WindyWebcamProvider`. A pesquisa automática por proximidade (latitude/longitude do local) é responsabilidade dela.

- Base: `https://api.windy.com/webcams/api/v3/`
- Auth: header `x-windy-api-key`
- Pesquisa: `GET /webcams?nearby={lat},{lon},{radiusKm}&include=images,location,player,urls`
- Detalhe: `GET /webcams/{webcamId}?include=images,location,player,urls`
- Documentação: [api.windy.com/webcams/docs](https://api.windy.com/webcams/docs)

Só entram câmeras `active` com `player.live` (embed HTTPS). Timelapse (`player.day` sem live) não é oferecido. Preview usa `images.current.preview|thumbnail|icon` quando a API devolve URL HTTPS. A miniatura entra em `previewUrl` no GET da câmera vinculada e a web abre o embed com autoplay mudo.

A chave é opcional. Sem `WINDY_WEBCAMS_API_KEY` a API sobe normalmente; a pesquisa responde `503 webcam_unconfigured`.

### YouTube (admin)

YouTube Data API v3, encapsulada em `YouTubeWebcamProvider`. Só o admin consulta e vincula.

- Base: `https://www.googleapis.com/youtube/v3/`
- Auth: query `key`
- Detalhe: `GET /videos?part=snippet,status&id={videoId}`
- Canal ao vivo: `GET /channels?part=id&forHandle=@handle` e `GET /search?part=snippet&channelId={id}&eventType=live&type=video`
- Documentação: [developers.google.com/youtube/v3](https://developers.google.com/youtube/v3)
- Endpoint: `GET /admin/fishing-spots/{id}/webcams/youtube?q=`
- Aceita `watch`, `youtu.be`, `embed`, `live/{id}`, `@handle`, `@handle/live` e `channel/{id}/live`
- Live específica: entra com `liveBroadcastContent = live` e `status.embeddable != false`. Embed: `https://www.youtube.com/embed/{id}`
- Vídeo encerrado ou canal: lista as lives atuais daquele canal (até 25), cada uma revalidada em `videos.list`
- Sem live no ar ou não incorporável: `400 webcam_invalid`

A chave é opcional. Sem `YOUTUBE_API_KEY` a API sobe; a consulta admin responde `503 webcam_unconfigured`. Quem não é Admin recebe `403` ao pesquisar, vincular ou remover câmera.

## Providers futuros (não implementados)

O catálogo aceita novas implementações de `IWebcamProvider` sem migration estrutural do vínculo (`Provider` + `ExternalId` já é genérico).

Previsto, **sem código nesta entrega**:

| Id | Classe | Uso |
| --- | --- | --- |
| `partner` | `PartnerWebcamProvider` | Câmeras de parceiros locais |
| `custom` | — | Fonte própria, ainda via seleção no backend |

Câmeras parceiras poderão vir de pousadas, marinas, lojas de pesca, restaurantes, empresas de monitoramento de praias e redes de webcams. O `PartnerWebcamProvider` devolveria `providerDisplayName` com o nome do parceiro (ex.: "Parceiro XYZ") para a UI mostrar "Câmera fornecida por". **Não implementar agora.**

## Configuração

```bash
WINDY_WEBCAMS_API_KEY=
YOUTUBE_API_KEY=
Webcams__SearchRadiusKm=10
Webcams__AvailabilityCacheMinutes=15
```

Chave Windy: [api.windy.com](https://api.windy.com/) → Webcams API. Chave YouTube: Google Cloud → YouTube Data API v3. Não versionar as chaves.

## Teste local do Capitão (sem pagamento)

Em Development, um Admin troca o plano da conta em `/admin/usuarios` para **Capitão** (`capitao`). Isso já existia e não é um bypass de produção.

## Teste local de Admin

`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_GOOGLE_SUBJECT` promovem a conta Google correspondente. No primeiro login essa conta entra no Mestre; o admin pode depois atribuir Capitão se quiser ver o player na página do local (o gerenciamento admin não depende do plano).
