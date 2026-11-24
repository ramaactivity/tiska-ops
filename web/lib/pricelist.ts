/* ==========================================================================
   PUSTAKA PRICELIST — label & teks, murni (D-035).
   ========================================================================== */

export const LABEL_WILAYAH: Record<string, string> = { bogor: "Bogor", jakarta: "Jakarta", semua: "Bogor & Jakarta" };
export const LABEL_BASIS: Record<string, string> = { nett: "Harga nett", plus_plus: "Harga ++ (belum pajak & layanan)" };

/** "Rp" bukan di sini — ini ukuran berkas: 1.771.458 → "1,8 MB". */
export function ukuranBerkas(byte: number | bigint): string {
  const n = Number(byte);
  return n >= 1e6 ? `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`;
}

/** Jalur berkas di bucket "pricelist". */
export function jalurBerkas(code: string, versi: number, jenis: "asli" | "ringan"): string {
  return `${code}/v${versi}-${jenis}.pdf`;
}
