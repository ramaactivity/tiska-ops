import { describe, expect, it } from "vitest";

import { alokasiBelanja, barisBiayaRekap } from "./rekap-event";

describe("rekap event", () => {
  it("belanja PR dibagi rata antar event; dibulatkan per nota", () => {
    expect(alokasiBelanja([{ total: 300_000, jumlahEvent: 1 }]).toNumber()).toBe(300_000);
    expect(alokasiBelanja([{ total: "100000", jumlahEvent: 3 }, { total: 50_000, jumlahEvent: 1 }]).toNumber()).toBe(33_333 + 50_000);
    expect(alokasiBelanja([{ total: 10_000, jumlahEvent: 0 }]).toNumber()).toBe(10_000);
    expect(alokasiBelanja([]).toNumber()).toBe(0);
  });

  it("baris biaya per kategori; yang nol tidak ditulis", () => {
    expect(barisBiayaRekap({ bahan: "1250000.4", honor: 0, sewa: 500_000 }).map((b) => [b.category, b.amount.toNumber()])).toEqual([
      ["hpp_bahan_baku", 1_250_000],
      ["sewa_peralatan", 500_000],
    ]);
  });
});
