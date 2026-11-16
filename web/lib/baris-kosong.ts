/**
 * Baris yang benar-benar kosong — tanpa nama, tanpa harga, tanpa tautan paket/menu/produk, dan isinya (bila ada) juga
 * tanpa nama. Baris seperti ini DIBUANG saat simpan tanpa keluhan, sama seperti baris biaya tambahan yang kosong:
 * orang menekan "Tambah baris" lalu berubah pikiran. Dulu satu baris kosong di akhir menahan seluruh dokumen dengan
 * pesan yang tidak menyebut barisnya (Rama, 16 Nov 2026).
 *
 * Satu aturan untuk server (lib/dokumen.ts) dan formulir (rekap sebelum simpan). Modul kecil tanpa zod supaya aman
 * diimpor di browser.
 */
export function barisBenarKosong(b: unknown): boolean {
  const x = rekam(b);
  const isi = Array.isArray(x.children) ? x.children : [];
  return (
    teks(x.item_name) === "" &&
    teks(x.price) === "" &&
    !x.package_id &&
    !x.menu_id &&
    !x.product_id &&
    isi.every((a) => teks(rekam(a).item_name) === "")
  );
}

const rekam = (x: unknown): Record<string, unknown> => (x && typeof x === "object" ? (x as Record<string, unknown>) : {});
const teks = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
