/* Service worker Tiska Ops (D-053) — minimal: halaman "tidak ada sinyal"
   untuk navigasi yang gagal. Tidak menyimpan halaman berisi data (sesi &
   rahasia biaya); cache data jadwal offline menyusul.
   Push notifikasi (D-096): tampilkan pesan, klik → buka halaman tujuannya. */
const CACHE = "tiska-ops-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/ikon/ikon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { isi: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.judul || "Tiska Ops", {
      body: d.isi || "",
      icon: "/ikon/ikon-192.png",
      badge: "/ikon/ikon-192.png",
      tag: d.tag,
      renotify: Boolean(d.tag),
      data: { url: d.url || "/beranda" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/beranda";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((jendela) => {
      for (const w of jendela) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
