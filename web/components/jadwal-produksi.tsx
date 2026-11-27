import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ringkasJadwalPesanan } from "@/lib/jadwal-masak";
import { rentangJam } from "@/lib/rencana-masak";

const hari = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`));

/**
 * Jadwal produksi sebuah pesanan per tanggal acara (docs/24 M1) — dipakai di detail invoice & event.
 * `bolehUbah` = punya izin Jadwal Masak; yang lain hanya melihat ringkasannya.
 */
export async function DaftarJadwalProduksi({ kunci, tanggal, bolehUbah }: { kunci: string; tanggal: string[]; bolehUbah: boolean }) {
  const tersimpan = await ringkasJadwalPesanan(kunci, tanggal);
  const semua = [...new Set([...tanggal, ...tersimpan.map((t) => t.tanggal)])].sort();
  if (!semua.length) return null;
  return (
    <ul className="flex flex-col divide-y">
      {semua.map((t) => {
        const j = tersimpan.find((x) => x.tanggal === t);
        const rentang = j ? rentangJam(j.rencana) : null;
        const isi = (
          <>
            <span className="w-28 shrink-0 font-medium">{hari(t)}</span>
            <span className={`min-w-0 flex-1 ${j ? "" : "text-muted-foreground"}`}>
              {j ? `${j.gabungan ? "Jadwal gabungan · " : ""}${rentang ? `${rentang} · ` : ""}${j.langkah} langkah` : "Belum ada jadwal"}
            </span>
            {bolehUbah ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary">
                {j ? "Ubah" : "Buat"} <ChevronRight className="size-4" />
              </span>
            ) : null}
          </>
        );
        return (
          <li key={t}>
            {bolehUbah ? (
              <Link href={`/jadwal-masak/${j?.gabungan ? "gabungan" : kunci}?tgl=${t}`} className="flex min-h-11 items-center gap-3 py-2 text-[0.9375rem] hover:text-primary-strong">
                {isi}
              </Link>
            ) : (
              <div className="flex min-h-11 items-center gap-3 py-2 text-[0.9375rem]">{isi}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
