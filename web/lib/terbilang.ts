/* ==========================================================================
   TERBILANG — angka rupiah jadi kata untuk kwitansi (06-DOKUMEN-QUOTATION §6,
   D-045). Murni. Hanya rupiah bulat (sen dibuang, kwitansi tidak memakainya).
   ========================================================================== */

const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function kata(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${SATUAN[n - 10]} Belas`;
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} Puluh ${kata(n % 10)}`.trim();
  if (n < 200) return `Seratus ${kata(n - 100)}`.trim();
  if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} Ratus ${kata(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${kata(n - 1000)}`.trim();
  const tingkat: [number, string][] = [
    [1e12, "Triliun"],
    [1e9, "Miliar"],
    [1e6, "Juta"],
    [1e3, "Ribu"],
  ];
  for (const [besar, nama] of tingkat) {
    if (n >= besar) return `${kata(Math.floor(n / besar))} ${nama} ${kata(n % besar)}`.trim();
  }
  return "";
}

/** 1.234.567 → "Satu Juta Dua Ratus Tiga Puluh Empat Ribu Lima Ratus Enam Puluh Tujuh Rupiah". */
export function terbilang(nilai: number | string): string {
  const n = Math.floor(Math.abs(Number(nilai)));
  if (!Number.isFinite(n)) return "";
  return `${n === 0 ? "Nol" : kata(n)} Rupiah`;
}
