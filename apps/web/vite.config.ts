import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { getCertificate } from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function lanIpv4Addresses() {
  return Object.values(os.networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

function nipIoHosts() {
  return lanIpv4Addresses().map((ip) => `${ip}.nip.io`);
}

function httpsPort(httpPort: number) {
  return httpPort === 5173 ? 5174 : httpPort + 1;
}

let lanHttpsServer: https.Server | undefined;

function lanHttps(): Plugin {
  const certDir = path.resolve(__dirname, 'node_modules/.vite/basic-ssl-nip');
  const hosts = [...nipIoHosts(), ...lanIpv4Addresses()];

  return {
    name: 'tanomar-lan-https',
    async configureServer(server) {
      lanHttpsServer?.close();
      lanHttpsServer = undefined;
      const certificate = await getCertificate(certDir, 'tanomar.dev', hosts);
      let httpsServer: https.Server | undefined;

      const startHttps = () => {
        const httpServer = server.httpServer;
        if (!httpServer || httpsServer) return;
        const address = httpServer.address();
        if (!address || typeof address === 'string') return;

        httpsServer = https.createServer(
          { cert: certificate, key: certificate },
          server.middlewares,
        );
        httpsServer.on('upgrade', (request, socket, head) => {
          httpServer.emit('upgrade', request, socket, head);
        });
        httpsServer.on('error', (error) => {
          server.config.logger.warn(`HTTPS LAN: ${error.message}`);
        });
        httpsServer.listen(httpsPort(address.port), address.address, () => {
          lanHttpsServer = httpsServer;
          for (const host of nipIoHosts()) {
            server.config.logger.info(
              `  ➜  PWA (nip.io): https://${host}:${httpsPort(address.port)}/`,
            );
          }
        });
      };

      server.httpServer?.once('listening', startHttps);
      const close = () => {
        httpsServer?.close();
        httpsServer = undefined;
      };
      server.httpServer?.once('close', close);
    },
  };
}

function nipIoHint(): Plugin {
  return {
    name: 'tanomar-nip-io-hint',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        printUrls();
        const address = server.httpServer?.address();
        const port =
          typeof address === 'object' && address
            ? address.port
            : (server.config.server.port ?? 5173);
        for (const host of nipIoHosts()) {
          server.config.logger.info(`  ➜  Celular:      http://${host}:${port}/`);
        }
      };
    },
  };
}

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.nip.io'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    lanHttps(),
    nipIoHint(),
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: {
        enabled: true,
      },
      manifest: {
        id: '/',
        name: 'TáNoMar',
        short_name: 'TáNoMar',
        description: 'Pesque no momento certo. Descubra onde e quando vale a pena pescar.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#063B4C',
        background_color: '#F3E9D7',
        categories: ['weather', 'lifestyle', 'sports'],
        lang: 'pt-BR',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
