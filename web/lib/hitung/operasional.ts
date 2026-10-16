import { menitMenuju } from "../tim";

/* ==========================================================================
   OPERASIONAL HARI INI — peringatan per event (01-SPEC G, D-058). Murni.
   ========================================================================== */

export type KloterOps = {
  no: number;
  jam: string;
  adaCaptain: boolean;
  anggota: number;
  belumSiap: number;
  status: string[]; // dimasak/packing/siap/berangkat/tiba/selesai
};

export type EventOps = { tanggal: string; kloter: KloterOps[]; status: string };

export function peringatanEvent(e: EventOps, sekarang: Date): string[] {
  if (e.status === "batal" || e.status === "selesai") return [];
  const p: string[] = [];
  if (!e.kloter.length) p.push("Belum ada kloter & tim");
  for (const k of e.kloter) {
    const nama = `Kloter ${k.no} (${k.jam})`;
    if (!k.anggota) p.push(`${nama}: belum ada anggota`);
    else if (!k.adaCaptain) p.push(`${nama}: tanpa captain`);
    if (k.belumSiap) p.push(`${nama}: ${k.belumSiap} orang belum "Siap 👍"`);
    const menit = menitMenuju(e.tanggal, k.jam, sekarang);
    const berangkat = k.status.includes("berangkat");
    if (menit !== null && menit < 0 && !berangkat) p.push(`${nama}: lewat jam berangkat, belum berangkat`);
    else if (menit !== null && menit <= 15 && !berangkat && !k.status.includes("siap")) p.push(`${nama}: ${menit} menit lagi, dapur belum "Siap angkut"`);
  }
  return p;
}
