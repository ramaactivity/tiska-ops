import { ExternalLink, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { SaringStatus } from "@/components/saring-status";
import { hariIniWib } from "@/lib/kalender";
import { agendaDapur, rencanaMasak } from "@/lib/pesanan-dapur";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { bacaKontrol } from "./actions";
import { EditorRencana } from "./editor-rencana";
import { PanelKontrol } from "./panel-kontrol";

export const metadata: Metadata = { title: "Kontrol Dapur" };
export const dynamic = "force-dynamic";

/* Kontrol Dapur (docs/23): tab Live = ruang kontrol TV (D-234); tab Rencana masak = jadwal persiapan format Mbak Rita
   yang tampil di TV sebagai Sekarang/Berikutnya dan bisa disalin ke grup WA (P2). */
export default async function HalamanKontrolDapur({
  searchParams,
}: PageProps<"/kontrol-dapur">) {
  await wajibIzin("kontrol-dapur");
  const { tab, tgl } = await searchParams;
  const rencana = tab === "rencana";

  let isi: React.ReactNode;
  if (rencana) {
    const hariIni = hariIniWib();
    const hari = Array.from({ length: 7 }, (_, n) =>
      new Date(Date.parse(`${hariIni}T00:00:00Z`) + n * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    const tanggal =
      typeof tgl === "string" && hari.includes(tgl) ? tgl : hariIni;
    const [agenda, [tersimpan], berencana] = await Promise.all([
      agendaDapur(hariIni, 7),
      rencanaMasak([tanggal]),
      prisma.kitchen_plans.findMany({
        where: { date: { in: hari.map((h) => new Date(`${h}T00:00:00Z`)) } },
        select: { date: true },
      }),
    ]);
    const adaRencana = new Set(
      berencana.map((b) => b.date.toISOString().slice(0, 10)),
    );
    isi = (
      <EditorRencana
        key={tanggal}
        tanggal={tanggal}
        hariIni={hariIni}
        hari={hari.map((h) => ({
          tanggal: h,
          pesanan:
            agenda.find((a) => a.tanggal === h)?.pesanan.map((p) => p.nama) ??
            [],
          rencana: adaRencana.has(h),
        }))}
        awal={tersimpan ?? null}
      />
    );
  } else isi = <PanelKontrol awal={await bacaKontrol()} />;

  return (
    <Halaman>
      <KepalaHalaman
        judul="Kontrol Dapur"
        ikon={SlidersHorizontal}
        keterangan="Atur apa yang tampil di TV dapur, susun jadwal persiapan, umumkan sesuatu, dan pastikan layarnya menyala dan bersuara."
        aksi={
          <a
            href="/layar-dapur"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink className="size-4" /> Buka tampilan TV
          </a>
        }
      />
      <SaringStatus
        parameter="tab"
        pilihan={[
          { nilai: "", label: "Layar & pengumuman" },
          { nilai: "rencana", label: "Rencana masak" },
        ]}
      />
      <div className="mt-6">{isi}</div>
    </Halaman>
  );
}
