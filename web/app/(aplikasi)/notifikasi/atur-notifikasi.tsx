"use client";

import { BellOff, BellRing, LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { hapusLangganan, kirimUji, simpanLangganan } from "./actions";

type Keadaan = "memuat" | "tidak-didukung" | "ios-pasang" | "ditolak" | "mati" | "aktif";

/** Kunci VAPID (base64url) → Uint8Array untuk pushManager.subscribe. */
function keBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const namaPerangkat = () => {
  const u = navigator.userAgent;
  const os = /iPhone|iPad/.test(u) ? "iPhone" : /Android/.test(u) ? "Android" : /Mac/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : "Perangkat";
  const br = /Edg\//.test(u) ? "Edge" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : /Firefox\//.test(u) ? "Firefox" : "";
  return `${os}${br ? ` · ${br}` : ""}`;
};

export function AturNotifikasi({ kunciPublik, terdaftar }: { kunciPublik: string; terdaftar: { endpoint: string; perangkat: string; sejak: string; terakhir: string | null }[] }) {
  const [keadaan, setKeadaan] = useState<Keadaan>("memuat");
  const [endpointIni, setEndpointIni] = useState<string | null>(null);
  const [menunggu, mulai] = useTransition();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const terpasang = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setKeadaan(ios && !terpasang ? "ios-pasang" : "tidak-didukung");
      }
      if (Notification.permission === "denied") return setKeadaan("ditolak");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setEndpointIni(sub?.endpoint ?? null);
      setKeadaan(sub ? "aktif" : "mati");
    })().catch(() => setKeadaan("tidak-didukung"));
  }, []);

  const aktifkan = () =>
    mulai(async () => {
      try {
        if (!kunciPublik) throw new Error("Kunci notifikasi belum dipasang di server.");
        const izin = await Notification.requestPermission();
        if (izin !== "granted") return setKeadaan(izin === "denied" ? "ditolak" : "mati");
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keBytes(kunciPublik) }));
        await simpanLangganan(sub.toJSON(), namaPerangkat());
        setEndpointIni(sub.endpoint);
        setKeadaan("aktif");
        toast.success("Notifikasi aktif di HP ini.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Notifikasi gagal diaktifkan.");
      }
    });

  const matikan = () =>
    mulai(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await hapusLangganan(sub.endpoint);
        await sub.unsubscribe();
      }
      setEndpointIni(null);
      setKeadaan("mati");
      toast.success("Notifikasi dimatikan di HP ini.");
      router.refresh();
    });

  const uji = () =>
    mulai(async () => {
      const h = await kirimUji();
      if (h.terkirim) toast.success(`Notifikasi uji dikirim ke ${h.terkirim} HP.`);
      else toast.error("Belum ada HP yang aktif menerima notifikasi.");
    });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        {keadaan === "memuat" ? <p className="text-muted-foreground">Memeriksa HP ini…</p> : null}
        {keadaan === "aktif" ? <p className="text-lg font-semibold text-lunas">🔔 Notifikasi aktif di HP ini</p> : null}
        {keadaan === "mati" ? <p className="text-lg font-semibold">Notifikasi belum aktif di HP ini</p> : null}
        {keadaan === "ditolak" ? (
          <p className="text-perhatian">
            Izin notifikasi untuk Tiska Ops pernah <b>ditolak</b>. Buka pengaturan peramban/HP → Notifikasi → izinkan tiska-ops.vercel.app, lalu buka halaman ini lagi.
          </p>
        ) : null}
        {keadaan === "ios-pasang" ? (
          <p className="text-perhatian">
            Di iPhone, notifikasi hanya bisa setelah Tiska Ops <b>ditambahkan ke Layar Utama</b>: tekan tombol Bagikan → “Tambah ke Layar Utama”, buka dari ikonnya, lalu kembali ke halaman ini.
          </p>
        ) : null}
        {keadaan === "tidak-didukung" ? <p className="text-perhatian">Peramban ini belum mendukung notifikasi. Pakai Chrome di Android, atau Safari di iPhone (iOS 16.4+) dari Layar Utama.</p> : null}
        <div className="flex flex-wrap gap-2">
          {keadaan === "mati" ? (
            <Button className="h-12 px-6 text-base" disabled={menunggu} onClick={aktifkan}>
              {menunggu ? <LoaderCircle className="size-5 animate-spin" /> : <BellRing className="size-5" />}
              Aktifkan notifikasi
            </Button>
          ) : null}
          {keadaan === "aktif" ? (
            <>
              <Button className="h-12 px-5" variant="outline" disabled={menunggu} onClick={uji}>
                <Send className="size-4" />
                Kirim notifikasi uji
              </Button>
              <Button className="h-12 px-5" variant="ghost" disabled={menunggu} onClick={matikan}>
                <BellOff className="size-4" />
                Matikan di HP ini
              </Button>
            </>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">HP Xiaomi/Oppo/Vivo: matikan “penghemat baterai” untuk Chrome supaya notifikasi tidak tertunda.</p>
      </section>
      {terdaftar.length ? (
        <section className="rounded-2xl border bg-card">
          <h2 className="eyebrow border-b p-4">HP terdaftar · {terdaftar.length}</h2>
          <ul className="divide-y text-sm">
            {terdaftar.map((t) => (
              <li key={t.endpoint} className="flex flex-wrap justify-between gap-2 p-4">
                <span>
                  {t.perangkat}
                  {t.endpoint === endpointIni ? <span className="ml-2 text-xs text-lunas">HP ini</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  sejak {t.sejak}
                  {t.terakhir ? ` · terakhir dikirimi ${t.terakhir}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
