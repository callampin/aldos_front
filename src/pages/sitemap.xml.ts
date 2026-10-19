import type { APIRoute } from 'astro';
import { getCatalog } from '../lib/catalog';

/** Sitemap dinámico: páginas públicas + todas las fichas de producto. */
export const GET: APIRoute = async () => {
  const site = (import.meta.env.SITE ?? 'https://aldosmotos.cl').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { path: '/', priority: '1.0' },
    { path: '/catalogo', priority: '0.9' },
    { path: '/nosotros', priority: '0.6' },
    { path: '/politicas-envio-y-devoluciones', priority: '0.5' },
    { path: '/seguimiento', priority: '0.4' },
  ];

  const { items } = await getCatalog({ limit: 1000 });

  const urls = [
    ...staticPages.map((page) => ({ loc: `${site}${page.path}`, priority: page.priority })),
    ...items.map((product) => ({ loc: `${site}/producto/${product.slug}`, priority: '0.8' })),
  ];

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (url) =>
          `  <url>\n    <loc>${url.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`,
      )
      .join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
