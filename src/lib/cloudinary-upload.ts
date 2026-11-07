import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { signHomeyUpload } from './cloudinary-signing.server';

/** Server verifies the JWT and admin RPC; never trust a browser-supplied admin flag. */
export const requestHomeyUploadSignature = createServerFn({ method: 'POST' })
  .inputValidator((input: { accessToken: string; sku: string }) => input)
  .handler(async ({ data }) => {
    const url = process.env.VITE_SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon || !data.accessToken) throw new Error('Authentication is unavailable');
    const client = createClient(url, anon, {
      global: { headers: { Authorization: 'Bearer ' + data.accessToken } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: userError } = await client.auth.getUser(data.accessToken);
    if (userError || !userResult.user) throw new Error('Unauthorized');
    const { data: admin, error } = await client.rpc('homly_is_admin');
    if (error || admin !== true) throw new Error('Admin permission required');
    return signHomeyUpload({ authorizedAdmin: true, sku: data.sku });
  });
