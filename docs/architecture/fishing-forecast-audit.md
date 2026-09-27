# Auditoria — Previsão e Nota TaNoMar

> Este documento registra o estado do sistema no momento da auditoria.
> É um documento descritivo e histórico, não uma especificação definitiva da arquitetura.
> Antes de utilizá-lo para implementar alterações futuras, valide se o código ainda corresponde ao estado documentado.

Data da auditoria: 2026-09-27  
Branch analisada: `main`  
Commit analisado: `9553ce18350750db2ecfce357f5130ac53c8181a`

## 1. Resumo executivo

O pipeline ativo consulta três fontes Open-Meteo: Weather, GFS e Marine, sempre em paralelo e normalmente para oito dias.

A nota horária usa vento, direção do vento, rajada, altura/período de onda, chuva, horário e o `profile` do local. Swell, temperatura da água, pressão e maré são coletados ou exibidos, mas não entram na nota.

`sea_level_height_msl` já é solicitado, persistido e usado como fallback visual de maré. Corrente oceânica, ondas de vento e swell secundário não existem atualmente nos contratos internos.

Maré principal vem da Tábua de Maré API; sua falha leva ao fallback Open-Meteo no endpoint marítimo. A fase atual distingue somente `Enchente`, `Vazante` ou `n/d`; não há “próximo do pico/mínimo”.

Todos os locais passam pelo mesmo algoritmo, mas `profile`, orientação, coordenadas e vento ideal pessoal alteram resultados. O ranking diário é a média das três melhores horas entre 05:00 e 20:00.

Snapshots completos são gravados no PostgreSQL, porém há somente uma versão por local/data e ela é apagada após a janela de cache. Portanto, hoje não é possível reconstruir com segurança a nota mostrada há 30 dias.

O risco técnico mais relevante é dado ausente virar zero e, em diversos componentes, produzir uma nota artificialmente favorável.

## 2. Pipeline atual

Fluxo confirmado pelo código:

```text
FishingSpot no PostgreSQL
  │ coordenadas + profile + orientação
  ▼
FishingForecastService
  ├─ FishingForecastCache
  │    memória → FishingForecastSnapshots/PostgreSQL
  │
  └─ em miss/stale: FishingForecastRefreshQueue
       ▼
     FishingForecastRefreshWorker
       ▼
     OpenMeteoClient
       ├─ Weather API
       ├─ GFS API
       └─ Marine API
            │ consultas paralelas e em lote
            ▼
     FishingForecastService.BuildForecast
       ├─ alinhamento por timestamp exato
       ├─ normalização e arredondamento
       ├─ FishingScoreCalculator.Calculate por hora
       ├─ 3 melhores horas de 05h–20h
       └─ média das 3 → nota diária
            ▼
     FishingForecastCache.PutBatchAsync
       ├─ IMemoryCache
       └─ FishingForecastSnapshots.PayloadJson
            │
            ├─ FishingTideEnrichmentQueue
            │    └─ TabuaMareClient → acrescenta maré ao snapshot
            │
            ▼
     Minimal APIs em Program.cs
       ├─ /forecasts/ranking
       ├─ /fishing-spots/{id}/forecast
       ├─ /fishing-spots/{id}/marine
       └─ /public/offline-forecast
            ▼
     forecastService → wireGuards → forecastMapper
            ▼
     HomePage / RankingPage / LocationDetailsPage / PWA
```

Símbolos centrais:

- Integração: `OpenMeteoClient`, em `apps/api/TaNoMar.Api/Fishing/OpenMeteoClient.cs`.
- Orquestração e transformação: `FishingForecastService`, especialmente `RefreshBatchAsync` e `BuildForecast`, em `apps/api/TaNoMar.Api/Fishing/FishingForecastService.cs`.
- Nota: `FishingScoreCalculator.Calculate`, em `apps/api/TaNoMar.Api/Fishing/FishingScoreCalculator.cs`.
- Cache: `FishingForecastCache`, em `apps/api/TaNoMar.Api/Fishing/FishingForecastCache.cs`.
- Endpoints e DTOs: `apps/api/TaNoMar.Api/Program.cs`.
- Fronteira web: `forecastService.ts`, `wireGuards.ts` e `forecastMapper.ts`.

