import { describe, expect, it } from "vitest";

import { hitungHpp } from "./hpp";

const atur = { overheadPct: 30, targetFoodCostPct: 50 };

describe("hitungHpp — angka acuan dari HPP Makanan - BOM.xlsx", () => {
  it("Ayam Kodok (MC1-001) = 4.882,42, dibulatkan di akhir (D-028)", () => {
    // 18 baris resep, total batch 375.570,44906…; per porsi 3.755,70449…
    const h = hitungHpp({
      baris: [
        { qty: 4000, harga: 40 },
        { qty: 2000, harga: 49 },
        { qty: 35, harga: 16 },
        { qty: 8, harga: 162 },
        { qty: 6, harga: 150 },
        { qty: 8, harga: 1687.5 },
        { qty: 400, harga: "41.891891891891895" },
        { qty: 380, harga: "46.05263157894737" },
        { qty: 12, harga: 2385 },
        { qty: 20, harga: 96 },
        { qty: 250, harga: 37 },
        { qty: 100, harga: 95 },
        { qty: 100, harga: 15 },
        { qty: 100, harga: "48.07692307692308" },
        { qty: 150, harga: 58 },
        { qty: 5, harga: 150 },
        { qty: 5, harga: 162 },
        { qty: 10, harga: 120 },
      ],
      porsi: 100,
      ...atur,
    });
    expect(h.totalBahan.toFixed(2)).toBe("375570.45");
    expect(h.hppPerPorsi?.toFixed(2)).toBe("4882.42");
    // Dari HPP presisi penuh 4.882,4158… ÷ 50%, seperti sel Excel.
    expect(h.saranHarga?.toFixed(2)).toBe("9764.83");
  });

  it("Tumis Kacang Panjang (MC1-003, bukan MC1-301) = 3.053,70", () => {
    const h = hitungHpp({ baris: [{ qty: 1, harga: 234900 }], porsi: 100, ...atur });
    expect(h.bahanPerPorsi?.toFixed(2)).toBe("2349.00");
    expect(h.hppPerPorsi?.toFixed(2)).toBe("3053.70");
  });
});

describe("hitungHpp — keadaan tidak lengkap", () => {
  it("bahan tanpa harga dihitung nol tetapi DILAPORKAN", () => {
    const h = hitungHpp({ baris: [{ qty: 10, harga: 100 }, { qty: 5, harga: null }], porsi: 10, ...atur });
    expect(h.hargaKosong).toBe(1);
    expect(h.hppPerPorsi?.toFixed(2)).toBe("130.00");
  });

  it("porsi kosong: HPP tidak dihitung, bukan dibagi nol", () => {
    const h = hitungHpp({ baris: [{ qty: 1, harga: 1000 }], porsi: null, ...atur });
    expect(h.hppPerPorsi).toBeNull();
    expect(h.totalBahan.toFixed(2)).toBe("1000.00");
  });

  it("overhead mengikuti pengaturan, bukan angka tertanam", () => {
    const h = hitungHpp({ baris: [{ qty: 1, harga: 1000 }], porsi: 1, overheadPct: 50, targetFoodCostPct: 40 });
    expect(h.hppPerPorsi?.toFixed(2)).toBe("1500.00");
    expect(h.saranHarga?.toFixed(2)).toBe("3750.00");
  });
});
