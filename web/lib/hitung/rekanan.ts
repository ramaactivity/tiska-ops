/* ==========================================================================
   CUSTOMER & REKANAN (D-132) — murni. Jenis klien, jenis rekanan, Partner Fee.
   ========================================================================== */

import { kemiripanNama, rapikanTeks } from "../cari-mirip";
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

/** Kata sapaan & bentuk usaha yang tidak membedakan customer ("PT. Amerta" = "PT Amerta" = "Amerta"). */
const SAPAAN = /\b(pt|cv|ud|pd|tbk|persero|ibu|bu|bapak|bpk|bp|pak|mbak|mba|mas|kak|dr|drs|hj|h)\b/g;
const intiNama = (nama: string) => rapikanTeks(nama).replace(SAPAAN, " ").replace(/\s+/g, " ").trim();

/**
 * Customer yang namanya sama/mirip dengan nama baru (D-201) — supaya "Telkomsat" tidak terdaftar dua kali.
 * Sama persis setelah sapaan/bentuk usaha dibuang, atau kata intinya ≥ 80% sama.
 */
export function customerMirip<T extends { nama: string }>(nama: string, daftar: T[], batas = 3): T[] {
  const k = intiNama(nama);
  if (k.length < 3) return [];
  return daftar
    .map((x) => ({ x, skor: intiNama(x.nama) === k ? 1 : kemiripanNama(intiNama(x.nama), k, false) }))
    .filter((c) => c.skor >= 0.8)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, batas)
    .map((c) => c.x);
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

/** Dari mana order datang — diisi di awal form quotation (D-137). Tidak tercetak ke klien. */
export const SUMBER_ORDER = {
  langsung: "Langsung",
  rekanan: "Rekanan (EO/WO/vendor)",
  relasi: "Relasi / kenalan",
  repeat: "Repeat order",
} as const;
export type SumberOrder = keyof typeof SUMBER_ORDER;
export const KANAL_LANGSUNG = ["WhatsApp", "Instagram", "TikTok", "Website", "Telepon", "Datang langsung"] as const;

/** Kategori vendor & supplier (D-133) — yang dibeli/disewa Tiska. */
export const KATEGORI_VENDOR = {
  bahan_baku: "Bahan baku",
  roti_kue: "Roti & kue",
  sewa_mobil: "Sewa mobil",
  sewa_alat: "Sewa alat makan & perlengkapan",
  venue: "Venue",
  dekorasi: "Dekorasi",
  tenaga: "Tenaga tambahan",
  cetak_kemasan: "Percetakan & kemasan",
  lainnya: "Lainnya",
} as const;
export type KategoriVendor = keyof typeof KATEGORI_VENDOR;
