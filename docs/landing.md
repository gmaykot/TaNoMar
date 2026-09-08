# Landing pública

A apresentação pública do TáNoMar vive no mesmo React/PWA do produto.

## Rotas

- `/`: landing pública.
- `/entrar`: login Google existente.
- `/app`: home autenticada que antes ocupava `/`.
- Demais rotas internas permanecem iguais e continuam protegidas pelos mesmos guards.

O bloco de sessão é carregado sob demanda. Abrir a landing não inicia o refresh de autenticação nem carrega as páginas autenticadas; o catálogo público de planos continua disponível pela mesma origem.

## Conteúdo e fonte de verdade

A landing reutiliza logo, tokens, ícones Lucide, `ScoreIndicator`, `MetricTile`, `Sparkline`, `Badge` e o comportamento PWA existentes. Há duas demonstrações ilustrativas: o hero mostra o detalhe de um local com mar e maré; o bloco seguinte mostra o ranking para comparar locais. As duas usam somente nota, janela, maré e métricas já presentes no produto.

Planos são lidos de `GET /api/v1/plans`. O endpoint devolve somente planos pagos habilitados e usa `Plans` como fonte para nome, tagline, preço mensal, destaque, ordem, cotas e módulos. O admin mantém esses dados em `/admin/planos`; a landing não mantém uma cópia de preços ou benefícios. Todos os CTAs comerciais levam a `/entrar` e não iniciam checkout sem sessão.

## Instalação PWA

A seção de instalação usa o mesmo `beforeinstallprompt` do aplicativo. “Instalar agora” só aparece quando o navegador oferece uma instalação válida. Caso contrário, o visitante abre um passo a passo acessível para Android/Chrome, iPhone ou iPad/Safari e computador/Chrome ou Edge. A plataforma detectada apenas define a aba inicial; as outras instruções continuam disponíveis.

O manifesto inicia o aplicativo instalado em `/app`, e notificações sem destino específico também abrem essa rota. Recursos autenticados não passam a ser cacheados pela landing, e não há promessa de funcionamento integral offline.

## SEO e domínio

`index.html` contém title, description, Open Graph, Twitter Card e dados estruturados `WebApplication`. A imagem social reutiliza o ícone oficial de 1024 px. A URL canônica é calculada a partir do host acessado e remove `www`, evitando hardcode de um domínio ainda ausente do repositório.

No Coolify, associe domínio raiz e `www` ao mesmo serviço, escolha o domínio raiz como principal e, se disponível, redirecione `www` para ele. O passo a passo operacional está em [deployment.md](deployment.md#domínio-raiz-www-e-url-canônica).

`public/robots.txt` libera a landing e evita indexação das principais rotas privadas. Um sitemap absoluto depende do domínio final; ele deve ser adicionado quando esse domínio estiver definido em configuração versionada.
