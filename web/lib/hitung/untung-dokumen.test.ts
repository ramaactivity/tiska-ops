import { describe, expect, it } from "vitest";

import { keputusanPersetujuan, untungDokumen } from "./untung-dokumen";

const batas = { untungAmanPct: 35, untungMinPct: 30 };

describe("untung makanan quotation", () => {
  it("BS-15 40 box @48.500, HPP 27.099,33 → 44,1% aman; buffet manual tidak dinilai", () => {
    const h = untungDokumen(
      [
        { nilai: 1940000, porsi: 40, hppPorsi: "27099.33" },
        { nilai: 5310000, porsi: 60 }, // Dinner buffet diketik manual — HPP tak diketahui
      ],
      batas,
    );
    expect(h.hpp.toFixed(2)).toBe("1083973.20");
    expect(h.pct?.toFixed(1)).toBe("44.1");
    expect(h.pita).toBe("aman");
    expect(h.dinilai).toBe(1);
    expect(h.tanpaHpp).toBe(1);
  });

  it("harga diturunkan sampai untung < 30% → rendah", () => {
    const h = untungDokumen([{ nilai: 40 * 38000, porsi: 40, hppPorsi: "27099.33" }], batas);
    expect(h.pct?.toFixed(1)).toBe("28.7");
    expect(h.pita).toBe("rendah");
  });

  it("compliment: nilai 0 tetapi HPP tetap mengurangi untung", () => {
    const h = untungDokumen(
      [
        { nilai: 1000000, porsi: 10, hppPorsi: 50000 },
        { nilai: 0, porsi: 10, hppPorsi: 20000 },
      ],
      batas,
    );
    expect(h.pct?.toFixed(1)).toBe("30.0");
  });

  it("tidak ada baris paket → tidak dinilai", () => {
    const h = untungDokumen([{ nilai: 500000, porsi: 1 }], batas);
    expect(h.pita).toBeNull();
    expect(h.tanpaHpp).toBe(1);
  });
});

describe("persetujuan owner (D-013)", () => {
  it("untung < 30% → perlu", () => {
    const h = untungDokumen([{ nilai: 40 * 38000, porsi: 40, hppPorsi: "27099.33" }], batas);
    expect(keputusanPersetujuan(h, { status: null, pctDisetujui: null })).toBe("perlu");
  });

  it("sudah disetujui di 28,7% dan harga tidak turun → tetap disetujui; turun lagi → perlu ulang", () => {
    const h = untungDokumen([{ nilai: 40 * 38000, porsi: 40, hppPorsi: "27099.33" }], batas);
    expect(keputusanPersetujuan(h, { status: "disetujui", pctDisetujui: "28.70" })).toBe("disetujui");
    const lebihRendah = untungDokumen([{ nilai: 40 * 37000, porsi: 40, hppPorsi: "27099.33" }], batas);
    expect(keputusanPersetujuan(lebihRendah, { status: "disetujui", pctDisetujui: "28.70" })).toBe("perlu");
  });

  it("untung kembali aman → tidak perlu persetujuan", () => {
    const h = untungDokumen([{ nilai: 1940000, porsi: 40, hppPorsi: "27099.33" }], batas);
    expect(keputusanPersetujuan(h, { status: "perlu", pctDisetujui: null })).toBeNull();
  });
});
