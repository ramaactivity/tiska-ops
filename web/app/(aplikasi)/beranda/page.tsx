import type { Metadata } from "next";

import { Halaman, KeadaanKosong, KepalaHalaman } from "@/components/halaman";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { LABEL_PERAN } from "@/lib/peran";
import { wajibSesi } from "@/lib/rbac";

export const metadata: Metadata = { title: "Beranda" };

/**
 * Hentian terakhir untuk peran yang belum punya satu pun halaman terbuka
 * (lihat halamanAwal di lib/navigasi.ts).
 *
 * Sengaja hanya menuntut sesi dan TIDAK memuat angka apa pun: halaman ini
 * dibuka siapa saja yang sudah masuk — captain, driver, dapur — jadi satu
 * kueri uang di sini sama dengan membocorkannya ke semua peran.
 */
export default async function HalamanBeranda({ searchParams }: PageProps<"/beranda">) {
  const sesi = await wajibSesi();
  const { akses } = await searchParams;

  return (
    <Halaman>
      <KepalaHalaman judul={`Halo, ${sesi.nama}`} keterangan={LABEL_PERAN[sesi.peran]} />
      <PemberitahuanAkses ditolak={akses === "ditolak"} />
      <div className="mt-6 rounded-2xl border bg-card">
        <KeadaanKosong
          judul="Halaman kerja untuk peran ini sedang disiapkan"
          keterangan="Untuk sementara jadwal dan brief tetap lewat grup WhatsApp seperti biasa."
        />
      </div>
    </Halaman>
  );
}