## 3. Open-Meteo

### 3.1 Endpoints e parâmetros

Configuração em `FishingOptions`, no arquivo `apps/api/TaNoMar.Api/Fishing/FishingModels.cs`:

| Fonte | URL padrão | Variáveis |
| --- | --- | --- |
| Weather | `https://api.open-meteo.com/v1/forecast` | `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`, `precipitation`, `precipitation_probability`, `temperature_2m`, `pressure_msl` |
| GFS | `https://api.open-meteo.com/v1/gfs` | `precipitation_probability`, `precipitation` |
| Marine | `https://marine-api.open-meteo.com/v1/marine` | `wave_height`, `wave_direction`, `wave_period`, `swell_wave_height`, `swell_wave_direction`, `swell_wave_period`, `sea_surface_temperature`, `sea_level_height_msl` |

Parâmetros comuns montados por `OpenMeteoClient.GetResponseAsync`:

- `latitude`: decimal com `InvariantCulture`; em lote, valores separados por vírgula.
- `longitude`: mesmo tratamento.
- `timezone`: atualmente `America/Sao_Paulo`.
- `forecast_days`: `8` no refresh normal. Na auditoria sob demanda usa `min(8, max(2, day + 1))`.
- `hourly`: lista correspondente à fonte.
- `apikey`: somente quando `Fishing:OpenMeteoApiKey` não está vazio.
- Weather inclui `wind_speed_unit=kmh` e `precipitation_unit=mm`.
- GFS inclui `precipitation_unit=mm`.
- Não são enviados `past_days`, `start_date`, `end_date`, `current`, `daily` ou seleção explícita de modelo no Weather/Marine.

A produção mapeia `OPEN_METEO_API_KEY` para `Fishing__OpenMeteoApiKey` em `docker-compose.yml`.

### 3.2 Cache, erro, retry e fallback

- Timeout HTTP de 20 segundos e User-Agent `tanomar/2.0`, configurados em `Program.cs`.
- Não há política explícita de retry/backoff no `HttpClient`.
- HTTP não bem-sucedido, JSON inválido ou resposta vazia geram exceção; o cliente registra warning e propaga.
- `Task.WhenAll` une Weather, GFS e Marine. Falha de uma fonte impede a atualização inteira do lote.
- O fallback é o snapshot anterior, não outra fonte equivalente.
- GFS é combinado com Weather por estratégia conservadora: `max()` tanto da precipitação quanto da probabilidade.
- Timestamps de GFS e Marine são associados por igualdade textual exata com o timestamp Weather.
- A timeline Weather é a timeline-mestra: sem horas Weather, não há linhas normalizadas.
- Campos ausentes, `null`, índices não encontrados e listas curtas viram `0.0` em `FishingForecastService.ValueAt`; somente nível do mar mantém `null` por `ValueAtOrNull`.
- Direções numéricas são convertidas para oito pontos cardeais.
- Valores persistidos são arredondados: vento/temperatura/período com uma casa, onda/swell/nível com duas, pressão com zero; a nota com uma casa.

### 3.3 Variáveis Open-Meteo e utilização

