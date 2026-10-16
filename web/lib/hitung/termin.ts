import { Decimal } from "decimal.js";

import { d, type NilaiUang } from "../uang";

/* ==========================================================================
   JADWAL TERMIN (02-ATURAN-BISNIS §6, D-016, D-046). Murni.

   Booking fee (saat pemesanan) → DP sampai X% dari total (H-30) →
   pelunasan (H-14). Booking fee DIHITUNG sebagai bagian DP, jadi DP yang
   ditagih = X% total − booking fee. Status tiap termin dibaca dari uang yang
   sudah masuk secara kumulatif (pembayaran menutup termin dari yang awal).
   ========================================================================== */

export type AturanTermin = { booking_fee: number; dp_pct: number; dp_hari_sebelum_acara: number; pelunasan_hari_sebelum_acara: number };
export type StatusTermin = "lunas" | "sebagian" | "terlambat" | "menunggu";
export type BarisTermin = { label: string; nominal: Decimal; jatuhTempo: Date | null; status: StatusTermin };

const SEHARI = 86_400_000;
const mundur = (t: Date, hari: number) => new Date(t.getTime() - hari * SEHARI);

export function jadwalTermin(m: {
  total: NilaiUang;
  dibayar: NilaiUang;
  tanggalAcara: Date | null;
  aturan: AturanTermin;
  hariIni?: Date;
}): BarisTermin[] {
  const total = d(m.total);
  if (total.lte(0)) return [];
  const booking = Decimal.min(total, m.aturan.booking_fee);
  const dp = Decimal.max(0, total.times(m.aturan.dp_pct).dividedBy(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).minus(booking));
  const pelunasan = total.minus(booking).minus(dp);
  const acara = m.tanggalAcara;
  const rencana: [string, Decimal, Date | null][] = [
    ["Booking fee", booking, null],
    [`DP ${m.aturan.dp_pct}%`, dp, acara ? mundur(acara, m.aturan.dp_hari_sebelum_acara) : null],
    ["Pelunasan", pelunasan, acara ? mundur(acara, m.aturan.pelunasan_hari_sebelum_acara) : null],
  ];
  const hariIni = m.hariIni ?? new Date();
  let sisaBayar = d(m.dibayar);
  return rencana
    .filter(([, n]) => n.gt(0))
    .map(([label, nominal, jatuhTempo]) => {
      const tertutup = Decimal.min(sisaBayar, nominal);
      sisaBayar = sisaBayar.minus(tertutup);
      const status: StatusTermin = tertutup.gte(nominal)
        ? "lunas"
        : jatuhTempo && jatuhTempo < hariIni
          ? "terlambat"
          : tertutup.gt(0)
            ? "sebagian"
            : "menunggu";
      return { label, nominal, jatuhTempo, status };
    });
}
