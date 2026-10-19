import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   HONOR TIM & DW (02-ATURAN-BISNIS §10, 08-TIM-PWA §8, D-091). Murni.

   Tarif per peran tugas × status kerja (karyawan tetap vs freelance). Orang
   tanpa akun (DW) = freelance; akun tanpa status = tetap. Tidak hadir = 0.
   ========================================================================== */

export const STATUS_KERJA = { tetap: "Karyawan tetap", freelance: "Freelance / DW" } as const;
export type StatusKerja = keyof typeof STATUS_KERJA;

export const PEKERJAAN_DW = ["Waiter", "Clear-up", "Kitchen", "Steward", "Lainnya"] as const;

export const LABEL_HONOR = { diajukan: "Menunggu Finance", dikunci: "Belum dibayar", dibayar: "Sudah dibayar" } as const;
export type StatusHonor = keyof typeof LABEL_HONOR;

export function statusKerja(punyaAkun: boolean, statusAkun: string | null): StatusKerja {
  if (!punyaAkun) return "freelance";
  return statusAkun === "freelance" ? "freelance" : "tetap";
}

export type TarifHonor = { role: string; employment: string; amount: NilaiUang };

/** Fee usulan: tidak hadir = 0; tarif belum diisi = null (Finance mengisi manual). */
export function feeUsulan(tarif: TarifHonor[], peran: string, status: StatusKerja, hadir: boolean | null): number | null {
  if (hadir === false) return 0;
  const t = tarif.find((x) => x.role === peran && x.employment === status);
  return t ? d(t.amount).toNumber() : null;
}

/** "7.30" / "07:30" / "730" → "07.30"; selain itu null. */
export function rapikanJam(teks: string): string | null {
  const t = teks.trim().replace(":", ".");
  const m = t.match(/^(\d{1,2})\.?(\d{2})$/) ?? t.match(/^(\d{1,2})$/);
  if (!m) return null;
  const jam = Number(m[1]);
  const menit = Number(m[2] ?? 0);
  if (jam > 23 || menit > 59) return null;
  return `${String(jam).padStart(2, "0")}.${String(menit).padStart(2, "0")}`;
}