| Variável Open-Meteo | Campo interno | Onde é usada | Entra na nota? | Exibida ao usuário? |
| --- | --- | --- | --- | --- |
| `wind_speed_10m` | `WindSpeed` → `WindSpeedKmh` | Velocidade e ênfase do ranking | Sim, 25% | Sim |
| `wind_direction_10m` | `WindDirection` → texto + `WindDirectionDegrees` | Direção relativa ao local, origem do vento e vento ideal | Sim, 25% | Sim |
| `wind_gusts_10m` | `WindGusts` → `WindGustKmh` | Penalidades de rajada | Sim | Sim |
| `precipitation` Weather | `Precipitation` | Máximo com GFS | Sim, penalidade | Sim |
| `precipitation_probability` Weather | `PrecipitationProbability` | Máximo com GFS | Sim, 10% | Sim |
| `precipitation` GFS | `Precipitation` | Máximo com Weather | Sim, penalidade | Indiretamente, valor combinado |
| `precipitation_probability` GFS | `PrecipitationProbability` | Máximo com Weather | Sim, 10% | Indiretamente, valor combinado |
| `temperature_2m` | `Temperature` → `AirTemperatureC` | Snapshot e apresentação | Não | Sim |
| `pressure_msl` | `PressureMsl` → `PressureHpa` | Série e tendência de pressão | Não | Sim, plano habilitado |
| `wave_height` | `WaveHeight` → `WaveMeters` | Perfil de onda e penalidade forte | Sim, 20% + penalidade | Sim |
| `wave_direction` | `WaveDirection` → texto | Métrica de onda | Não | Sim |
| `wave_period` | `WavePeriod` → `WavePeriodSeconds` | Componente de período | Sim, 10% | Sim |
| `swell_wave_height` | `SwellHeight` → `SwellMeters` | Snapshot e série | Não | Sim |
| `swell_wave_direction` | `SwellDirection` → texto | Snapshot e detalhe do swell | Não | Sim |
| `swell_wave_period` | `SwellPeriod` → `SwellPeriodSeconds` | Detalhe da série de swell | Não | Sim |
| `sea_surface_temperature` | `WaterTemperature` → `WaterTemperatureC` | Snapshot e série | Não | Sim |
| `sea_level_height_msl` | `SeaLevelHeightMsl` | Fallback de maré/nível do mar | Não | Sim, se a tábua estiver ausente |

### 3.4 Classificação específica dos dados marítimos

| Variável | Situação no código |
| --- | --- |
| `wave_height` | Solicitada e utilizada; nota, snapshot e UI |
| `wave_direction` | Solicitada e utilizada; snapshot e UI, fora da nota |
| `wave_period` | Solicitada e utilizada; nota, snapshot e UI |
| `wind_wave_height` | Inexistente atualmente |
| `wind_wave_direction` | Inexistente atualmente |
| `wind_wave_period` | Inexistente atualmente |
| `swell_wave_height` | Solicitada e utilizada; snapshot e UI, fora da nota |
| `swell_wave_direction` | Solicitada e utilizada; snapshot e UI |
| `swell_wave_period` | Solicitada e utilizada; snapshot e UI |
| `secondary_swell_wave_height` | Inexistente atualmente |
| `secondary_swell_wave_direction` | Inexistente atualmente |
| `secondary_swell_wave_period` | Inexistente atualmente |
| `sea_surface_temperature` | Solicitada e utilizada; snapshot e UI |
| `ocean_current_velocity` | Inexistente atualmente |
| `ocean_current_direction` | Inexistente atualmente |
| `sea_level_height_msl` | Solicitada e utilizada como fallback visual de maré |

Não foi encontrada variável dessa lista modelada mas não solicitada, nem solicitada mas completamente descartada.

## 4. Nota atual

Implementação confirmada: `FishingScoreCalculator.Calculate`, em `apps/api/TaNoMar.Api/Fishing/FishingScoreCalculator.cs`.

Entradas: velocidade e rajada em km/h, direção de origem do vento em graus, orientação do mar do local, altura e período de onda, probabilidade e volume de chuva, hora e `profile`.

### 4.1 Fórmula

```text
score =
    WindSpeedScore(velocidade)       × 0,25
  + WindDirectionScore(direção)      × 0,25
  + WaveScore(altura, profile)       × 0,20
  + PeriodScore(período)             × 0,10
  + RainProbabilityScore(chuva %)    × 0,10
  + HourScore(hora)                  × 0,10

score -= GustPenalty(rajada)
score -= RainAmountPenalty(chuva_mm)

se velocidade >= 30 e rajada >= 40:
    score -= 1,0

se onda >= 2,2 m:
    score -= 1,5

score = clamp(score, 0, 10)
score = round(score, 1, ToEven)
```

### 4.2 Pseudocódigo completo dos thresholds

