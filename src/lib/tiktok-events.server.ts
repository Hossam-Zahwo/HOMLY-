/** TikTok Events API 2.0 server-only transport.
 * Never import this file from browser components.
 * The caller MUST verify that the order was committed in the database before sending.
 */
const PIXEL_ID = 'DC0ACP3C77U78FB32HAG';
const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

export type VerifiedOrderEvent = {
  id: string;
  created_at: string;
  total_minor: number;
  shipping_minor: number;
  items: Array<{
    variant_id: string;
    title_snapshot: string;
    quantity: number;
    unit_price_minor: number;
  }>;
};

export async function sendVerifiedOrderToTikTok(order: VerifiedOrderEvent, options?: { testEventCode?: string }): Promise<void> {
  // Secret read only in the server runtime; it must never be prefixed VITE_.
  const token = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  if (!token) throw new Error('TikTok Events API token is not configured');
  if (!order.id || !Array.isArray(order.items) || !order.items.length) {
    throw new Error('A verified order with line items is required');
  }
  if (!Number.isFinite(order.total_minor) || !Number.isFinite(order.shipping_minor)) {
    throw new Error('Invalid order totals');
  }
  const eventTime = Math.floor(new Date(order.created_at).getTime() / 1000);
  if (!Number.isFinite(eventTime)) throw new Error('Invalid order date');
  const event = {
    event: 'PlaceAnOrder',
    event_time: eventTime,
    // Same event name + ID as browser pixel for deduplication.
    event_id: order.id,
    properties: {
      currency: 'EGP',
      value: (order.total_minor - order.shipping_minor) / 100,
      content_type: 'product',
      order_id: order.id,
      contents: order.items.map(item => ({
        content_id: item.variant_id,
        content_name: item.title_snapshot,
        price: item.unit_price_minor / 100,
        quantity: item.quantity,
      })),
    },
  };
  const body = {
    event_source: 'web',
    event_source_id: PIXEL_ID,
    data: [event],
    ...(options?.testEventCode ? { test_event_code: options.testEventCode } : {}),
  };
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('TikTok Events API HTTP ' + response.status);
  const json = await response.json() as { code?: number; message?: string };
  if (json.code !== 0) throw new Error('TikTok Events API rejected event: ' + (json.code ?? 'unknown'));
}
