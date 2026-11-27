import { CalendarClock, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { jadwalTanggal, KUNCI_GABUNGAN, ringkasJadwalPesanan, tanggalPesanan } from "@/lib/jadwal-masak";
import { hariIniWib } from "@/lib/kalender";
import type { OrderLayar } from "@/lib/pesanan-dapur";
import { wajibIzin } from "@/lib/rbac";
import { labelHari } from "@/lib/tim";

import { EditorJadwal, type RingkasPesanan } from "./editor-jadwal";

export const metadata: Metadata = { title: "Ubah Jadwal Masak" };
export const dynamic = "force-dynamic";

/** Isi pesanan untuk panel acuan editor — tanpa harga. */
const ringkas = (o: OrderLayar): RingkasPesanan => ({
  nama: o.nama,
  jamTeks: o.jamTeks,
  tempat: o.tempat,
  catatanDapur: o.catatanDapur,
  items: o.items.flatMap((i) => (i.jumlah ? [{ nama: i.nama, jumlah: i.jumlah }] : [])),
});

/* Jadwal produksi satu pesanan — atau jadwal gabungan pesanan kecil (kunci "gabungan") — pada satu tanggal (docs/24). */
export default async function HalamanUbahJadwal({ params, searchParams }: PageProps<"/jadwal-masak/[kunci]">) {
  await wajibIzin("jadwal-masak");
  const { kunci } = await params;
  const { tgl } = await searchParams;
  if (!/^[a-z0-9-]{1,40}$/.test(kunci)) notFound();
  const hariIni = hariIniWib();
  const tanggal = typeof tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : hariIni;
  const gabungan = kunci === KUNCI_GABUNGAN;

  const [hariItu, tanggalLain, tersimpan] = await Promise.all([
    jadwalTanggal(tanggal),
    gabungan ? Promise.resolve([]) : tanggalPesanan(kunci),
    gabungan ? Promise.resolve([]) : ringkasJadwalPesanan(kunci),
  ]);
  const j = gabungan ? null : hariItu.pesanan.find((x) => x.kunci === kunci);
  if (!gabungan && !j) notFound();
  const g = hariItu.gabungan;
  const ada = new Set(tersimpan.map((t) => t.tanggal));
  const tglPanjang = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${tanggal}T00:00:00Z`),
  );
  const kapan = ["Hari ini", "Besok"].includes(labelHari(tanggal, hariIni)) ? `${labelHari(tanggal, hariIni).toLowerCase()}, ` : "";

  return (
    <Halaman>
      <Link href={`/jadwal-masak?tgl=${tanggal}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Jadwal Masak
      </Link>
      <KepalaHalaman
        judul={gabungan ? "Jadwal gabungan" : j!.nama}
        ikon={CalendarClock}
        keterangan={
          gabungan
            ? `Pesanan kecil ${kapan}${tglPanjang} dijadwalkan sekaligus: ${(g.rencana ? g.pesanan : g.calon).map((o) => o.nama).join(", ") || "belum ada pesanan"}.`
            : `Jadwal persiapan ${kapan}${tglPanjang}.`
        }
      />
      <EditorJadwal
        key={tanggal}
        kunci={kunci}
        tanggal={tanggal}
        hariIni={hariIni}
        hari={tanggalLain.map((t) => ({ tanggal: t, ada: ada.has(t) }))}
        awal={gabungan ? g.rencana : j!.rencana}
        perubahan={gabungan ? g.berubah : j!.berubah}
        gabungan={gabungan}
        // Gabungan: yang tersimpan menampilkan anggotanya; draf baru/buat ulang memakai semua calon.
        pesanan={gabungan ? (g.rencana && !g.berubah.length ? g.pesanan : g.calon).map(ringkas) : j!.order ? [ringkas(j!.order)] : []}
      />
    </Halaman>
  );
}
