import { describe, expect, it } from "vitest";

import { jalurBerkas, ukuranBerkas } from "./pricelist";

describe("pricelist", () => {
  it("ukuran berkas ditulis cara Indonesia", () => {
    expect(ukuranBerkas(1771458)).toBe("1,8 MB");
    expect(ukuranBerkas(116_000)).toBe("116 KB");
  });

  it("jalur berkas per kode & versi", () => {
    expect(jalurBerkas("02", 3, "asli")).toBe("02/v3-asli.pdf");
  });
});
