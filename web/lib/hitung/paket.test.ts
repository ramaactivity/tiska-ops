import { describe, expect, it } from "vitest";

import { hitungHppPaket, nilaiUntung } from "./paket";

const batas = { untungAmanPct: 35, untungMinPct: 30 };

describe("HPP paket — angka acuan file HPP BS/PR (TERBARU)", () => {
  it("BS-15 = 27.099,33 termasuk box reguler 5.805", () => {
    // Isi asli BS-15 di data/paket_box_hpp.csv: Nasi Putih, Ikan Dori Sambal
    // Matah, Ayam Kemangi, Urap Bali, Rempeyek Rebon, Serundeng, Air Mineral.
    const hpp = hitungHppPaket([2271.58, 6587.49, 6735.3, 1437.8, 2162.16, 1500, 600], 5805);
    expect(hpp.toFixed(2)).toBe("27099.33");
  });
});

describe("penanda untung (D-013)", () => {
  it("BS-15 @48.500 untung 44,1% → aman", () => {
    const u = nilaiUntung({ harga: 48500, hpp: "27099.33", ...batas });
    expect(u?.pct.toFixed(1)).toBe("44.1");
    expect(u?.pita).toBe("aman");
  });

  it("tepat di batas: 35% aman, 30% mepet, di bawah 30% rendah", () => {
    expect(nilaiUntung({ harga: 100, hpp: 65, ...batas })?.pita).toBe("aman");
    expect(nilaiUntung({ harga: 100, hpp: 70, ...batas })?.pita).toBe("mepet");
    expect(nilaiUntung({ harga: 100, hpp: 70.1, ...batas })?.pita).toBe("rendah");
  });

  it("harga kosong: tidak dihitung, bukan dibagi nol", () => {
    expect(nilaiUntung({ harga: 0, hpp: 10, ...batas })).toBeNull();
  });
});