```text
vento_velocidade:
  <= 8   → 10,0
  <= 12  →  9,0
  <= 16  →  8,0
  <= 20  →  6,5
  <= 24  →  5,0
  <= 30  →  3,0
  <= 35  →  1,5
  > 35   →  0,5

rajada_penalidade:
  >= 50 → -4,0
  >= 45 → -3,0
  >= 40 → -2,3
  >= 35 → -1,6
  >= 30 → -1,0
  >= 25 → -0,5
  < 25  →  0

direção_do_vento:
  sem seaOrientationDegrees → 6,5

  offshore = orientação_do_mar + 180°
  diferença offshore <= 25° → 10,0
  diferença offshore <= 50° →  9,0
  diferença offshore <= 80° →  7,5

  diferença onshore <= 25° → 2,0
  diferença onshore <= 50° → 3,5
  diferença onshore <= 80° → 5,0

  demais direções → 6,5

ondas para praia_protegida:
  0,3–0,9 m → 9,5
  < 0,3 m   → 7,5
  <= 1,2 m  → 8,0
  <= 1,5 m  → 6,0
  <= 1,8 m  → 3,5
  > 1,8 m   → 1,0

ondas para praia_aberta:
  0,4–1,2 m → 9,5
  < 0,4 m   → 7,0
  <= 1,5 m  → 8,0
  <= 1,8 m  → 6,0
  <= 2,1 m  → 4,0
  <= 2,5 m  → 2,0
  > 2,5 m   → 0,5

ondas para qualquer outro profile:
  0,4–1,1 m → 9,0
  < 0,4 m   → 7,0
  <= 1,5 m  → 7,5
  <= 1,9 m  → 5,0
  <= 2,3 m  → 2,5
  > 2,3 m   → 0,5

período:
  <= 0 s       → 5,0
  4–<5 s       → 6,0
  5–<6 s       → 7,5
  6–10 s       → 9,0
  >10–12 s     → 7,5
  >12–14 s     → 5,5
  >14 s        → 3,5
  demais       → 5,0

probabilidade_de_chuva:
  <= 10% → 10,0
  <= 20% →  9,0
  <= 35% →  7,5
  <= 50% →  5,5
  <= 65% →  3,5
  <= 80% →  2,0
  > 80%  →  0,5

volume_de_chuva:
  >= 8 mm   → -3,0
  >= 4 mm   → -2,0
  >= 2 mm   → -1,2
  >= 0,5 mm → -0,5
  < 0,5 mm  →  0

horário:
  05h–08h → 10,0
  09h–11h →  8,0
  12h–15h →  6,5
  16h–19h →  9,5
  demais  →  5,5
```

### 4.3 Classificação textual

Em `ForecastHourWindowDto.Classification`, no arquivo `apps/api/TaNoMar.Api/Fishing/ForecastHourWindowDto.cs`:

- `>= 8,5`: Excelente.
- `>= 7,0`: Muito bom.
- `>= 5,0`: Regular.
- `< 5,0`: Difícil.

### 4.4 Dados ausentes

Não existe estado “indisponível” dentro do cálculo. Quase todo valor ausente vira zero:

- vento ausente → `0 km/h` → nota de velocidade `10`;
- chuva ausente → `0` → melhor faixa;
- rajada ausente → sem penalidade;
- onda ausente → `0 m` → ainda recebe `7` ou `7,5`;
- direção ausente → `0°`, interpretada como Norte;
- período ausente → `0` → recebe `5`.

## 5. Diferenças por local

O cadastro persistido é a entidade `FishingSpot`, em `apps/api/TaNoMar.Api/Data/TaNoMarDbContext.cs`. O catálogo inicial é `OfficialSpotCatalog.All`, em `apps/api/TaNoMar.Api/Data/OfficialSpotCatalog.cs`.

Campos que afetam efetivamente a previsão:

- `Latitude` e `Longitude`: definem a consulta externa.
- `SeaOrientationDegrees`: muda os 25% de direção do vento e o rótulo `terra/mar/cruzado`.
- `Profile`: muda os thresholds de altura de onda.
- `EnabledSpot.IdealWindDirectionDegrees`: opção pessoal que recalcula a parcela direcional e o ranking sem alterar o snapshot compartilhado; implementação em `FishingWindPreference.Apply`.

Campos persistidos que não afetam a nota: `Type`, `FishingEnvironment`, `AccessType`, região, descrição, restrições, favorito e visibilidade.

| Local | Profile | Orientação | Ambiente |
| --- | --- | ---: | --- |
| Campeche | `praia_aberta` | 110° | `mar_aberto` |
| Ribeirão da Ilha | `praia_protegida` | 270° | `baia` |
| Lagoa da Conceição | `praia_protegida` | 90° | `lagunar` |
| Ponte da Lagoa/Rendeiras | `praia_protegida` | `null` | `lagunar` |

