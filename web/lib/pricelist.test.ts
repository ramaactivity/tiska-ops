import { describe, expect, it } from "vitest";

import { jalurBerkas, teksWa, ukuranBerkas } from "./pricelist";

describe("pricelist", () => {
  it("ukuran berkas ditulis cara Indonesia", () => {
    expect(ukuranBerkas(1771458)).toBe("1,8 MB");
    expect(ukuranBerkas(116_000)).toBe("116 KB");
  });

  it("teks WA pendek, memuat nama & link, tanpa frasa basa-basi", () => {
    const t = teksWa("Wedding Bogor & ATF 2026", "https://tiska-ops.vercel.app/pl/wedding-bogor");
    expect(t).toContain("https://tiska-ops.vercel.app/pl/wedding-bogor");
    expect(t).not.toMatch(/semoga|selamat menikmati|sukses selalu/i);
  });

  it("jalur berkas per kode & versi", () => {
    expect(jalurBerkas("02", 3, "asli")).toBe("02/v3-asli.pdf");
  });
});
