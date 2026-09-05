# PWA

## Manifest

O manifest define nome TáNoMar, idioma pt-BR, modo `standalone`, orientação portrait, cores da marca e ícones `any`/`maskable`.

## Cache

O service worker precacheia apenas o app shell e ativos estáticos produzidos pelo build. O fallback de navegação exclui `/api/`.

Não existe runtime cache de API nesta etapa:

- endpoints autenticados permanecem sempre fora do service worker;
- respostas dinâmicas não entram em cache por padrão;
- somente endpoints públicos aprovados podem receber regra allowlist explícita;
- TTL, expiração e comportamento offline devem ser documentados e testados por endpoint.

## Instalação e atualização

O shell captura `beforeinstallprompt` e mostra Instalar somente quando o navegador permite. Atualizações usam registro `prompt`, permitindo ao usuário recarregar quando uma nova versão estiver pronta. Um aviso de conectividade aparece offline.

O Vite registra o service worker também em `npm run dev` (`devOptions.enabled`), para o Chrome poder disparar o prompt de instalação. Esse SW de desenvolvimento não é o Workbox de produção: cache, precache e fallback ainda devem ser validados com build/preview ou o container.

O prompt só aparece em contexto seguro: `https://localhost` ou outro HTTPS. `http://192.168.x.x` e `http://<ip>.nip.io` no celular não registram o service worker nem disparam instalação.

O `npm run dev -- --host` serve o app em HTTP na porta 5173 e o PWA em HTTPS na 5174. No celular abra `http://<ip-lan>.nip.io:5173/` para navegar. Para instalar, use `https://<ip-lan>.nip.io:5174/` (o terminal imprime essa URL como `PWA (nip.io)`) e aceite o aviso do certificado de desenvolvimento. Cadastre as duas origens no Google Cloud (Origens JavaScript autorizadas), senão o login falha.

iOS nunca usa `beforeinstallprompt`; a instalação é Compartilhar → Adicionar à Tela de Início.
