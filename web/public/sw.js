/* Service worker Tiska Ops (D-053) — minimal: halaman "tidak ada sinyal"
   untuk navigasi yang gagal. Tidak menyimpan halaman berisi data (sesi &
   rahasia biaya); cache data jadwal offline menyusul.
   Push notifikasi (D-096): tampilkan pesan, klik → buka halaman tujuannya.
   Jadwal tanpa sinyal (D-098): HANYA /beranda ("Jadwal saya", tanpa harga)
   disimpan tiap kali berhasil dibuka; tanpa sinyal → salinan terakhir.
   Salinan dihapus saat keluar akun (kerangka-aplikasi). File /_next/static
   (bernama-hash, tidak berubah) disimpan supaya tombol tetap hidup. */
const CACHE = "tiska-ops-v3";
const JADWAL = "tiska-ops-jadwal";
const STATIS = "tiska-ops-statis";
const OFFLINE = "/offline.html";
const PAKAI = [CACHE, JADWAL, STATIS];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/ikon/ikon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !PAKAI.includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

/** Salinan jadwal terakhir, atau halaman "tidak ada sinyal". */
const cadangan = () => caches.open(JADWAL).then((c) => c.match("/beranda")).then((r) => r || caches.match(OFFLINE));

/** Batasi file statis yang disimpan (deploy baru menambah file bernama-hash baru). */
async function rapikanStatis() {
  const c = await caches.open(STATIS);
  const kunci = await c.keys();
  await Promise.all(kunci.slice(0, Math.max(0, kunci.length - 200)).map((k) => c.delete(k)));
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== "GET") return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.open(STATIS).then((c) =>
        c.match(e.request).then(
          (ada) =>
            ada ||
            fetch(e.request).then((res) => {
              if (res.ok) c.put(e.request, res.clone()).then(rapikanStatis);
              return res;
            }),
        ),
      ),
    );
    return;
  }

  if (e.request.mode !== "navigate") return;
  if (url.pathname === "/beranda") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Sesi habis (dialihkan ke /masuk) atau galat: jangan timpa salinan yang baik.
          if (res.ok && !res.redirected) {
            const salin = res.clone();
            caches.open(JADWAL).then((c) => c.put("/beranda", salin));
          }
          return res;
        })
        .catch(cadangan),
    );
    return;
  }
  // Dibuka dari ikon HP tanpa sinyal ("/") → tetap tampilkan jadwal terakhir.
  e.respondWith(fetch(e.request).catch(() => (url.pathname === "/" ? cadangan() : caches.match(OFFLINE))));
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
