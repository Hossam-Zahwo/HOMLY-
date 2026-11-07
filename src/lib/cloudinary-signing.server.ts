/** Server-only Cloudinary signing helper. Never import into browser bundles. */
import { createHash } from 'node:crypto';
export function signHomeyUpload(input: { authorizedAdmin: boolean; sku: string; timestamp?: number }) {
  if (!input.authorizedAdmin) throw new Error('Unauthorized admin');
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  if (!apiSecret || !apiKey) throw new Error('Cloudinary credentials are not configured');
  const sku = input.sku.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 80);
  if (!sku) throw new Error('Valid SKU is required');
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  if (Math.abs(timestamp - Math.floor(Date.now() / 1000)) > 60) throw new Error('Invalid timestamp');
  const folder = 'homey/products/' + sku;
  const signature = createHash('sha1').update('folder=' + folder + '&timestamp=' + timestamp + apiSecret).digest('hex');
  return { cloud_name: 'efpylmbh', api_key: apiKey, timestamp, folder, signature };
}
/** The route calling this helper MUST validate Supabase Auth server-side and verify
 * the user's admin role using existing project authorization rules before passing true.
 * Do not trust a client-provided authorizedAdmin flag or SKU ownership.
 */
