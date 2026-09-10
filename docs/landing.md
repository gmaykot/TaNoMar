# Landing pública

A apresentação pública do TáNoMar vive no mesmo React/PWA do produto.

## Rotas

- `/`: landing pública.
- `/entrar`: login Google existente.
- `/app`: home autenticada que antes ocupava `/`.
- Demais rotas internas permanecem iguais e continuam protegidas pelos mesmos guards.

O bloco de sessão é carregado sob demanda. Abrir a landing não inicia o refresh de autenticação nem carrega as páginas autenticadas; o catálogo público de planos continua disponível pela mesma origem.

## Conteúdo e fonte de verdade

A landing reutiliza logo, tokens, ícones Lucide, `ScoreIndicator`, `MetricTile`, `Badge` e o comportamento PWA existentes. O hero destaca local, melhor horário, nota, vento, ondas e maré; o bloco “Como funciona” mostra o ranking para comparar locais. As demonstrações são ilustrativas e usam somente informações presentes no produto.

Planos são lidos de `GET /api/v1/plans?includeFree=true`. Sem o parâmetro, o endpoint continua devolvendo somente planos pagos habilitados. A landing pede também o Free e usa `Plans` como fonte para nome, tagline, preço mensal, destaque, ordem, cotas e módulos. O preço anual exibido deriva da mesma fórmula do billing (`mensal × 12 × 0,80`); o endpoint público não envia `annualPriceCents`. O admin mantém esses dados em `/admin/planos`; a landing não mantém uma cópia de preços, limites ou benefícios. Todos os CTAs comerciais levam a `/entrar` e não iniciam checkout sem sessão.

A seção de planos mostra o Free como acesso inicial e os cartões dos planos pagos. A tabela de comparação com o Free na primeira coluna fica recolhida até o visitante pedir: o controle “Comparar os planos”, o item “Comparar planos” do menu no celular e o atalho do rodapé abrem essa tabela (`#comparacao-planos`).

A explicação da nota segue a fórmula da API: vento e direção, ondas e período, chuva, horário e perfil costeiro. Maré, temperaturas, espécie e modalidade não entram no cálculo. A seção de dúvidas esclarece acesso Free, cobertura inicial na Grande Florianópolis, locais pessoais, favoritos, alertas ativos, câmeras (stream de terceiros, sem responsabilidade pelas imagens e sem garantia de manutenção ou disponibilidade) e cancelamento (Conta → Gerenciar assinatura → Cancelar renovação, sem estorno).

## Instalação PWA

A seção de instalação usa o mesmo `beforeinstallprompt` do aplicativo. “Instalar agora” só aparece quando o navegador oferece uma instalação válida. Caso contrário, o visitante abre um passo a passo acessível para Android/Chrome, iPhone ou iPad/Safari e computador/Chrome ou Edge. A plataforma detectada apenas define a aba inicial; as outras instruções continuam disponíveis.

O manifesto inicia o aplicativo instalado em `/app`, e notificações sem destino específico também abrem essa rota. Recursos autenticados não passam a ser cacheados pela landing, e não há promessa de funcionamento integral offline.

## SEO e domínio

`index.html` contém title, description, Open Graph, Twitter Card e dados estruturados `WebApplication`. A imagem social reutiliza o ícone oficial de 1024 px. A URL canônica é calculada a partir do host acessado e remove `www`, evitando hardcode de um domínio ainda ausente do repositório.

No Coolify, associe domínio raiz e `www` ao mesmo serviço, escolha o domínio raiz como principal e, se disponível, redirecione `www` para ele. O passo a passo operacional está em [deployment.md](deployment.md#domínio-raiz-www-e-url-canônica).

`public/robots.txt` libera a landing e evita indexação das principais rotas privadas. Um sitemap absoluto depende do domínio final; ele deve ser adicionado quando esse domínio estiver definido em configuração versionada.
