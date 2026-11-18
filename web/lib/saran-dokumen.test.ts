import { describe, expect, it } from "vitest";

import { gabungSaran, rapikanSatuan, satuanBerupaAngka } from "./saran-dokumen";

describe("saran dokumen", () => {
  it("yang paling sering dipakai di depan, saran umum menyusul tanpa dobel", () => {
    expect(gabungSaran(["Gathering", "pernikahan", "Pernikahan", null, " "], ["Pernikahan", "Seminar"])).toEqual(["pernikahan", "Gathering", "Seminar"]);
  });
  it("satuan baku huruf kecil, satuan lain dibiarkan; angka saja ditandai (D-199)", () => {
    expect(rapikanSatuan(" Pax ")).toBe("pax");
    expect(rapikanSatuan("BOX")).toBe("box");
    expect(rapikanSatuan("Tampah  kecil")).toBe("Tampah kecil");
    expect(rapikanSatuan(null)).toBe("");
    expect(satuanBerupaAngka("1")).toBe(true);
    expect(satuanBerupaAngka("1 tampah")).toBe(false);
  });
});
