/* Cetakan (docs/19-CETAKAN.md, D-182): label, ukuran, dan teks pesan ke percetakan. Murni — dipakai halaman & tes. */

export const GRUP_CETAKAN = {
  nama_menu: "Nama menu",
  kartu_ucapan: "Kartu ucapan",
  stiker: "Stiker",
  label: "Label produk",
  sleeve: "Sleeve",
  dokumen: "Dokumen",
} as const;
export type GrupCetakan = keyof typeof GRUP_CETAKAN;

export const JENIS_CETAKAN = { stok: "Stok tetap", pesanan: "Per pesanan" } as const;
export type JenisCetakan = keyof typeof JENIS_CETAKAN;

/** "11 × 6,6 cm" / "Ø 7 cm" dari ukuran milimeter. */
export function labelUkuran(lebarMm: number | null, tinggiMm: number | null, bentuk: string): string {
  if (!lebarMm || !tinggiMm) return "Ukuran belum diisi";
  const cm = (mm: number) => (mm / 10).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (bentuk === "lingkaran" && lebarMm === tinggiMm) return `Ø ${cm(lebarMm)} cm`;
  return `${cm(lebarMm)} × ${cm(tinggiMm)} cm`;
}

export type BarisPesan = {
  /** Judul baris di chat, mis. "Sticker Tiska Besar 7x7cm". */
  judul: string;
  ukuran: string;
  bahan: string | null;
  finishing: string | null;
  /** Lembar A3 per varian; varian tanpa nama = cetakan tanpa varian. */
  jumlah: { varian: string | null; lembar: number }[];
  catatan?: string | null;
};

/** Total lembar A3 satu baris pesan. */
export const totalLembar = (b: BarisPesan) => b.jumlah.reduce((s, j) => s + (j.lembar > 0 ? j.lembar : 0), 0);

/**
 * Teks WhatsApp ke percetakan, persis gaya chat Rama ke Oke Print:
 *   Kak mau cetak
 *
 *   Sticker Tiska Besar 7x7cm
 *   Ukuran : Diameter 7 cm
 *   Bahan : Sticker Chromo glossy
 *   Qty : 10 Lembar A3
 *   Finishing : Half Cut …
 * Beberapa varian → "Qty : 6 Lembar A3 (Es Dawet Ireng 3, Sari Kedondong 3)". Baris tanpa jumlah dilewati.
 */
export function teksPesanCetak(baris: BarisPesan[]): string {
  const isi = baris
    .filter((b) => totalLembar(b) > 0)
    .map((b) => {
      const ada = b.jumlah.filter((j) => j.lembar > 0);
      const rincian = ada.some((j) => j.varian) && ada.length > 0 ? ` (${ada.map((j) => `${j.varian ?? "lainnya"} ${j.lembar}`).join(", ")})` : "";
      return [
        b.judul,
        `Ukuran : ${b.ukuran}`,
        b.bahan ? `Bahan : ${b.bahan}` : null,
        `Qty : ${totalLembar(b)} Lembar A3${rincian}`,
        b.finishing ? `Finishing : ${b.finishing}` : null,
        b.catatan ? b.catatan : null,
      ]
        .filter(Boolean)
        .join("\n");
    });
  return isi.length ? `Kak mau cetak\n\n${isi.join("\n\n")}` : "";
}

/** Tautan wa.me dengan teks terisi. Nomor diubah ke format internasional (08… → 628…). */
export function tautanWhatsApp(nomor: string | null | undefined, teks: string): string | null {
  const angka = (nomor ?? "").replace(/\D/g, "").replace(/^0/, "62");
  if (angka.length < 9) return null;
  return `https://wa.me/${angka}?text=${encodeURIComponent(teks)}`;
}

/** Perkiraan biaya: lembar × harga per A3 (null kalau harga belum diketahui). */
export const perkiraanBiaya = (lembar: number, hargaPerLembar: number | null) => (hargaPerLembar == null ? null : lembar * hargaPerLembar);

/* ---------- Tahap 2 (D-183): stok & permintaan cetak ---------- */

export const SATUAN_STOK = { lembar: "lembar", pcs: "pcs" } as const;
export type SatuanStok = keyof typeof SATUAN_STOK;

export type KeadaanStok = "belum" | "habis" | "menipis" | "aman";
/** Belum pernah dihitung = "belum" (bukan "habis": stok nol palsu menakut-nakuti dapur). */
export function keadaanStok(sisa: number | null, minimum: number | null): KeadaanStok {
  if (sisa == null) return "belum";
  if (sisa <= 0) return "habis";
  if (minimum != null && sisa <= minimum) return "menipis";
  return "aman";
}
export const LABEL_KEADAAN_STOK: Record<KeadaanStok, string> = { belum: "Stok belum dihitung", habis: "Habis", menipis: "Menipis", aman: "Aman" };

export const STATUS_PERMINTAAN = {
  diajukan: "Menunggu",
  perlu_tanya: "Perlu ditanya",
  disetujui: "Disetujui",
  dipesan: "Dipesan",
  menunggu_bayar: "Menunggu bayar",
  dibayar: "Dibayar",
  diambil: "Sudah diambil",
  ditolak: "Ditolak",
  batal: "Dibatalkan",
} as const;
export type StatusPermintaan = keyof typeof STATUS_PERMINTAAN;
/** Status yang masih berjalan (belum selesai/ditutup). */
export const PERMINTAAN_BERJALAN: StatusPermintaan[] = ["diajukan", "perlu_tanya", "disetujui", "dipesan", "menunggu_bayar", "dibayar"];

/** Lembar A3 yang diambil → tambahan stok dalam satuan stok cetakan (pcs = lembar × isi per A3). */
export function tambahanStok(lembar: number, satuan: string, isiPerA3: number | null): number {
  return satuan === "pcs" ? lembar * (isiPerA3 ?? 1) : lembar;
}

/** Ringkasan isi permintaan untuk notifikasi: "Label Minuman Kecil (Es Dawet Ireng) 3 lbr, Stiker Bulat 7 cm 10 lbr". */
export function ringkasPermintaan(baris: { nama: string; varian: string | null; lembar: number }[], maks = 3): string {
  const teks = baris.slice(0, maks).map((b) => `${b.nama}${b.varian ? ` (${b.varian})` : ""} ${b.lembar} lbr`);
  return teks.join(", ") + (baris.length > maks ? ` +${baris.length - maks} lagi` : "");
}