Lagoa do Peri não aparece em `OfficialSpotCatalog`, migrations pesquisadas ou demais fontes versionadas. Ela pode existir como dado criado no banco em runtime, mas isso não foi possível determinar pelo código.

Campeche, Ribeirão, Lagoa da Conceição e qualquer Lagoa do Peri cadastrada são processados pelo mesmo `FishingScoreCalculator`. Campeche, Ribeirão e Lagoa da Conceição diferem por coordenadas, `profile` e orientação. O fato de Lagoa da Conceição ser `lagunar` não muda a fórmula; ela ainda recebe dados Marine e usa o ramo `praia_protegida`.

Não há pesos específicos por local, thresholds individuais, perfil biológico, espécie/modalidade preferida, configuração de maré/corrente por local ou versão de fórmula por local.

## 6. Maré e corrente

### 6.1 Maré existente e ativa

Existe integração ativa com a Tábua de Maré API em `TabuaMareClient`, no arquivo `apps/api/TaNoMar.Api/Fishing/TabuaMareClient.cs`:

1. `nearest-harbor-independent-state/[latitude,longitude]`;
2. `tabua-mare/{harborId}/{month}/[1-31]`;
3. autenticação opcional `Authorization: Bearer`;
4. porto e mês em cache de memória por pelo menos 24 horas;
5. falhas em cache por 5 minutos;
6. chamadas serializadas por um `SemaphoreSlim` estático;
7. sem retry explícito.

`FishingTideEnrichmentWorker` acrescenta `TidePoints`, `TideExtremes` e `TideAttribution` ao mesmo snapshot, preservando sua vida original.

### 6.2 Fallback Open-Meteo

Quando não há tábua no snapshot, `TideFromForecast`, em `Program.cs`:

- usa as horas com `SeaLevelHeightMsl`;
- exige ao menos três pontos;
- detecta máximos e mínimos locais por `TideCurve.Extremes`;
- atribui “Nível do mar modelado (Open-Meteo). Não é tábua oficial.”;
- devolve `unavailable` se não houver curva suficiente.

### 6.3 Tendência atual

O backend produz apenas `Enchente`, `Vazante` ou `n/d`. Para o horário selecionado, o frontend recalcula a fase comparando o ponto anterior com o próximo em `apps/web/src/features/forecast/utils/tideAtHour.ts`.

Não existe tipo ou enum `TideTrend`, nem estados equivalentes a próximo da preamar/pico ou próximo da baixa-mar/mínimo. O próximo extremo é mostrado separadamente como texto.

### 6.4 Situação confirmada

- Mostramos maré: sim, no detalhe do local.
- Calculamos maré astronômica: não; consumimos uma tábua externa ou inferimos extremos de nível modelado.
- Calculamos fase: sim, por comparação entre amostras.
- Usamos maré na nota: não.
- API externa de maré: sim, `tabuamare.api.br`.
- Código Stormglass: não encontrado.
- Corrente oceânica: não encontrada.
- Campos próprios de maré no banco: não há colunas dedicadas; ficam dentro do JSON do snapshot.
- Campos frontend: `WireTideValue`, `MarineTide` e componentes/utilitários ativos.
- Código legado/morto de maré: não foi identificada integração antiga ou provider morto. `sea_level_height_msl` é fallback ativo, não legado.

## 7. Ranking

Produção confirmada:

1. `FishingForecastService.GetAsync(day)` seleciona locais visíveis, habilitados e com coordenadas.
2. Cada hora Weather do dia gera um `FishingHourForecast`.
3. Para melhores horários, consideram-se somente horas entre 05:00 e 20:00, inclusive.
4. Ordenação horária: nota decrescente e depois hora crescente.
5. São escolhidas três horas.
6. Nota do local: média das três notas, arredondada para uma casa.
7. Ranking padrão: nota diária decrescente.
8. Com vento ideal pessoal, horas e nota são recalculadas e o ranking é reordenado.
9. A primeira posição vira a escolha principal da Home.
10. A página Ranking mostra a lista recebida; filtros frontend recortam, mas não recalculam a nota.

Detalhes:

