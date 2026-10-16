/* ==========================================================================
   KODE MASTER DATA — kode berikutnya untuk resep (MC1-001), bahan (Gcs-001),
   dan paket (BS-1, PR-01). Murni: pemanggil memberi daftar kode lama.
   ========================================================================== */

/**
 * Angka terbesar di belakang `awalan` + 1. Lebar angka mengikuti data lama
 * (lebar tersempit yang dipakai: BS-1 → BS-25, PR-01 → PR-21, MC1-001 →
 * MC1-548); tanpa data lama dipakai 3 digit.
 */
export function kodeBerikutnya(awalan: string, kodeLama: string[]): string {
  let maks = 0;
  let lebar = Infinity;
  for (const k of kodeLama) {
    if (!k.startsWith(awalan)) continue;
    const ekor = k.slice(awalan.length);
    if (!/^\d+$/.test(ekor)) continue;
    maks = Math.max(maks, Number(ekor));
    lebar = Math.min(lebar, ekor.length);
  }
  return awalan + String(maks + 1).padStart(Number.isFinite(lebar) ? lebar : 3, "0");
}

/** Awalan kode sebuah kode lama: "BS-12" → "BS-". */
export const awalanKode = (kode: string) => kode.replace(/\d+$/, "");
