# TaNoMar — Kit de marca

Slogan: **PESQUE NO MOMENTO CERTO.**
Marca visual: **TáNoMar**, com acento na arte aprovada. Mantenha nomes técnicos, URLs e identificadores existentes como `tanomar`.

## Arquivos e usos

| Pasta / arquivo | Uso |
|---|---|
| logos/tanomar-horizontal-slogan-{2000,1200,600}.png | Landing page, apresentação e cabeçalhos amplos, fundo claro |
| logos/tanomar-horizontal-sem-slogan-{2000,1200,600,300}.png | Navbar e espaços menores |
| logos/tanomar-horizontal-branca-*.png | Logo inteira branca, transparente, para fundo escuro |
| logos/tanomar-horizontal-monocromatica-*.png | Marca inteira azul-mar, transparente |
| logos/tanomar-horizontal-master.png | Maior exportação da logo com slogan, 2038 × 586 px |
| simbolos/tanomar-simbolo-*.png | Símbolo colorido para fundos claros, 64 a 1024 px |
| simbolos/tanomar-simbolo-fundo-escuro-*.png | Símbolo turquesa e laranja para fundos escuros |
| simbolos/tanomar-simbolo-branco-*.png | Símbolo branco transparente |
| pwa/icon-{192,512,1024}.png | Ícone normal de aplicativo, fundo opaco azul-mar |
| pwa/icon-maskable-{192,512,1024}.png | Ícone com margem ampliada para recortes do sistema |
| pwa/apple-touch-icon.png | Ícone 180 × 180 px |
| favicons/favicon.ico | Contêiner ICO com 16, 32 e 48 px |
| favicons/favicon-*.png | Favicons transparentes |
| referencia/tanomar-brand-reference.png | Prancha visual de inspiração e apresentação |
| integracao/manifest-icons.json | Trecho para incorporar ao manifest existente |
| integracao/head.html | Tags de ícones |
| integracao/brand-tokens.css | Paleta e estilos de aplicação |
| integracao/PROMPT-PARA-APLICAR.md | Instrução pronta para o agente que trabalha no repositório |
| INVENTARIO.md | Dimensões de cada imagem |

## Direção visual

Onda, anzol com farpa, bússola aberta e sol. Usar o mesmo símbolo em todos os pontos de contato.

Paleta de aplicação: Oceano #00384A; Mar #08BDC7; Sol #FF783D; Espuma #FAF7EF.
A arte raster possui pequenas variações de tom e antialiasing. Os tokens são os valores de referência para a interface.

Fundos claros: logo original. Fundos escuros: logo branca ou símbolo turquesa/laranja.
Não distorcer, rotacionar, acrescentar efeitos ou inserir o slogan dentro do ícone do aplicativo.
Reservar espaço livre ao redor equivalente a aproximadamente um diâmetro do sol.
Como ponto de partida, usar logo com slogan a partir de 320 px de largura; abaixo disso, escolher sem slogan e conferir a leitura no dispositivo.
Não gravar cantos arredondados nos ícones PWA: os arquivos são quadrados e o sistema aplica sua máscara.

## Qualidade e limites

Este pacote contém PNGs raster com transparência real e ICO. Não contém SVG vetorial, fonte proprietária da marca ou vetor editável. O lettering é parte da imagem, não uma fonte identificada.
As versões de símbolo em 1024 px são ampliações do símbolo extraído da matriz de aproximadamente 607 × 586 px; não criam detalhe vetorial. Para impressão de grande formato será necessária vetorização profissional.
A prancha de referência é uma composição ilustrativa gerada, com pequenas variações entre suas aplicações. Para implementar a marca, use os arquivos de logos, símbolos e PWA, não recortes da prancha.

## Aplicação

Copiar logos e símbolos para `public/brand/`, conteúdo de `pwa/` para `public/brand/pwa/` e favicons para `public/brand/favicons/`.
Incorporar somente os campos de ícones e cores ao manifest atual. Preservar id, start_url, scope e outras configurações existentes. Não substituir o manifest inteiro pelo trecho fornecido.
Manter a landing page e o acesso ao app em `/entrar`. Este kit não altera o projeto automaticamente.
