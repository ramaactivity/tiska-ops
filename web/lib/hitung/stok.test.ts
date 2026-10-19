import { describe, expect, it } from "vitest";

import { keadaanStok, keSatuanStok, normSatuan, rencanaBeli, satuanStok } from "./stok";

const ayam = { purchase_unit: "Kilogram", usage_unit: "Gram", usage_qty_per_pack: "1000" };
const tissue = { purchase_unit: "Pack", usage_unit: "Piece", usage_qty_per_pack: 50 };
const ikat = { purchase_unit: "Ikat", usage_unit: "Gram", usage_qty_per_pack: null };
const tanpaPakai = { purchase_unit: "Liter", usage_unit: null, usage_qty_per_pack: null };

describe("konversi ke satuan stok", () => {
  it("sinonim satuan", () => {
    expect(["Kilogram", " kg ", "KILO"].map(normSatuan)).toEqual(["kg", "kg", "kg"]);
    expect(normSatuan("Pieces")).toBe("pcs");
    expect(satuanStok(tanpaPakai)).toBe("Liter");
  });

  it("satuan sama, satuan beli × isi kemasan, kg↔g, l↔ml", () => {
    expect(keSatuanStok("2.5", "kg", ayam)?.toString()).toBe("2500");
    expect(keSatuanStok(300, "gr", ayam)?.toString()).toBe("300");
    expect(keSatuanStok(2, "Pack", tissue)?.toString()).toBe("100");
    expect(keSatuanStok(10, "Pieces", tissue)?.toString()).toBe("10");
    expect(keSatuanStok(1500, "ml", tanpaPakai)?.toString()).toBe("1.5");
  });

  it("tidak pasti → null (ikat tanpa isi kemasan, satuan asing, satuan kosong)", () => {
    expect(keSatuanStok(3, "Ikat", ikat)).toBeNull();
    expect(keSatuanStok(1, "karung", ayam)).toBeNull();
    expect(keSatuanStok(1, null, ayam)).toBeNull();
    expect(keSatuanStok(1, "kg", { purchase_unit: null, usage_unit: null, usage_qty_per_pack: null })).toBeNull();
  });
});

describe("keadaan stok & rencana beli", () => {
  it("minus / habis / hampir / aman", () => {
    expect(keadaanStok(-5, null)).toBe("minus");
    expect(keadaanStok(0, 100)).toBe("habis");
    expect(keadaanStok(100, 100)).toBe("hampir");
    expect(keadaanStok(101, 100)).toBe("aman");
    expect(keadaanStok(5, null)).toBe("aman");
  });

  it("beli = perlu − stok + isi ulang ke minimum; stok minus dianggap nol", () => {
    expect(rencanaBeli(4200, 0, null)).toEqual({ dariStok: expect.anything(), beli: expect.anything() });
    const r = (p: number, s: number, m: number | null) => {
      const x = rencanaBeli(p, s, m);
      return [x.dariStok.toNumber(), x.beli.toNumber()];
    };
    expect(r(4200, 0, null)).toEqual([0, 4200]);
    expect(r(4200, 5000, null)).toEqual([4200, 0]);
    expect(r(4200, 5000, 2000)).toEqual([4200, 1200]); // sisa 800 < min 2000 → isi 1200
    expect(r(4200, 1000, 500)).toEqual([1000, 3700]); // 3200 kurang + 500 isi ulang
    expect(r(4200, -300, null)).toEqual([0, 4200]);
  });
});
