import { createFileRoute } from '@tanstack/react-router';
import { configured, supabase } from '../lib/supabase';
import { HOMEY_ORIGIN } from '../lib/seo';
import { createSitemapXml } from '../lib/sitemap-xml';

// This is a real server-side XML endpoint, NOT the storefront HTML page.
// TanStack Start registers it at https://www.homeyegypt.com/sitemap.xml
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        if (!configured) {
          return new Response('Sitemap unavailable: store configuration is missing', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        }
        try {
          // Supabase limits result pages; fetch all, not just the first 1000 items.
          const [products, variants, categories] = await Promise.all([
            fetchPublicRows('homly_products', 'id,status,deleted_at'),
            fetchPublicRows('homly_product_variants', 'product_id,slug,status'),
            fetchPublicRows('homly_categories', 'slug,is_active,deleted_at'),
          ]);
          const publishedIds = new Set(products
            .filter(p => p.status === 'published' && !p.deleted_at)
            .map(p => String(p.id)));
          const urls: string[] = [
            HOMEY_ORIGIN + '/',
            HOMEY_ORIGIN + '/products',
            HOMEY_ORIGIN + '/categories',
          ];
          // Link only to live public category pages.
          for (const category of categories) {
            if (category.is_active === true && !category.deleted_at && validSlug(category.slug))
              urls.push(HOMEY_ORIGIN + '/category/' + encodeURIComponent(String(category.slug)));
          }
          // Keep product URLs in sync with the published Supabase catalog.
          for (const variant of variants) {
            if (variant.status === 'published' && publishedIds.has(String(variant.product_id)) && validSlug(variant.slug))
              urls.push(HOMEY_ORIGIN + '/product/' + encodeURIComponent(String(variant.slug)));
          }
          return new Response(createSitemapXml(urls), {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=600',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        } catch (error) {
          // Do not report an incomplete sitemap as successful if catalog fetching fails.
          console.error('Unable to generate HOMEY sitemap:', error);
          return new Response('Sitemap temporarily unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        }
      },
    },
  },
});

function validSlug(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
}

async function fetchPublicRows(table: string, fields: string): Promise<Record<string, any>[]> {
  const rows: Record<string, any>[] = [];
  for (let offset = 0; offset < 49000; offset += 1000) {
    const { data, error } = await supabase.from(table)
      .select(fields).order('id', { ascending: true }).range(offset, offset + 999);
    if (error) throw error;
    const page = (data || []) as Record<string, any>[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
