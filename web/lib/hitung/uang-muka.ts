import { Decimal } from "decimal.js";

import { bulatkanRupiah, d, rupiah, type NilaiUang } from "../uang";

/* ==========================================================================
   UANG MUKA BELANJA / Daily Market (09-PURCHASING §2, D-081). Murni.

   Saldo pemegang = top up − belanja − pengembalian (yang tidak dibatalkan).
   Saldo TIDAK BOLEH minus: uang keluar ditolak bila melebihi saldo
   (PROFIL-RAMA §12, guard di setiap alur uang keluar).
   ========================================================================== */

export type JenisMutasi = "topup" | "belanja" | "pengembalian";

export const LABEL_MUTASI: Record<JenisMutasi, string> = {
  topup: "Dana masuk dari Finance",
  belanja: "Belanja",
  pengembalian: "Sisa dikembalikan",
};

export function saldoUangMuka(mutasi: { kind: string; amount: NilaiUang; status: string }[]): Decimal {
  return mutasi
    .filter((m) => m.status === "posted")
    .reduce((s, m) => (m.kind === "topup" ? s.plus(d(m.amount)) : s.minus(d(m.amount))), new Decimal(0));
}

/** Nilai satu baris nota (qty × harga, dibulatkan ke rupiah) dan total nota. */
export function nilaiBarisNota(qty: NilaiUang, harga: NilaiUang): Decimal {
  return bulatkanRupiah(d(qty).times(d(harga)));
}

export function totalNota(baris: { qty: NilaiUang; harga: NilaiUang }[]): Decimal {
  return baris.reduce((s, b) => s.plus(nilaiBarisNota(b.qty, b.harga)), new Decimal(0));
}

/** Pesan penolakan bila uang keluar melebihi saldo; null bila aman. */
export function cekSaldoCukup(saldo: NilaiUang, keluar: NilaiUang): string | null {
  const kurang = d(keluar).minus(d(saldo));
  return kurang.gt(0)
    ? `Saldo uang muka tidak cukup: sisa ${rupiah(saldo)}, butuh ${rupiah(keluar)} (kurang ${rupiah(kurang)}). Minta Finance menambah dana dulu.`
    : null;
}
