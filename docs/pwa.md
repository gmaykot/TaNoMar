# PWA

## Manifest

O manifest define nome TáNoMar, idioma pt-BR, modo `standalone`, orientação `any` (para a câmera expandida preencher a tela em paisagem), cores da marca e ícones `any`/`maskable` (192, 512 e 1024). Os PNGs vêm do kit em `docs/brand/pwa` e são servidos em `apps/web/public/brand/pwa`.

O splash nativo do Android usa o ícone do manifesto sobre `background_color` (`#FAF7EF`). No iOS, `index.html` declara `apple-touch-startup-image` por tamanho de tela; sem isso o sistema amplia o `apple-touch-icon` de 180px e a marca fica pixelada. As imagens em `apps/web/public/splash` são geradas a partir do ícone PWA (`py -3 apps/web/scripts/generate-splash.py`) e não entram no precache do service worker.

## Cache

O service worker precacheia apenas o app shell e ativos estáticos produzidos pelo build. O fallback de navegação exclui `/api/`.

O service worker (`apps/web/src/sw.ts`, `injectManifest`) também trata `push` e `notificationclick`. Se houver uma janela visível, o toast do sistema não aparece — o sino já recebeu o SSE. Sem janela visível, mostra o aviso e o clique abre `/`.

Não existe runtime cache de API nesta etapa:

- endpoints autenticados permanecem sempre fora do service worker;
- respostas dinâmicas não entram em cache por padrão;
- somente endpoints públicos aprovados podem receber regra allowlist explícita;
- TTL, expiração e comportamento offline devem ser documentados e testados por endpoint.

O usuário da assinatura pode salvar uma cópia explícita da previsão exibida no armazenamento local do aparelho.
O salvamento pede confirmação e, se já houver cópia, substitui a anterior. Essa cópia é privada, não substitui a API e mostra um aviso quando é usada sem conexão. Endpoints autenticados continuam fora do service worker e o access token permanece só em memória.

Se o aplicativo reabrir sem rede depois de uma cópia salva, o boot não fica preso no refresh: a sessão de leitura usa o último usuário guardado no aparelho (somente com o módulo `offline` e previsão salva) para abrir a Home e o Ranking. Mutações, locais, detalhe do local e parceiros seguem exigindo conexão. Ao voltar online, o app retoma o refresh e o `GET /me`. Logout apaga o snapshot do usuário e a previsão salva.

## Instalação e atualização

O shell captura `beforeinstallprompt` e mostra Instalar somente quando o navegador permite. Atualizações usam registro `prompt`, permitindo ao usuário recarregar quando uma nova versão estiver pronta. Um aviso de conectividade aparece offline.

O Vite registra o service worker também em `npm run dev` (`devOptions.enabled`), para o Chrome poder disparar o prompt de instalação. Esse SW de desenvolvimento não é o Workbox de produção: cache, precache e fallback ainda devem ser validados com build/preview ou o container.

O prompt só aparece em contexto seguro: `https://localhost` ou outro HTTPS. `http://192.168.x.x` e `http://<ip>.nip.io` no celular não registram o service worker nem disparam instalação.

O `npm run dev -- --host` serve o app em HTTP na porta 5173 e o PWA em HTTPS na 5174. No celular abra `http://<ip-lan>.nip.io:5173/` para navegar. Para instalar, use `https://<ip-lan>.nip.io:5174/` (o terminal imprime essa URL como `PWA (nip.io)`) e aceite o aviso do certificado de desenvolvimento. Cadastre as duas origens no Google Cloud (Origens JavaScript autorizadas), senão o login falha.

iOS nunca usa `beforeinstallprompt`; a instalação é Compartilhar → Adicionar à Tela de Início.
