import type { KategoriBiaya } from "../biaya";

/* Biaya Sewa per event (D-147). Murni — dipakai server & browser. */

export const JENIS_SEWA = {
  alat_makan: { label: "Alat makan & buffet", kategori: "sewa_peralatan" },
  tenda: { label: "Tenda", kategori: "sewa_peralatan" },
  kendaraan: { label: "Kendaraan", kategori: "transportasi" },
  venue: { label: "Venue / tempat", kategori: "vendor" },
  dekorasi: { label: "Dekorasi", kategori: "bunga_dekorasi" },
  lain: { label: "Lain-lain", kategori: "sewa_peralatan" },
} as const satisfies Record<string, { label: string; kategori: KategoriBiaya }>;

export type JenisSewa = keyof typeof JENIS_SEWA;

/** Keterangan baris Margin — satu bentuk untuk semua tempat. */
export function keteranganSewa(jenis: JenisSewa, vendor: string | null): string {
  return `Sewa ${JENIS_SEWA[jenis].label.toLowerCase()}${vendor ? ` · ${vendor}` : ""}`;
}
