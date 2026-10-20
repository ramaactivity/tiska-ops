import { describe, expect, it } from "vitest";

import { BAWAAN } from "../pengaturan-bisnis";
import { hitungRefund } from "./pembatalan-event";

const hitung = (tanggalBatal: string, dibayar = 10_000_000) => hitungRefund({ tanggalAcara: "2026-12-20", tanggalBatal, dibayar, aturan: BAWAAN.pembatalan });

describe("refund pembatalan (S&K Bag. X)", () => {
  it("batas tiap tingkat", () => {
    expect(hitung("2026-09-21")).toMatchObject({ hari: 90, pct: 100, refund: 10_000_000, ditahan: 0 });
    expect(hitung("2026-09-22")).toMatchObject({ hari: 89, pct: 70, refund: 7_000_000, ditahan: 3_000_000 });
    expect(hitung("2026-11-05")).toMatchObject({ hari: 45, pct: 70 });
    expect(hitung("2026-11-06")).toMatchObject({ hari: 44, pct: 50, refund: 5_000_000 });
    expect(hitung("2026-11-20")).toMatchObject({ hari: 30, pct: 50 });
    expect(hitung("2026-11-21")).toMatchObject({ hari: 29, pct: 0, refund: 0, ditahan: 10_000_000 });
    expect(hitung("2026-12-25")).toMatchObject({ hari: -5, pct: 0 });
  });

  it("rupiah bulat & dana boleh dipakai sampai +3 bulan", () => {
    expect(hitung("2026-10-01", 1_234_567)).toMatchObject({ pct: 70, refund: 864_197, ditahan: 370_370 });
    expect(hitung("2026-11-30").berlakuSampai).toBe("2027-02-28");
    expect(hitung("2026-10-20").berlakuSampai).toBe("2027-01-20");
  });
});
