import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   PO SUPPLIER TEMPO & HUTANG DAGANG (09-PURCHASING §2, D-083). Murni.
   ========================================================================== */

/** "2026-10-19" + 14 hari → "2026-11-02". */
export function jatuhTempo(tanggal: string, hari: number): string {
  return new Date(Date.parse(`${tanggal}T00:00:00Z`) + hari * 86_400_000).toISOString().slice(0, 10);
}

export function sisaTerima(qty: NilaiUang, diterima: NilaiUang): Decimal {
  return Decimal.max(0, d(qty).minus(d(diterima)));
}

/** Sesudah penerimaan: semua baris lengkap → "diterima", selain itu "sebagian". */
export function statusPoSesudahTerima(baris: { qty: NilaiUang; diterima: NilaiUang }[]): "diterima" | "sebagian" {
  return baris.every((b) => sisaTerima(b.qty, b.diterima).isZero()) ? "diterima" : "sebagian";
}

export type KeadaanHutang = "lunas" | "batal" | "lewat" | "segera" | "belum";

/** Lewat jatuh tempo, jatuh tempo ≤ 3 hari lagi ("segera"), atau masih lama. */
export function keadaanHutang(status: string, jatuh: string, hariIni: string): KeadaanHutang {
  if (status === "lunas" || status === "batal") return status;
  if (jatuh < hariIni) return "lewat";
  return jatuh <= jatuhTempo(hariIni, 3) ? "segera" : "belum";
}

const angka = (n: NilaiUang) => d(n).toNumber().toLocaleString("id-ID", { maximumFractionDigits: 3 });

/**
 * Pesan PO untuk WA supplier — disalin & dikirim admin sendiri (tidak ada
 * pesan keluar otomatis). Gaya admin di HP: pendek, tanpa basa-basi AI.
 */
export function teksPesanPo(po: {
  nomor: string;
  kontak: string | null;
  tanggalKirim: string | null;
  baris: { nama: string; qty: NilaiUang; satuan: string | null }[];
  catatan: string | null;
}): string {
  const tgl = po.tanggalKirim
    ? new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${po.tanggalKirim}T00:00:00Z`))
    : null;
  return [
    `Halo${po.kontak ? ` ${po.kontak}` : ""}, ini pesanan dari Tiska Catering (${po.nomor}):`,
    "",
    ...po.baris.map((b, i) => `${i + 1}. ${b.nama} — ${angka(b.qty)}${b.satuan ? ` ${b.satuan}` : ""}`),
    "",
    ...(tgl ? [`Mohon dikirim ${tgl}.`] : []),
    ...(po.catatan ? [po.catatan] : []),
    "Mohon konfirmasi ketersediaan dan harganya ya. Terima kasih.",
  ].join("\n");
}
