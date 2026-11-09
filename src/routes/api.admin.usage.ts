import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

async function cloudinaryUsage() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !/^[\w-]+$/.test(cloud) || !key || !secret) return { status: 'unconfigured' };

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/usage`, {
      headers: { Authorization: 'Basic ' + btoa(key + ':' + secret) },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return { status: [401, 403].includes(response.status) ? 'credentials' : 'unavailable' };
    }
    const usage = await response.json();
    const numeric = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
    return {
      status: 'ok',
      credits: numeric(usage.credits?.usage),
      creditLimit: numeric(usage.credits?.limit),
      storageBytes: numeric(usage.storage?.usage),
      bandwidthBytes: numeric(usage.bandwidth?.usage),
      transformations: numeric(usage.transformations?.usage),
      assets: numeric(usage.resources),
    };
  } catch {
    return { status: 'unavailable' };
  }
}

export const Route = createFileRoute('/api/admin/usage')({
  server: { handlers: { GET: async ({ request }) => {
    const token = request.headers.get('authorization')?.match(/^Bearer ([\w.-]+)$/)?.[1];
    if (!token) return json({ error: 'سجّل الدخول من جديد.' }, 401);

    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return json({ error: 'إعدادات Supabase غير مكتملة.' }, 503);

    const client = createClient(url, key, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const user = await client.auth.getUser(token);
    if (user.error || !user.data.user) return json({ error: 'سجّل الدخول من جديد.' }, 401);
    const admin = await client.rpc('homly_is_admin');
    if (admin.error || admin.data !== true) return json({ error: 'الصفحة متاحة للأدمن فقط.' }, 403);

    const [database, cloudinary] = await Promise.all([
      client.rpc('homly_admin_storage_usage'),
      cloudinaryUsage(),
    ]);
    return json({
      supabase: database.error ? null : database.data,
      cloudinary,
      fetchedAt: new Date().toISOString(),
    });
  } } },
});
