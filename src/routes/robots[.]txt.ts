import { createFileRoute } from '@tanstack/react-router';
import { HOMEY_ORIGIN } from '../lib/seo';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => new Response([
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /cart',
        'Disallow: /orders',
        'Sitemap: ' + HOMEY_ORIGIN + '/sitemap.xml',
        '',
      ].join('\n'), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
      }),
    },
  },
});
