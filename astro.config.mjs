// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // TODO(dominio): reemplazar por el dominio real de la tienda antes de desplegar (SEO / sitemap).
  site: 'https://aldosmotos.cl',
  // `server` permite filtros por query string y datos frescos desde el Worker API
  // manteniendo las tarjetas como HTML renderizado en servidor (SEO, 0 KB de JS).
  output: 'server',
  integrations: [react()],
  adapter: cloudflare(),
  vite: {
    // Tailwind CSS v4 se integra vía plugin de Vite (no `@astrojs/tailwind`, que es para v3).
    plugins: [tailwindcss()],
  },
});
