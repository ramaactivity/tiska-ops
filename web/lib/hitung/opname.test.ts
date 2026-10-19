import { describe, expect, it } from "vitest";

import { labelPeriode, periodeOpname, selisihOpname } from "./opname";

describe("opname", () => {
  it("selisih & batas 5%", () => {
    const r = (s: number, h: number) => {
      const x = selisihOpname(s, h);
      return [x.selisih.toNumber(), x.persen?.toFixed(1) ?? null, x.wajibAlasan];
    };
    expect(r(1000, 1000)).toEqual([0, "0.0", false]);
    expect(r(1000, 950)).toEqual([-50, "5.0", false]); // pas 5% → belum wajib
    expect(r(1000, 940)).toEqual([-60, "6.0", true]);
    expect(r(200, 230)).toEqual([30, "15.0", true]);
    expect(r(0, 5)).toEqual([5, null, true]); // sistem 0 tapi ada barang
    expect(r(-20, 0)).toEqual([20, null, true]); // catatan minus
    expect(r(0, 0)).toEqual([0, "0.0", false]);
  });

  it("periode = tanggal 1 bulan itu", () => {
    expect(periodeOpname("2026-10-19")).toBe("2026-10-01");
    expect(labelPeriode("2026-11-01")).toBe("November 2026");
  });
});
