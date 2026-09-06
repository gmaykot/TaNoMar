# Contratos da API

Base: `/api/v1`. Implementação em `apps/api/TaNoMar.Api`.

## Autenticação

- `POST /auth/google`: recebe `{ credential }`, devolve `{ accessToken }` e cria refresh token HttpOnly.
- `POST /auth/refresh`: rotaciona refresh token e devolve novo access token.
- `POST /auth/logout`: revoga e remove o cookie no path `/api/v1/auth`.
- `GET /me`: usuário, role, plano, entitlements, `features.showPartners` e preferências.
- `PUT /me/preferences`: região (um ou mais trechos da ilha, separados por ` | `), unidade de vento e opt-in de notificações de previsão.

O access token é JWT Bearer e fica só em memória no frontend. O refresh token permanece no cookie `tanomar_refresh`. A web entra em `/entrar` com Google Identity Services, tenta refresh na abertura e encerra a sessão após um 401 sem cookie válido.

`BOOTSTRAP_ADMIN_EMAIL` e `BOOTSTRAP_ADMIN_GOOGLE_SUBJECT` promovem o usuário correspondente a Admin com plano Premium no login Google e de novo em `GET /me`. O subject é a claim `sub` do token Google, não o e-mail. Usuários novos entram no plano Free.

## Identificadores de runtime

Estes nomes são contratos estáveis — alterá-los exige migração com compatibilidade transitória:

- seção de configuração `TaNoMar` e prefixo de ambiente `TaNoMar__`;
- issuer/audience JWT `tanomar`;
- user-agent Open-Meteo e Tábua de Maré API `tanomar/2.0`;
- cookie `tanomar_refresh`;
- caminho `/var/lib/tanomar` para o arquivo de auditoria.

Namespaces, assembly, projeto, DbContext, seeder, options e usuário interno do container usam `TaNoMar`.

## Pesca e locais

- `GET /fishing-spots`: locais oficiais, compartilhados aprovados e privados do usuário. O DTO inclui `profile`, `visibility`, `isApproved`, `isOwner`, `isFavorite`, `isEnabled`, `isInRanking` e `seaOrientationDegrees`. Sem preferência do usuário, oficiais, compartilhados aprovados e locais pessoais do dono vêm `isEnabled = true`.
- `POST /fishing-spots`: local pessoal sujeito ao plano, duplicidade (mesmo nome, ignorando maiúsculas, ou até 200 m), perfil costeiro e visibilidade (`shared` pendente ou `private`). O dono já recebe o local habilitado nas previsões; a API aquece o cache de previsão (nota e ranking) antes de responder.
- `PUT /fishing-spots/{id}`: dono edita o local; a mesma regra de duplicidade vale contra os demais; compartilhar de novo volta para moderação.
- `DELETE /fishing-spots/{id}`: dono remove o local e os relatos/favoritos/habilitações ligados.
- `GET /places/autocomplete?q=`: busca autenticada de lugares via Geoapify no cadastro de locais. `q` exige 3–80 caracteres. Resposta `{ items: [{ name, formatted, city, state, category, latitude, longitude }] }`. Sem chave ou falha da Geoapify devolve `items` vazio. Rate limit por IP (20/min). Chave: `GEOAPIFY_API_KEY` / `Fishing:GeoapifyApiKey`.
- `PUT /me/favorites`: favoritos sujeitos ao limite do plano. Free não tem cota (`maxFavorites = 0`); Premium tem 20.
- `PUT /me/enabled-spots`: habilita ou remove o local da lista de previsões do usuário. Sem limite de plano. `{ spotId, isEnabled }`. Ao habilitar, a API aquece o cache de previsão para o ranking.
- `GET /forecasts/ranking`: dias permitidos pelo plano e ranking por dia, só com os locais que o usuário habilitou. Sem preferência, o padrão é o mesmo de `isEnabled`. Query opcional `emphasis=wind|wind-more|rain|rain-more|waves|waves-less` reordena pela métrica na melhor janela, sem recalcular a nota. Ausente ou vazio mantém a ordem por nota. `wind` e `rain` ordenam do menor para o maior; `waves` do maior para o menor. Os sufixos `-more` e `-less` invertem essa direção. Valor inválido responde `400`. Qualquer `emphasis` no plano Free responde `400` (`plan_required`).
- `GET /fishing-spots/{id}/forecast`: dias de previsão do local visível, inclusive local pessoal do dono.
- `GET /fishing-spots/{id}/marine?date=`: série horária de ondas, período, swell, água, pressão atmosférica e maré do dia. Free recebe `locked`; Premium recebe a série. A pressão vem de `pressure_msl` da Open-Meteo (hPa e tendência) e entra no snapshot da previsão. A tábua de maré vem do porto oficial mais próximo, via Tábua de Maré API (`tabuamare.api.br`), e também entra no snapshot (`tidePoints`, `tideExtremes`, `tideAttribution`). Se essa API falhar, o marine tenta o nível modelado `sea_level_height_msl` da Open-Meteo. Pode vir `unavailable`. O ranking não inclui essa série. A nota não usa pressão nem maré.
- `GET /public/offline-forecast`: previsão pública do dia, com `Cache-Control` público.