- A nota continua sendo a média de três horas mesmo se o plano exibir somente uma ou duas recomendações.
- `bestHoursMode=custom` expõe também todas as horas no detalhe, mas não muda a média.
- Planos configuram de 1 a 8 dias por `Plan.MaxForecastDays`.
- O refresh técnico sempre busca oito dias.
- Horas fora de 05h–20h entram em `Hours` e podem ser selecionáveis, mas não participam da nota diária.
- Se não houver hora válida, a nota diária é `0`.
- Se faltar snapshot para um local, ele é omitido e seu slug entra em `unavailableSpotIds`.
- Em empate padrão, não há segundo critério explícito depois de `OrderByDescending(Score)`; a ordem pode depender da ordem anterior da consulta.
- Ênfases `wind`, `rain` e `waves` reordenam pela métrica da melhor hora e usam nota/nome como desempate em `FishingRankingEmphasis`.
- O frontend consulta novamente a API ao trocar a ênfase; não recalcula score.

## 8. Cache e histórico

| Camada | Conteúdo | Chave/identidade | Vida |
| --- | --- | --- | --- |
| `IMemoryCache` | `CachedForecast` | `"{locationId}_{yyyy-MM-dd}"` | Até a disponibilidade máxima |
| PostgreSQL | `FishingForecastSnapshot` com `PayloadJson` | índice único `(LocationId, Date)` | Até poda |
| React Query | Respostas mapeadas | `['forecast']`, `['forecast', emphasis]`, `['location-forecast', id]`, `['marine-details', id, date]` | `staleTime` de 5 minutos |
| PWA/localStorage | Uma previsão salva manualmente | `tanomar.offline-forecast.v3` | Sem TTL automático; próxima gravação substitui. `v1`/`v2` são ignoradas, sem migração. |

Configuração ativa de `apps/api/TaNoMar.Api/appsettings.json`:

- `CacheHours = 6`;
- `MaxStaleHours = 12`;
- refresh desejado após `WarmupIntervalHours = 3`.

A implementação calcula `_maxStale = max(CacheHours, MaxStaleHours)`. Com a configuração atual, o snapshot é normalmente utilizável por 6 horas e pode continuar disponível até 12 horas desde `CreatedAt`; não são 6 + 12 horas. A poda remove snapshots com `CreatedAt` anterior a essa janela.

O JSON contém nota diária, todas as horas normalizadas, melhores horas, maré e atribuição. O índice é único por local/data. Um refresh sobrescreve a versão anterior. Não há histórico de revisões, payload bruto, versão da fórmula, identificação de modelo ou instante “mostrado ao usuário”. Alteração de coordenadas, orientação ou perfil invalida e apaga os snapshots do local.

A cópia offline é opcional, local a um aparelho e guarda uma única previsão substituível em `apps/web/src/features/forecast/utils/offlineForecast.ts`.

Daqui a 30 dias, não há dados persistidos suficientes para responder de forma confiável “qual nota o TaNoMar mostrou para Campeche às 08:00 do dia X?”. O snapshot do servidor terá sido sobrescrito ou podado. Uma cópia offline manual poderia, por acaso, ainda conter o valor em um aparelho, mas não é histórico consultável nem garantia de auditoria.

## 9. Contratos backend/frontend

| Uso | Endpoint | Consumidor web |
| --- | --- | --- |
| Home | `GET /forecasts/ranking` | `HomePage` → `useForecast` |
| Ranking | `GET /forecasts/ranking?emphasis=` | `RankingPage` → `useForecast` |
| Detalhe | `GET /fishing-spots/{id}/forecast` | `LocationDetailsPage` → `useLocationForecast` |
| Série marinha/maré | `GET /fishing-spots/{id}/marine?date=` | `LocationDetailsPage` → `useMarineDetails` |
| Locais e características | `GET /fishing-spots` | `getLocations` e enriquecimento do forecast |
| Cópia pública diária | `GET /public/offline-forecast` | Não foi encontrado consumo direto na web atual |

DTO principal por local:

- `spotId`, `spotName`, propriedade e visibilidade;
- `score`, `classification`;
- `bestHours`, `bestHourWindows`, opcionalmente `selectableHourWindows`;
- `metricsHour`;
- vento, rajada, onda, direção/período, swell, chuva, temperaturas e pressão;
- `windOrigin` e `highlights`.

