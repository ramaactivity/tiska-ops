/* ==========================================================================
   CUSTOMER & REKANAN (D-132) — murni. Jenis klien, jenis rekanan, Partner Fee.
   ========================================================================== */

import { d, type NilaiUang } from "../uang";
import { partnerFee } from "./quotation";

/** Skala klien — dari perorangan beli satuan sampai instansi pemerintah. */
export const JENIS_KLIEN = {
  perorangan: "Perorangan",
  kelompok: "Kelompok / komunitas",
  perusahaan: "Perusahaan",
  organisasi: "Organisasi / yayasan / sekolah",
  instansi: "Instansi pemerintah",
} as const;
export type JenisKlien = keyof typeof JENIS_KLIEN;

const POLA_KLIEN: [JenisKlien, RegExp][] = [
  ["instansi", /\b(dinas|kementerian|kemen\w*|pemkot|pemkab|pemprov|pemerintah|kecamatan|kelurahan|desa|bappeda|bpbd|bpjs|dprd|setda|sekretariat|polres|polda|polsek|kodim|korem|tni|polri|kejaksaan|pengadilan|puskesmas|rsud|klhk|kantor wilayah|kanwil|badan)\b/i],
  ["perusahaan", /^(pt|cv|ud|pd|koperasi|bank)\b\.?|\b(tbk|persero)\b/i],
  ["organisasi", /\b(yayasan|sekolah|sd|smp|sma|smk|mi|mts|ma|universitas|institut|politeknik|kampus|pesantren|ponpes|masjid|musholla|gereja|organisasi|himpunan|ikatan|asosiasi|perkumpulan|partai|ormas|rumah sakit|klinik)\b/i],
  ["kelompok", /\b(arisan|komunitas|pengajian|majelis|majlis|paguyuban|keluarga besar|alumni|reuni|grup|group|club|klub|rt|rw|karang taruna|ibu-ibu|bapak-bapak)\b/i],
];

/** Tebakan awal jenis klien dari namanya; bisa diganti di form customer. */
export function tebakJenisKlien(nama: string): JenisKlien {
  return POLA_KLIEN.find(([, pola]) => pola.test(nama))?.[0] ?? "perorangan";
}

export const JENIS_REKANAN = {
  eo: "EO / Event Organizer",
  wo: "WO / Wedding Organizer",
  mc: "MC",
  venue: "Venue",
  dekorasi: "Dekorasi",
  dokumentasi: "Fotografer / Videografer",
  planner: "Planner / konsultan",
  komunitas: "Komunitas / organisasi",
  lainnya: "Lainnya",
} as const;
export type JenisRekanan = keyof typeof JENIS_REKANAN;

export type StatusPartnerFee = "dibayar" | "siap" | "menunggu";
export const LABEL_STATUS_FEE: Record<StatusPartnerFee, string> = { dibayar: "Sudah dibayar", siap: "Siap dibayar", menunggu: "Menunggu klien lunas" };

/** Partner Fee siap dibayar setelah klien LUNAS (jawaban Mas Reza, 13-PERTANYAAN-TERBUKA #14). */
export function statusPartnerFee(statusInvoice: string, sudahDibayar: boolean): StatusPartnerFee {
  return sudahDibayar ? "dibayar" : statusInvoice === "paid" ? "siap" : "menunggu";
}

/**
 * Partner Fee satu invoice = % rekanan (kosong → bawaan Angka Bisnis) × nilai makanan & minuman (subtotal baris
 * invoice, tanpa layanan, Delivery Fee, PBJT) — D-020.
 */
export function feeInvoice(subtotal: NilaiUang, pctRekanan: NilaiUang | null, pctBawaan: number): { pct: number; jumlah: number } {
  const pct = pctRekanan === null ? pctBawaan : Number(d(pctRekanan));
  return { pct, jumlah: Number(partnerFee(subtotal, pct)) };
}
