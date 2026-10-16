import { describe, expect, it } from "vitest";

import { gabungSaran, rapikanRupiah } from "./saran-dokumen";

describe("saran dokumen", () => {
  it("yang paling sering dipakai di depan, saran umum menyusul tanpa dobel", () => {
    expect(gabungSaran(["Gathering", "pernikahan", "Pernikahan", null, " "], ["Pernikahan", "Seminar"])).toEqual(["pernikahan", "Gathering", "Seminar"]);
  });
  it("rupiah dirapikan, teks lain dibiarkan", () => {
    expect(rapikanRupiah("48500")).toBe("48.500");
    expect(rapikanRupiah("1.500.000")).toBe("1.500.000");
    expect(rapikanRupiah("-65000")).toBe("-65.000");
    expect(rapikanRupiah("abc")).toBe("abc");
    expect(rapikanRupiah("")).toBe("");
  });
});
