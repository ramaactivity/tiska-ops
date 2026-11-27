import { namaTempat } from "./dapur-layar";
import type { PesanPush } from "./hitung/notifikasi";
import { ambilSendiri } from "./rencana-masak";

/* ==========================================================================
   KELENGKAPAN PESANAN (docs/25 #5) — tiap sore Mbak Ari mencocokkan pesanan
   besok di aplikasi dengan grup WA: yang kurang jam/tempat/jadwal masak/driver
   langsung terlihat, invoice tanpa tanggal acara ikut diingatkan. Murni.
   ========================================================================== */

export type CekPesanan = { kunci: string; nama: string; jam: string | null; kurang: string[] };

/** Yang masih kurang dari satu pesanan: jam, tempat (diantar), jadwal masak, driver (diantar). */
export function kurangPesanan(o: { jam: string | null; jamTeks: string | null; tempat: string | null }, ada: { jadwal: boolean; driver: boolean }): string[] {
  const ambil = ambilSendiri(o);
  return [
    ...(o.jam ? [] : ["jam"]),
    ...(ambil || namaTempat(o.tempat) ? [] : ["tempat"]),
    ...(ada.jadwal ? [] : ["jadwal masak"]),
    ...(ambil || ada.driver ? [] : ["driver"]),
  ];
}

const hari = (t: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/** Notifikasi sore untuk owner/admin/kepala dapur — selalu dikirim, juga saat kosong (pesanan bisa hanya ada di grup). */
export function pesanKelengkapan(tanggal: string, daftar: CekPesanan[], tanpaTanggal: number): PesanPush {
  const kurang = daftar.filter((d) => d.kurang.length);
  const baris = [
    ...kurang.slice(0, 3).map((d) => `${d.nama}: ${d.kurang.join(", ")} belum`),
    ...(kurang.length > 3 ? [`+${kurang.length - 3} pesanan lain belum lengkap`] : []),
    ...(tanpaTanggal ? [`${tanpaTanggal} invoice belum ada tanggal acaranya`] : []),
    "Cocokkan dengan grup WA.",
  ];
  return {
    judul: daftar.length
      ? `Besok ${daftar.length} pesanan · ${daftar.length - kurang.length} lengkap`
      : "Besok belum ada pesanan di aplikasi",
    isi: `${hari(tanggal)}. ${baris.join(" · ")}`,
    url: `/jadwal-masak?tgl=${tanggal}`,
    tag: `kelengkapan-${tanggal}`,
  };
}
