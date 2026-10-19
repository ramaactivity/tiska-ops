import Link from "next/link";

import { penggunaAktif } from "@/lib/auth";
import { LABEL_REKAP, type StatusRekap } from "@/lib/hitung/rekap-event";
import { bolehLihatBiaya } from "@/lib/peran";

import { TombolAjukanRekap } from "./tombol-ajukan-rekap";

/** Status rekap di halaman event (D-092): tim mengajukan, owner/Finance membuka rekap (berisi biaya). */
export async function RekapEvent({ idEvent, status }: { idEvent: string; status: string | null }) {
  const sesi = await penggunaAktif();
  if (!sesi) return null;
  const biaya = bolehLihatBiaya(sesi.peran);
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-[14px] border bg-card p-5">
      <div className="mr-auto">
        <h2 className="eyebrow">Rekap event</h2>
        <p className="text-sm text-muted-foreground">
          {status ? LABEL_REKAP[status as StatusRekap] : "Sesudah acara: alat kembali & absen tim terkirim, lalu ajukan rekap ke Finance."}
        </p>
      </div>
      {!status ? <TombolAjukanRekap id={idEvent} /> : null}
      {biaya ? (
        <Link href={`/event/${idEvent}/rekap`} className="inline-flex h-10 items-center rounded-[10px] border px-4 text-sm font-medium hover:bg-accent">
          Buka rekap
        </Link>
      ) : null}
    </section>
  );
}