O contrato de métrica é uma união `{ state: "available", value }` ou `{ state: "locked", reason, requiredPlan }`. Maré também aceita `{ state: "unavailable" }`. A Open-Meteo fornece tempo, mar e pressão. A tábua usa dados publicados pela Marinha, lidos por uma API comunitária — não é canal oficial da Marinha nem serve para navegação. Snapshot com horas permanece fresco mesmo sem tábua, para a Open-Meteo não ser reconsultada em loop se a tábua cair. Chave opcional: `TABUA_MARE_API_KEY` / `Fishing:TabuaMareApiKey`. O frontend valida esse wire e mapeia para os tipos da UI; nota e classificação nunca são recalculadas no cliente.

## Comunidade, moderação e notificações

- `GET /community/reports?spotId=`: relatos ativos em locais públicos. Tipos: `condicao` (12h) e `perigo` (24h). O DTO inclui `authorName`, `createdAt` e `isMine`.
- `POST /community/reports`: cria relato em local oficial ou compartilhado aprovado. A mesma pessoa não envia o mesmo tipo e comentário no mesmo local no mesmo dia civil (`America/Sao_Paulo`); a API responde `409` (`duplicate_report`). Contas ativas recebem aviso no inbox com o nome de quem relatou; o autor recebe a confirmação de envio.
- `DELETE /community/reports/{id}`: o autor apaga o próprio relato e os votos ligados.
- `POST /community/reports/{id}/confirm` e `/contest`: um voto por usuário, só no plano Premium. Free vê e cria relatos; o autor não vota no próprio. Sem Premium a API responde `400` (`plan_required`).
- `GET /admin/fishing-spots/pending`, `POST /admin/fishing-spots/{id}/approve` e `/reject`: só Admin. Recusar devolve o ponto para `private` e notifica o dono.
- `GET /admin/users`, `PUT /admin/users/{id}/plan` e `PUT /admin/users/{id}/active`: só Admin. Lista contas, troca o plano (`free` ou `premium`) e bloqueia ou libera o acesso. A conta do bootstrap não muda de plano nem é bloqueada; o admin não bloqueia a si mesmo nem o último admin ativo. Bloquear revoga os refresh tokens.
- `GET /me` inclui `features.showPartners`, ligado pela configuração persistida em `PlatformSettings` (admin em `/admin/parceiros`, padrão `false`).
- `GET /partners` e `GET /partners/{slug}`: vitrine autenticada. Só com a flag ligada; senão `404` (`feature_disabled`). Lista só publicados; ofertas com `endsAt` vencido somem.
- `GET/PUT /admin/settings`: só Admin. Lê e grava `{ showPartners }`. Independente da vitrine pública.
- `GET/POST /admin/partners`, `PUT/DELETE /admin/partners/{slug}`: só Admin, independente da flag. Categorias: `loja`, `guia`, `hospedagem`, `outro`. Publicar exige WhatsApp, Instagram, site ou Maps.
- `GET /notifications`, `POST /notifications/{id}/read`, `DELETE /notifications/{id}`: caixa do usuário, itens ativos por 48h. A API cria avisos para: dono na aprovação/rejeição de local; alvo na troca de plano ou liberação de conta; contas ativas em relato novo (o autor recebe confirmação). O sino da web também lista os relatos ativos (`GET /community/reports`) para confirmar ou contestar.
- `GET /notifications/unread`: `{ unread }` para o pontinho do sino, sem baixar a lista.
- `GET /notifications/stream`: SSE autenticado (`Authorization` Bearer). Primeiro evento e pings seguintes usam `{ unread }`. Heartbeat em comentário. O access token é validado na abertura da conexão.
- `GET /notifications/push-public-key`: `{ publicKey }` VAPID. Sem chaves configuradas responde `404`.
- `PUT /notifications/push-subscription` e `DELETE /notifications/push-subscription`: `{ endpoint, p256dh, auth }` no PUT; `{ endpoint }` no DELETE. Um endpoint por aparelho; `410` no envio remove a linha.

`MaxAlerts` permanece no plano como cota reservada; não há entidade nem endpoints de alerta de previsão nesta versão.

## Implantação

A API não configura CORS. Em desenvolvimento, o Vite encaminha `/api` para a API local. Em produção, web e API sobem no mesmo container via Coolify — ver [deployment.md](deployment.md). Endpoints autenticados não devem ser armazenados pelo service worker.
