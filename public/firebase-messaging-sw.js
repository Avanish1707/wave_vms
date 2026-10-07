importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js",
);

const searchParams = new URL(self.location.href).searchParams;
const firebaseConfig = Object.fromEntries(
  [
    "apiKey",
    "authDomain",
    "databaseURL",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
    "measurementId",
  ]
    .map((key) => [key, searchParams.get(key)])
    .filter(([, value]) => value),
);

self.firebase.initializeApp(firebaseConfig);

self.addEventListener("install", () => {
  console.log("[Firebase SW] Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("[Firebase SW] Activating...");
  self.clients.claim();
});

const messaging = self.firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[Firebase SW] Background message:", payload);

  const notificationTitle = payload.notification?.title || "iLogic Alert";
  const notificationOptions = {
    body: payload.notification?.body || "New security event detected",
    icon: "/ilogic-logo.png",
    badge: "/ilogic-logo.png",
    tag: "wave-vms-alert",
    requireInteraction: true,
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  console.log("[Firebase SW] Notification clicked");
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" || client.url === location.origin + "/") {
            return client.focus();
          }
        }
        return clients.openWindow("/");
      }),
  );
});
