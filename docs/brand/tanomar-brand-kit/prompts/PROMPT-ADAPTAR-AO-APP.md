# Prompt para integrar a identidade TáNoMar

Copie este prompt para o Codex no repositório do aplicativo:

---

Quero integrar o brand kit **TáNoMar** deste pacote ao projeto atual.

Antes de alterar qualquer arquivo:

1. Leia `AGENTS.md`, `README.md`, documentação de arquitetura e convenções do repositório.
2. Identifique framework, estrutura de assets, tema/design system, manifesto PWA e configuração de ícones.
3. Localize todas as referências antigas a `Primo`, incluindo textos, namespaces visuais, metadados, manifestos e assets. Não renomeie código de domínio ou banco cegamente: relacione o impacto primeiro.
4. Mostre um plano curto com arquivos que serão alterados. Em seguida, implemente e valide.

Objetivos da integração:

- Copiar o conteúdo de `assets/` para a pasta de assets adotada pelo projeto, mantendo nomes previsíveis.
- Incorporar `design-tokens/tanomar.tokens.css` ou converter `tanomar.tokens.json` para o sistema de tema já existente. Deve haver uma única fonte de verdade para cores, tipografia, raios e sombras.
- Configurar Sora para interface e Caveat apenas para destaques emocionais. Usar fallback local e evitar bloqueio de renderização.
- Aplicar `tanomar-logo-horizontal.png` no login, cabeçalhos amplos e áreas institucionais; usar a versão compacta quando a largura for limitada; usar `tanomar-symbol.png` em loading/avatar/marca reduzida.
- Atualizar favicon, Apple touch icon e ícones do manifesto PWA usando os tamanhos fornecidos.
- Configurar no manifesto pelo menos os ícones 192x192 e 512x512; usar `maskable-icon-512x512.png` com `purpose: "maskable"`.
- Atualizar `name`, `short_name`, `theme_color` (`#063B4C`) e `background_color` (`#F3E9D7`) do PWA para TáNoMar.
- Preservar acessibilidade: contraste WCAG AA, foco visível, `alt` significativo e suporte a `prefers-reduced-motion`.
- Não substituir ícones funcionais da interface pelo símbolo da marca. A marca identifica o produto; ícones de navegação devem continuar semanticamente claros.
- Não espalhar hexadecimais nem caminhos de imagens em componentes. Centralizar tokens e referências a assets.
- Não redesenhar a interface inteira sem necessidade. Adaptar a identidade aos componentes e padrões existentes, decompondo componentes grandes somente onde houver ganho claro.

Validação obrigatória:

- Executar lint, testes e build disponíveis.
- Validar o manifesto PWA e conferir instalação em viewport mobile.
- Verificar visualmente login/home, navegação, cabeçalho, tema claro e telas responsivas.
- Procurar referências visuais restantes a `Primo` e listar as que não puderem ser removidas com segurança.
- Entregar resumo dos arquivos alterados, decisões tomadas, testes executados e pendências reais.

Observação: os logos deste kit foram extraídos de uma prancha rasterizada. Não faça autotrace e não invente um SVG. Para uso em impressão ou ampliações extremas, registre como pendência obter/redesenhar o vetor mestre aprovado.

---

