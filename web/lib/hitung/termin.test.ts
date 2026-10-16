import { describe, expect, it } from "vitest";

import { BAWAAN } from "../pengaturan-bisnis";
import { jadwalTermin } from "./termin";

const acara = new Date("2026-12-20T00:00:00Z");
const ringkas = (r: ReturnType<typeof jadwalTermin>) => r.map((x) => [x.label, x.nominal.toFixed(0), x.jatuhTempo?.toISOString().slice(0, 10) ?? null, x.status]);

describe("jadwal termin (D-016)", () => {
  it("PDGI 14,8 jt: booking 5 jt → DP 2,4 jt (H-30) → pelunasan 7,4 jt (H-14)", () => {
    expect(ringkas(jadwalTermin({ total: 14_800_000, dibayar: 0, tanggalAcara: acara, aturan: BAWAAN.termin, hariIni: new Date("2026-10-16") }))).toEqual([
      ["Booking fee", "5000000", null, "menunggu"],
      ["DP 50%", "2400000", "2026-11-20", "menunggu"],
      ["Pelunasan", "7400000", "2026-12-06", "menunggu"],
    ]);
  });

  it("dibayar 6 jt: booking lunas, DP sebagian; lewat H-30 tanpa lunas → terlambat", () => {
    const r = jadwalTermin({ total: 14_800_000, dibayar: 6_000_000, tanggalAcara: acara, aturan: BAWAAN.termin, hariIni: new Date("2026-11-25") });
    expect(r.map((x) => x.status)).toEqual(["lunas", "terlambat", "menunggu"]);
    const s = jadwalTermin({ total: 14_800_000, dibayar: 6_000_000, tanggalAcara: acara, aturan: BAWAAN.termin, hariIni: new Date("2026-11-01") });
    expect(s.map((x) => x.status)).toEqual(["lunas", "sebagian", "menunggu"]);
  });

  it("pesanan kecil (box 2,9 jt) → booking fee = seluruh nilai, tanpa DP/pelunasan", () => {
    expect(ringkas(jadwalTermin({ total: 2_975_000, dibayar: 0, tanggalAcara: null, aturan: BAWAAN.termin }))).toEqual([["Booking fee", "2975000", null, "menunggu"]]);
  });
});
