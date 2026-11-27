import { CalendarClock, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { jadwalSatu, ringkasJadwalPesanan, tanggalPesanan } from "@/lib/jadwal-masak";
import { hariIniWib } from "@/lib/kalender";
import { wajibIzin } from "@/lib/rbac";
import { labelHari } from "@/lib/tim";

import { EditorJadwal } from "./editor-jadwal";

export const metadata: Metadata = { title: "Ubah Jadwal Masak" };
export const dynamic = "force-dynamic";

/* Jadwal produksi satu pesanan pada satu tanggal (docs/24 M1). */
export default async function HalamanUbahJadwal({ params, searchParams }: PageProps<"/jadwal-masak/[kunci]">) {
  await wajibIzin("jadwal-masak");
  const { kunci } = await params;
  const { tgl } = await searchParams;
  if (!/^[a-z0-9-]{1,40}$/.test(kunci)) notFound();
  const hariIni = hariIniWib();
  const tanggal = typeof tgl === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : hariIni;

  const [j, tanggalLain, tersimpan] = await Promise.all([jadwalSatu(kunci, tanggal), tanggalPesanan(kunci), ringkasJadwalPesanan(kunci)]);
  if (!j) notFound();
  const ada = new Set(tersimpan.map((t) => t.tanggal));

  return (
    <Halaman>
      <Link href={`/jadwal-masak?tgl=${tanggal}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Jadwal Masak
      </Link>
      <KepalaHalaman
        judul={j.nama}
        ikon={CalendarClock}
        keterangan={`Jadwal persiapan ${["Hari ini", "Besok"].includes(labelHari(tanggal, hariIni)) ? `${labelHari(tanggal, hariIni).toLowerCase()}, ` : ""}${new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${tanggal}T00:00:00Z`))}.`}
      />
      <EditorJadwal
        key={tanggal}
        kunci={kunci}
        tanggal={tanggal}
        hariIni={hariIni}
        hari={tanggalLain.map((t) => ({ tanggal: t, ada: ada.has(t) }))}
        awal={j.rencana}
        perubahan={j.berubah}
        pesanan={
          j.order
            ? {
                nama: j.order.nama,
                jamTeks: j.order.jamTeks,
                tempat: j.order.tempat,
                catatanDapur: j.order.catatanDapur,
                items: j.order.items.flatMap((i) => (i.jumlah ? [{ nama: i.nama, jumlah: i.jumlah }] : [])),
              }
            : null
        }
      />
    </Halaman>
  );
}
