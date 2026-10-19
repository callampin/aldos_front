// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://aldosmotos.cl',
  // `server` permite filtros por query string, protección SSR de /admin/* y datos frescos desde el Worker API
  // manteniendo las tarjetas como HTML renderizado en servidor (SEO, 0 KB de JS).
  output: 'server',
  integrations: [react()],
  // Las fotos de productos ya se comprimen a WebP en el navegador antes de subirse a R2 (`image-compressor.ts`).
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  vite: {
    // Tailwind CSS v4 se integra vía plugin de Vite (no `@astrojs/tailwind`, que es para v3).
    plugins: [tailwindcss()],
  },
});
