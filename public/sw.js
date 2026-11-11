self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

function isAdminPath(path) {
  return path === '/admin' || path.startsWith('/admin/');
}

function adminTarget(path) {
  const url = new URL(path || '/admin/orders', self.location.origin);
  return url.origin === self.location.origin && isAdminPath(url.pathname)
    ? url
    : new URL('/admin/orders', self.location.origin);
}

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let data = {};
    try { data = event.data?.json() || {}; } catch {}
    await self.registration.showNotification(data.title || 'طلب جديد من هومي', {
      body: data.body || 'افتح لوحة الإدارة لمراجعة الطلب',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.id,
      data: { url: adminTarget(data.url).href },
    });
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (isAdminPath(new URL(client.url).pathname)) {
        client.postMessage({ type: 'homy-notification', id: data.id });
      }
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = adminTarget(event.notification.data?.url);
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      const url = new URL(client.url);
      if (url.origin === target.origin && isAdminPath(url.pathname)) {
        const admin = await client.navigate(target.href);
        if (admin) return admin.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
