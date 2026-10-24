self.addEventListener("push", (event) => {
  let notification = {
    title: "طلب جديد",
    body: "وصلك طلب جديد في المتجر.",
    url: "/admin#orders",
  };

  if (event.data) {
    try {
      notification = { ...notification, ...event.data.json() };
    } catch {
      notification.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: "/static/icon/logo.png",
    badge: "/static/icon/logo.png",
    tag: "new-store-order",
    data: { url: notification.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/admin#orders", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (existingClient) {
        return existingClient.navigate(targetUrl).then((client) => client.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
