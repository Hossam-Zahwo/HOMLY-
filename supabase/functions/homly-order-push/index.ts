import { createClient } from 'npm:@supabase/supabase-js@2.86.0';
import webPush from 'npm:web-push@3.6.7';

const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(url, key, { auth: { persistSession: false } });
const allowedEndpoint = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const token = request.headers.get('x-homey-push-token');
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) return new Response(null, { status: 401 });

  let id: string;
  try { ({ id } = await request.json()); } catch { return new Response(null, { status: 400 }); }
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 400 });

  const { data, error } = await db.rpc('homly_order_push_delivery', { p_token: token, p_id: id });
  if (error) return new Response(null, { status: 503 });
  if (!data) return new Response(null, { status: 403 });
  const payload = JSON.stringify({
    id,
    title: 'طلب جديد من هومي',
    body: 'افتح لوحة الإدارة لمراجعة الطلب',
    url: data.url,
  });

  let failures = 0;
  await Promise.all(data.devices.map(async (device: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
    if (!allowedEndpoint.test(device.endpoint)) return;
    try {
      await webPush.sendNotification(device, payload, {
        vapidDetails: {
          subject: 'mailto:homeyegypt.ecom@gmail.com',
          publicKey: data.public_key,
          privateKey: data.private_key,
        },
        TTL: 3600,
        urgency: 'high',
        timeout: 5000,
      });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        const { error: removalError } = await db.from('homly_push_subscriptions')
          .delete().eq('endpoint', device.endpoint).eq('subscription', JSON.stringify(device));
        if (removalError) failures++;
      } else {
        failures++;
        console.error('Order push delivery failed', status || 'network');
      }
    }
  }));
  return new Response(null, { status: failures ? 502 : 204 });
});
