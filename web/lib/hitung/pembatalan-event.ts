import type { PengaturanBisnis } from "../pengaturan-bisnis";

/* ==========================================================================
   REFUND PEMBATALAN EVENT (S&K Bag. X, 02-ATURAN-BISNIS §7, D-102). Murni.

   Atas uang yang SUDAH dibayar klien, menurut jarak tanggal batal ke
   tanggal acara pertama: ≥ H-90 100%, H-45–89 70%, H-30–44 50%, < H-30
   hangus. Angkanya dari Angka Bisnis. Sisa yang tidak dikembalikan boleh
   dipakai pesanan lain sampai batal + 3 bulan.
   ========================================================================== */

export type HasilRefund = { hari: number; pct: number; refund: number; ditahan: number; berlakuSampai: string };

export function hitungRefund(x: { tanggalAcara: string; tanggalBatal: string; dibayar: number; aturan: PengaturanBisnis["pembatalan"] }): HasilRefund {
  const a = x.aturan;
  const hari = Math.round((Date.parse(`${x.tanggalAcara}T00:00:00Z`) - Date.parse(`${x.tanggalBatal}T00:00:00Z`)) / 86_400_000);
  const pct = hari >= a.penuh_hari ? 100 : hari >= a.tingkat2_hari ? a.tingkat2_pct : hari >= a.tingkat3_hari ? a.tingkat3_pct : 0;
  const refund = Math.round((x.dibayar * pct) / 100);
  // +n bulan, tanggal dipotong ke akhir bulan (30 Nov + 3 bulan = 28 Feb, bukan 2 Mar).
  const [th, bl, tg] = x.tanggalBatal.split("-").map(Number);
  const akhirBulan = new Date(Date.UTC(th, bl - 1 + a.deposit_bulan + 1, 0)).getUTCDate();
  const sampai = new Date(Date.UTC(th, bl - 1 + a.deposit_bulan, Math.min(tg, akhirBulan)));
  return { hari, pct, refund, ditahan: x.dibayar - refund, berlakuSampai: sampai.toISOString().slice(0, 10) };
}
