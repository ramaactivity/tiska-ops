import { describe, expect, it } from "vitest";

import { terbilang } from "./terbilang";

describe("terbilang", () => {
  it.each([
    [0, "Nol Rupiah"],
    [11, "Sebelas Rupiah"],
    [15, "Lima Belas Rupiah"],
    [100, "Seratus Rupiah"],
    [1000, "Seribu Rupiah"],
    [1500, "Seribu Lima Ratus Rupiah"],
    [10_000, "Sepuluh Ribu Rupiah"],
    [111_000, "Seratus Sebelas Ribu Rupiah"],
    [1_000_000, "Satu Juta Rupiah"],
    [1_234_567, "Satu Juta Dua Ratus Tiga Puluh Empat Ribu Lima Ratus Enam Puluh Tujuh Rupiah"],
    [14_800_000, "Empat Belas Juta Delapan Ratus Ribu Rupiah"],
    [2_000_000_000, "Dua Miliar Rupiah"],
    ["5310000.00", "Lima Juta Tiga Ratus Sepuluh Ribu Rupiah"],
  ])("%s → %s", (n, harap) => {
    expect(terbilang(n)).toBe(harap);
  });
});
