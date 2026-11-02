/* ==========================================================================
   PENGINGAT BAYAR (D-128) — murni. Tagihan kantor rutin & sekali bayar.
   Tanggal berupa "YYYY-MM-DD" (hari WIB).
   ========================================================================== */

export const KATEGORI_TAGIHAN = {
  internet: "Internet & telepon",
  listrik: "Listrik",
  air: "Air",
  sewa: "Sewa",
  pajak: "Pajak",
  bpjs: "BPJS & asuransi",
  crew: "Crew & honor",
  langganan: "Langganan aplikasi",
  cicilan: "Cicilan",
  lainnya: "Lainnya",
} as const;
export type KategoriTagihan = keyof typeof KATEGORI_TAGIHAN;

/** "0" = sekali bayar. */
export const ULANGI = { "0": "Sekali", "1": "Tiap bulan", "3": "Tiap 3 bulan", "6": "Tiap 6 bulan", "12": "Tiap tahun" } as const;

/** Tagihan pasti yang paling sering — satu ketukan mengisi nama, kategori, dan ulangi. */
export const CONTOH_TAGIHAN: { nama: string; kategori: KategoriTagihan; ulangi: keyof typeof ULANGI }[] = [
  { nama: "Wifi kantor", kategori: "internet", ulangi: "1" },
  { nama: "Listrik PLN", kategori: "listrik", ulangi: "1" },
  { nama: "Air PDAM", kategori: "air", ulangi: "1" },
  { nama: "BPJS", kategori: "bpjs", ulangi: "1" },
  { nama: "Setor & lapor PBJT", kategori: "pajak", ulangi: "1" },
  { nama: "Sewa tempat", kategori: "sewa", ulangi: "12" },
];

const tgl = (s: string) => new Date(`${s}T00:00:00Z`);

/** Jatuh tempo periode berikutnya: maju `bulan` bulan, tanggal tetap `tanggalTetap` (31 → akhir bulan untuk bulan pendek). */
export function jatuhTempoBerikut(dari: string, bulan: number, tanggalTetap: number): string {
  const d = tgl(dari);
  const tahun = d.getUTCFullYear();
  const b = d.getUTCMonth() + bulan;
  const akhir = new Date(Date.UTC(tahun, b + 1, 0)).getUTCDate();
  return new Date(Date.UTC(tahun, b, Math.min(tanggalTetap, akhir))).toISOString().slice(0, 10);
}

export function sisaHari(jatuhTempo: string, hariIni: string): number {
  return Math.round((tgl(jatuhTempo).getTime() - tgl(hariIni).getTime()) / 86_400_000);
}

export type KeadaanTagihan = "lewat" | "hari-ini" | "segera" | "nanti";

/** "segera" = sudah masuk masa pengingat (H-`ingatkan`). */
export function keadaanTagihan(sisa: number, ingatkan: number): KeadaanTagihan {
  return sisa < 0 ? "lewat" : sisa === 0 ? "hari-ini" : sisa <= ingatkan ? "segera" : "nanti";
}

export function labelSisa(sisa: number): string {
  if (sisa < 0) return `lewat ${-sisa} hari`;
  if (sisa === 0) return "hari ini";
  if (sisa === 1) return "besok";
  return `${sisa} hari lagi`;
}

const rp = (n: number) => `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(n))}`;

/** Push pagi: tagihan yang sudah masuk masa pengingat / lewat, urut paling mendesak. */
export function pesanPengingatBayar(daftar: { nama: string; sisa: number; nominal: number | null }[]): { judul: string; isi: string; url: string; tag: string } | null {
  if (!daftar.length) return null;
  const urut = [...daftar].sort((a, b) => a.sisa - b.sisa);
  const lewat = urut.filter((x) => x.sisa < 0).length;
  const baris = urut.slice(0, 4).map((x) => `${x.nama} (${labelSisa(x.sisa)}${x.nominal ? `, ${rp(x.nominal)}` : ""})`);
  return {
    judul: lewat ? `⚠️ ${lewat} tagihan lewat jatuh tempo` : `🔔 ${urut.length} tagihan perlu dibayar`,
    isi: `${baris.join(" · ")}${urut.length > 4 ? ` · +${urut.length - 4} lagi` : ""}`,
    url: "/pengingat-bayar",
    tag: "pengingat-bayar",
  };
}
