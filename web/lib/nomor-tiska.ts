/* ==========================================================================
   FORMAT NOMOR TISKA (02-ATURAN-BISNIS §12, D-007, D-042). Murni.

   <JENIS>/TC/<YYMM>/<NNN>[-R<n>] — QUO/TC/2610/006-R2. Urut per bulan per
   jenis (mulai 001), bulan menurut WIB. Revisi pertama = "-R2"; versi asli
   tanpa akhiran. Nomor lama (QUO-2026-0001, 06/QUO-TC/10/26) tidak diubah.
   ========================================================================== */

export type JenisNomor = "QUO" | "INV" | "KWT" | "PR" | "BLJ" | "PO" | "BAST";

/** "QUO/TC/2610/" untuk tanggal itu menurut jam Jakarta. */
export function awalanNomor(jenis: JenisNomor, saat: Date): string {
  const [{ value: tahun }, , { value: bulan }] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
  }).formatToParts(saat);
  return `${jenis}/TC/${tahun}${bulan}/`;
}

/** Nomor untuk revisi ke-n (0 = versi asli): base tanpa akhiran lama + "-R(n+1)". */
export function nomorRevisi(nomor: string, revisi: number): string {
  const dasar = nomor.replace(/-R\d+$/, "");
  return revisi > 0 ? `${dasar}-R${revisi + 1}` : dasar;
}

/** Judul halaman cetak = nama berkas "Save as PDF": QUO/TC/2610/006-R2 → QUO-TC-2610-006-R2. */
export function namaBerkasCetak(nomor: string): string {
  return nomor.replace(/[\\/:*?"<>|\s]+/g, "-");
}