DTO marítimo:

- séries horárias de onda, período, swell, água, pressão, vento e chuva;
- maré com nível atual, fase, próximo extremo, atribuição, extremos e pontos.

Alterações futuras com risco contratual já identificado:

- Trocar significado ou escala de `score` sem versionar afeta Home, Ranking, alertas e diário/planejamento.
- Alterar labels de classificação quebra `classificationByLabel` no mapper.
- Acrescentar métricas exige wire type, guard, mapper, chave de visibilidade e componentes.
- Tornar campos existentes `null` quebra guards que hoje exigem strings ou números.
- Alterar `phase` para um enum de quatro estados exige ajustar domínio e apresentação.
- Score v2 precisa distinguir versão no snapshot e no contrato se coexistir com a nota atual.
- Novos campos opcionais são, em geral, compatíveis com clientes atuais porque os guards ignoram propriedades desconhecidas.
- O frontend não recalcula a nota; isso deve ser preservado.

## 10. Testes existentes

### 10.1 API

Cobertura funcional encontrada:

- `OpenMeteoClientTests`: somente lote Weather, coordenadas e uma requisição.
- `FishingForecastCacheTests`: TTL, stale, fallback, batch, invalidação, semanas e mudança de inputs.
- `FishingForecastWarmupQueueTests`: decisão de enfileirar e separação da fila de maré.
- `FishingForecastRefreshQueueTests`: deduplicação e estado de falha.
- `FishingForecastAuditTests`: invariantes, timelines, comparação das três fontes e melhores horas inconsistentes.
- `FishingWindPreferenceTests`: direção escolhida e preservação da origem geográfica.
- `ForecastHourWindowDtoTests`: formatação e bloqueios de plano.
- `OfficialSpotCatalogTests`: seed, coordenadas, Ribeirão, classificação e um smoke test do calculador.
- `SpotRulesTests`: visibilidade, região e plano.

Pontos críticos sem teste direto identificado:

- todos os thresholds e limites da fórmula;
- penalidades combinadas e clamp;
- classificação exatamente nos limites;
- cálculo real das três melhores horas e sua média;
- ranking padrão, empates e todas as ênfases no backend;
- requisição Marine e lista completa de variáveis;
- alinhamento entre timelines;
- semântica de valores ausentes virarem zero;
- falha isolada de Weather/GFS/Marine;
- `TabuaMareClient`, `TideCurve` e fallback `sea_level_height_msl`;
- endpoints completos de ranking, forecast e marine;
- cache histórico/versionamento, que ainda não existe.

### 10.2 Frontend

Há cobertura relevante para service e query de ênfase, validação/mapeamento do forecast e maré, Home, Ranking e detalhe, troca de data e hora, filtros, paginação e cota, apresentação de métricas e bloqueios, maré na hora selecionada, séries marítimas, previsão offline e estados de refresh.

Não há medição de percentual de cobertura identificada; portanto, não foi possível informar um percentual real.

## 11. Gaps encontrados

| Gap | Situação atual | Complexidade | Arquivos provavelmente envolvidos |
| --- | --- | --- | --- |
| `ocean_current_velocity` | Não solicitado, modelado, persistido nem exibido | Média | `OpenMeteoClient.cs`, `FishingModels.cs`, `FishingForecastService.cs`, DTO/mapper/UI |
| `ocean_current_direction` | Inexistente | Média | Mesmos arquivos de corrente |
| `sea_level_height_msl` | Já suportado como fallback visual e persistido nullable | Já suportado | `OpenMeteoClient.cs`, `FishingForecastService.cs`, `Program.cs`, maré web |
| `TideTrend` com quatro estados | Só Enchente/Vazante/n/d; sem proximidade | Média | `TideCurve.cs`, `Program.cs`, tipos/mapper/utilitário web |
| Perfil específico por local | Coordenadas, orientação e três profiles já existem; ambiente/tipo não entram na fórmula | Média para ampliar perfil; estrutural para pesos arbitrários por local | `FishingSpot`, admin, `FishingLocation`, calculador e cache |
| Nota v2 | Só uma fórmula sem identificador de versão | Estrutural | calculador, modelos, snapshots, alertas, DTOs e documentação |
| Snapshots históricos | Uma linha mutável por local/data, podada em horas | Estrutural | entidade/DbContext, cache, worker, endpoints administrativos |
| Ondas de vento | Inexistentes | Média | integração, modelos, transformação, contrato e UI |
| Swell secundário | Inexistente | Média | integração, modelos, transformação, contrato e UI |
| Ausência de dados explícita | Quase tudo vira zero | Média | modelos nullable, `BuildForecast`, calculador, DTOs e testes |
| Versionar origem/modelo/unidades | Snapshot guarda só resultado normalizado | Média | modelo do snapshot e pipeline de ingestão |
| Perfil de águas interiores | `FishingEnvironment` existe, mas Marine e fórmula costeira ainda são usados | Média/estrutural conforme regra escolhida | catálogo/admin, serviço, calculador |
| Histórico da nota mostrada ao usuário | Não existe registro do instante/versão efetivamente exibido | Estrutural | persistência histórica e endpoint de consulta |

