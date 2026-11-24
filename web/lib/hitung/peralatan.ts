import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   PERALATAN (09-PURCHASING §6, D-089). Murni.
   ========================================================================== */

/** Sama dengan CHECK di scripts/tambah-tabel-peralatan.mjs. */
export const KATEGORI_ALAT = [
  "Penghangat",
  "Piring & alat makan",
  "Gelas",
  "Alat saji",
  "Meja, taplak & runner",
  "Kursi",
  "Dekor & vas bunga",
  "Napkin & placemat",
  "Pitcher",
  // Daftar gudang Tya 24 Nov 2026 (D-225): alat dapur & alat angkut/simpan milik sendiri, bukan disewakan ke klien.
  "Alat dapur",
  "Angkut & simpan",
  "Lainnya",
] as const;

/**
 * Tebakan kategori dari nama alat yang ditulis sendiri di dokumen (D-218) — Mas Reza tetap bisa memindahkannya di
 * Peralatan. Urutan penting: "taplak meja" → meja/taplak, bukan piring.
 */
export function kategoriAlatDariNama(nama: string): (typeof KATEGORI_ALAT)[number] {
  const n = nama.toLowerCase();
  const aturan: [RegExp, (typeof KATEGORI_ALAT)[number]][] = [
    [/chafing|chaving|pemanas|penghangat|warmer/, "Penghangat"],
    [/kursi|futura|chair/, "Kursi"],
    [/meja|taplak|runner|skirting|table cover|round table/, "Meja, taplak & runner"],
    [/vas|bunga|dekor|centerpiece|center piece|rangkai|backdrop/, "Dekor & vas bunga"],
    [/napkin|placemat/, "Napkin & placemat"],
    [/pitcher|teko/, "Pitcher"],
    [/gelas|goblet|cangkir|mug|cup/, "Gelas"],
    [/piring|sendok|garpu|mangkok|mangkuk|disposable/, "Piring & alat makan"],
    [/nampan|tray|capit|sendok saji|alat saji|dispenser|jug/, "Alat saji"],
    [/kompor|dandang|microwave|toaster|oven|talenan|pisau|wajan|panci|boiler|juicer|blender/, "Alat dapur"],
    [/troli|troley|trolley|container|kontainer|cool ?box|thinwall/, "Angkut & simpan"],
  ];
  return aturan.find(([pola]) => pola.test(n))?.[1] ?? "Lainnya";
}

/** Yang bisa dibawa: milik − rusak − yang sedang dipakai event lain di tanggal sama. null = belum dihitung. */
export function alatTersedia(milik: number | null, rusak: number, dipakaiLain: number): number | null {
  return milik === null ? null : Math.max(0, milik - rusak - dipakaiLain);
}

/** Saat kembali: baik = keluar − rusak − hilang; tidak boleh minus. */
export function hitungKembali(keluar: number, rusak: number, hilang: number): { baik: number } | { galat: string } {
  if (rusak < 0 || hilang < 0 || !Number.isInteger(rusak) || !Number.isInteger(hilang)) return { galat: "Jumlah rusak/hilang harus bilangan bulat ≥ 0." };
  if (rusak + hilang > keluar) return { galat: `Rusak + hilang (${rusak + hilang}) melebihi yang dibawa (${keluar}).` };
  return { baik: keluar - rusak - hilang };
}

export type BarisAlatEvent = {
  milikSendiri: boolean;
  qty: number;
  rusak: number;
  hilang: number;
  biayaSewa: NilaiUang | null;
  hargaGanti: NilaiUang | null;
};

/** Rekap per event: milik vs sewaan, biaya sewa vendor, nilai ganti rugi (rusak+hilang × harga ganti). */
export function rekapAlatEvent(baris: BarisAlatEvent[]) {
  let biayaSewa = new Decimal(0);
  let gantiRugi = new Decimal(0);
  let gantiTanpaHarga = 0;
  for (const b of baris) {
    if (!b.milikSendiri && b.biayaSewa != null) biayaSewa = biayaSewa.plus(d(b.biayaSewa));
    const kena = b.rusak + b.hilang;
    if (kena > 0) {
      if (b.hargaGanti == null) gantiTanpaHarga++;
      else gantiRugi = gantiRugi.plus(d(b.hargaGanti).times(kena));
    }
  }
  return {
    milik: baris.filter((b) => b.milikSendiri).length,
    sewaan: baris.filter((b) => !b.milikSendiri).length,
    biayaSewa,
    gantiRugi,
    gantiTanpaHarga,
  };
}
