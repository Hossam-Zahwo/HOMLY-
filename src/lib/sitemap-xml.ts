/** Escaping and deduplication for valid XML sitemaps. */
export function escapeSitemapXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Only absolute, https URLs on the canonical HOMEY host should be listed. */
export function createSitemapXml(input: string[]): string {
  const unique = [...new Set(input)].filter((url) => {
    try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'www.homeyegypt.com'; }
    catch { return false; }
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    unique.map((url) => `  <url><loc>${escapeSitemapXml(url)}</loc></url>`).join('\n') +
    '\n</urlset>\n';
}
