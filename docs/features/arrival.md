# Como chegar

No detalhe do local, **Como chegar** oferece rota pelo mapa do aparelho ou rumo em linha reta na água. Não há endpoint novo, chave de mapa nem recálculo de nota.

## Comportamento

- Só aparece quando o local tem `latitude` e `longitude`.
- Os modos seguem `accessType`:
  - `terrestre`: de carro
  - `trilha`: de carro e a pé
  - `embarcado` / `caiaque`: rumo na água
  - `misto` ou ausente: de carro e de barco
- De carro e a pé abrem Google Maps (ou Apple Mapas no iPhone) com o destino nas coordenadas do local.
- De barco abre `/locais/{id}/rumo`: bússola, distância e mapa em linha reta a partir do GPS do aparelho. **Manter rumo** liga a bússola (permissão no iOS, orientação absoluta no Android, tela ligada). Um segundo toque em **Rumo ativo** desliga e a rosa volta ao norte. Se o sinal absoluto parar, o rumo volta a usar a orientação relativa.
- A gaveta mostra um preview do ponto no OpenStreetMap. A tela de rumo avisa que **não substitui carta náutica**.

## Fora de escopo

Rota marítima, carta náutica, giro a giro no PWA e APIs pagas de directions.