## 12. Riscos

- Dados ausentes viram condições favoráveis em vários componentes da fórmula.
- Uma falha de apenas uma das três chamadas Open-Meteo impede atualizar todo o lote.
- Locais lagunares, fluviais e estuarinos usam onda Marine e thresholds costeiros.
- Snapshots sobrescritos impedem auditoria, comparação com pescarias reais e reprodução da nota.
- A fórmula não tem identificador de versão; mudar seus thresholds tornaria snapshots antigos semanticamente ambíguos.
- O snapshot guarda valores já arredondados, não o payload bruto nem metadados do modelo.
- Ranking padrão não possui desempate determinístico por nome.
- `availableFrom` e `availableTo` do ranking usam UTC, enquanto as datas da previsão usam `America/Sao_Paulo`; perto da virada do dia podem divergir.
- A fase da maré não interpola o nível entre amostras; para o horário selecionado, o frontend só mostra nível quando há ponto exato.
- Falha da Tábua de Maré não é registrada como disponibilidade persistente; o acesso pode voltar a enfileirar enriquecimento.
- Os thresholds centrais da nota não têm uma suíte unitária dedicada.

## 13. Próximo passo recomendado

Implementar uma pequena fatia de observabilidade de corrente oceânica, sem mudar a nota nem o contrato público principal:

1. solicitar `ocean_current_velocity` e `ocean_current_direction` somente na integração Marine;
2. modelar ambos como nullable, sem convertê-los para zero;
3. incluí-los no relatório administrativo `GET /admin/fishing-audit`;
4. acrescentar testes de query, desserialização, ausência e alinhamento temporal;
5. não usar na nota, ranking ou frontend público nesta primeira etapa.

Essa fatia confirmaria, com dados reais por local e horário, disponibilidade, cobertura e comportamento de ausência antes de decidir pesos, thresholds ou uma Nota v2. Ela também estabelece o padrão nullable necessário para evitar repetir o risco atual de transformar ausência em zero.

## Evoluções posteriores à auditoria

### Suporte observacional a corrente oceânica

Data: 2026-09-27  
Branch: `main`  
Commit da implementação: não realizado (alterações aguardando revisão)

Após a auditoria original, o pipeline passou a solicitar e transportar, de forma observacional, as variáveis `ocean_current_velocity` e `ocean_current_direction` da Marine API do Open-Meteo.

- A velocidade é preservada como `OceanCurrentVelocityKmh`, usando a unidade padrão documentada pela API Marine (km/h), sem conversão arbitrária.
- A direção é preservada como `OceanCurrentDirectionDegrees`; a representação cardinal é derivada somente no relatório administrativo.
- Ambos os valores são opcionais desde a desserialização até o relatório.
- Ausência, `null`, lista curta ou timestamp sem amostra correspondente permanecem `null`.
- Os campos entram no modelo normalizado e, por consequência, no `PayloadJson` dos snapshots existentes.
- Os campos aparecem somente em `GET /admin/fishing-audit`.
- A corrente permanece fora da nota, classificação, ranking, melhores horários, destaques, recomendação, Home, UI pública e demais contratos públicos.
- `FishingScoreCalculator` não recebe argumentos de corrente e não foi alterado.
