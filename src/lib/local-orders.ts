import { useSyncExternalStore } from 'react';
import type { Order, OrderItem } from './commerce';

type LocalOrder = Pick<Order, 'id' | 'code' | 'created_at' | 'total_minor'> & {
  items: Pick<OrderItem, 'id' | 'title_snapshot' | 'quantity' | 'line_total_minor'>[];
};

const key = 'homey-customer-orders';
const event = 'homey:customer-orders';
const empty: LocalOrder[] = [];
let cachedRaw: string | null = null;
let cachedOrders = empty;

function read(): LocalOrder[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      const value = JSON.parse(raw ?? '[]');
      cachedOrders = Array.isArray(value) ? value.filter(order =>
        order && typeof order.id === 'string' && typeof order.code === 'string' &&
        typeof order.created_at === 'string' && Number.isFinite(order.total_minor) && Array.isArray(order.items)
      ) : empty;
      cachedRaw = raw;
    }
    return cachedOrders;
  } catch {
    return empty;
  }
}

export function rememberOrder(order: Order) {
  try {
    const snapshot: LocalOrder = {
      id: order.id,
      code: order.code,
      created_at: order.created_at,
      total_minor: order.total_minor,
      items: (order.items ?? []).map(({ id, title_snapshot, quantity, line_total_minor }) =>
        ({ id, title_snapshot, quantity, line_total_minor })),
    };
    const list = [...read().filter(previous => previous.id !== order.id), snapshot]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    window.localStorage.setItem(key, JSON.stringify(list));
    window.dispatchEvent(new Event(event));
  } catch {
    // A browser storage failure must never turn a confirmed purchase into a checkout error.
  }
}

function subscribe(notify: () => void) {
  const onStorage = (change: StorageEvent) => {
    if (change.key === key || change.key === null) notify();
  };
  window.addEventListener(event, notify);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(event, notify);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLocalOrders() {
  return useSyncExternalStore(subscribe, read, () => empty);
}
