"use client";

import { CloudUpload, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { antrekan, isiAntrian, kirimAntrian, UBAH_ANTRIAN, type AksiTersimpan, type AksiTim, type HasilKirim } from "@/lib/antrian-tim";

/** Laporan yang masih menunggu di HP (D-099) — untuk menandai ⏳ di kartu. */
export function useAntrian(): AksiTersimpan[] {
  const [antre, setAntre] = useState<AksiTersimpan[]>([]);
  useEffect(() => {
    const baca = () => isiAntrian().then(setAntre, () => setAntre([]));
    baca();
    window.addEventListener(UBAH_ANTRIAN, baca);
    return () => window.removeEventListener(UBAH_ANTRIAN, baca);
  }, []);
  return antre;
}

function useUmumkan() {
  const router = useRouter();
  return useCallback(
    (h: HasilKirim, kunci?: number, berhasil?: string) => {
      for (const p of h.ditolak) toast.error(p);
      if (h.terkirim.length) router.refresh();
      if (kunci === undefined) {
        if (h.terkirim.length) toast.success(`${h.terkirim.length} laporan yang tertunda sudah terkirim ✅`);
      } else if (h.terkirim.includes(kunci)) toast.success(berhasil);
      else if (h.tertunda) toast(h.sesiHabis ? "Tersimpan di HP. Masuk lagi supaya terkirim." : "Tersimpan di HP — terkirim sendiri begitu ada sinyal.", { icon: "⏳" });
    },
    [router],
  );
}

/** Tombol Siap / status kirim: masuk antrian HP dulu, lalu langsung dicoba kirim. */
export function useLapor() {
  const umumkan = useUmumkan();
  const [menunggu, mulai] = useTransition();
  /** `lalu` dipanggil bila laporannya terkirim atau aman tersimpan di HP (tidak ditolak). */
  const lapor = (a: () => Promise<AksiTim>, berhasil: string, lalu?: () => void) =>
    mulai(async () => {
      try {
        const { kunci, hasil } = await antrekan(await a());
        umumkan(hasil, kunci, berhasil);
        if (hasil.terkirim.includes(kunci) || !hasil.ditolak.length) lalu?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Laporan gagal disimpan di HP. Coba lagi.");
      }
    });
  return { lapor, menunggu };
}

/**
 * Tanpa sinyal (D-098) & antrian laporan (D-099): halaman ini bisa jadi
 * salinan terakhir dari service worker — beri tahu jam datanya. Laporan yang
 * tertunda dikirim ulang saat sinyal kembali, halaman dibuka, atau tiap 30 detik.
 */
export function StatusSinyal({ diperbarui }: { diperbarui: string }) {
  const [daring, setDaring] = useState(true);
  const [sesiHabis, setSesiHabis] = useState(false);
  const antre = useAntrian();
  const umumkan = useUmumkan();
  useEffect(() => {
    const coba = () => {
      setDaring(navigator.onLine);
      if (navigator.onLine && document.visibilityState === "visible")
        kirimAntrian().then((h) => (setSesiHabis(h.sesiHabis), umumkan(h)), () => {});
    };
    coba();
    const tiap = setInterval(coba, 30_000);
    window.addEventListener("online", coba);
    window.addEventListener("offline", coba);
    document.addEventListener("visibilitychange", coba);
    return () => {
      clearInterval(tiap);
      window.removeEventListener("online", coba);
      window.removeEventListener("offline", coba);
      document.removeEventListener("visibilitychange", coba);
    };
  }, [umumkan]);
  if (daring && !antre.length) return null;
  return (
    <div role="status" className="mb-3 flex flex-col gap-2 rounded-2xl border border-perhatian-garis bg-perhatian-halus p-4 text-base text-perhatian">
      {!daring ? (
        <p className="flex items-start gap-3">
          <WifiOff className="mt-0.5 size-5 shrink-0" />
          <span>
            <b>Tidak ada sinyal.</b> Ini jadwal terakhir (diperbarui jam {diperbarui}). Tombol tetap bisa ditekan — laporannya disimpan di HP.
          </span>
        </p>
      ) : null}
      {antre.length ? (
        <p className="flex items-start gap-3">
          <CloudUpload className="mt-0.5 size-5 shrink-0" />
          <span>
            <b>{antre.length} laporan menunggu sinyal</b> — terkirim sendiri, tidak perlu ditekan lagi.
            {sesiHabis ? " Masuk lagi dulu supaya bisa terkirim." : " Jangan keluar akun dulu."}
          </span>
        </p>
      ) : null}
    </div>
  );
}
