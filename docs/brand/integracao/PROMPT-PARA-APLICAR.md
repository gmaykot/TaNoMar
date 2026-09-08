Aplique o kit de marca TaNoMar contido nesta pasta ao projeto existente.

Antes de editar, leia AGENTS.md e a documentação do repositório, identifique a stack, componentes de marca, manifest, favicon e service worker. Preserve a landing page, funcionalidades, autenticação, planos, rotas e navegação. O acesso ao app permanece em /entrar.

1. Leia LEIA-ME.md e use os assets fornecidos. Não redesenhe a logo com CSS, texto ou emojis e não recorte a prancha de referência para gerar assets.
2. Copie logos/ e simbolos/ para public/brand/; pwa/ para public/brand/pwa/; favicons/ para public/brand/favicons/, ou equivalente da stack. Atualize caminhos de forma consistente se necessário.
3. Centralize a marca em um componente reutilizável com variantes horizontal com slogan, horizontal sem slogan e símbolo; inclua suporte a fundo claro/escuro. Preserve proporções, alt="TáNoMar" quando a marca comunica identidade e alt vazio em repetições decorativas.
4. Use o slogan PESQUE NO MOMENTO CERTO. na landing e onde houver largura suficiente. Em navbar compacta use sem slogan. No ícone PWA use só o símbolo com fundo azul-mar.
5. Integre os campos de integracao/manifest-icons.json ao manifest atual, sem trocar id, scope, start_url ou configurações funcionais. Se o manifest for gerado por plugin, altere sua fonte. Não configure um segundo manifest concorrente.
6. Atualize favicon e apple-touch-icon conforme head.html. Use arquivos maskable apenas com purpose maskable. Preserve margens e não grave cantos arredondados nos arquivos.
7. Use brand-tokens.css como referência de cores, adaptando aos tokens atuais sem substituir indiscriminadamente as cores semânticas de erro/sucesso. Preserve o padrão de componentes do projeto.
8. Atualize caches de assets pelo mecanismo existente. Não limpe dados do usuário nem force desregistro de service workers sem necessidade.
9. Confira responsividade, contraste em fundos claros/escuros, proporções, ausência de 404 nos assets, validade do manifest, favicon e ícone instalado. Execute o build previsto no projeto.
10. Documente as alterações e os arquivos utilizados. A prancha referencia/tanomar-brand-reference.png é direção visual; logos/ e simbolos/ são os assets de implementação.

Não renomeie identificadores técnicos, banco, namespaces, domínio ou contratos de API por causa do acento em TáNoMar. A grafia visual deve vir da arte fornecida.
