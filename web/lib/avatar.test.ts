import { describe, expect, it } from "vitest";

import { berkasWajah, jenisWajah, tulisAvatar, uraiAvatar, wajahBawaan, wajahKelompok, wajahUntuk } from "./avatar";

describe("avatar", () => {
  it("kosong = Notionists dari username (wajah tiap orang tetap beda); bolak-balik", () => {
    expect(uraiAvatar(null, "ariz")).toEqual({ seed: "ariz", hijab: false });
    expect(tulisAvatar(uraiAvatar(null, "ariz"), "ariz")).toBeNull();
    expect(tulisAvatar(uraiAvatar("w.j05", "ariz"), "ariz")).toBe("w.j05");
    expect(tulisAvatar({ seed: "w.j05", hijab: true }, "ariz")).toBe("w.j05");
  });

  it("avatar Notionists lama tetap terbaca apa adanya", () => {
    expect(uraiAvatar("ariz-3|hijab", "ariz")).toEqual({ seed: "ariz-3", hijab: true });
    expect(tulisAvatar({ seed: "ariz", hijab: true }, "ariz")).toBe("ariz|hijab");
  });

  it("kode wajah Tiska → berkas; selain itu bukan wajah Tiska", () => {
    expect(berkasWajah("w.l01")).toBe("/wajah/l01.webp");
    expect(berkasWajah("w.x16")).toBe("/wajah/x16.webp");
    expect(berkasWajah("w.l17")).toBeNull();
    expect(berkasWajah("w.z01")).toBeNull();
    expect(berkasWajah("ariz-3")).toBeNull();
    expect(wajahKelompok("c")).toHaveLength(16);
  });
});

describe("jenis kelamin wajah (D-111)", () => {
  it("penanda: j/p perempuan, l laki-laki, campuran sesuai gambar, netral", () => {
    expect(jenisWajah("w.j01")).toBe("P");
    expect(jenisWajah("p16")).toBe("P");
    expect(jenisWajah("w.l09")).toBe("L");
    expect(jenisWajah("c02")).toBe("P");
    expect(jenisWajah("c01")).toBe("L");
    expect(jenisWajah("x15")).toBe("N");
  });

  it("pemilih: laki-laki tidak melihat wajah perempuan & sebaliknya, netral untuk semua", () => {
    expect(wajahUntuk("j", "L")).toEqual([]);
    expect(wajahUntuk("l", "P")).toEqual([]);
    expect(wajahUntuk("c", "P").every((w) => jenisWajah(w) === "P")).toBe(true);
    expect(wajahUntuk("x", "L")).toContain("w.x15");
    expect(wajahUntuk("x", "P")).toContain("w.x15");
    expect(wajahUntuk("c", null)).toHaveLength(16);
  });

  it("bawaan: sesuai jenis kelamin, tetap per orang, tidak semua kembar", () => {
    expect(jenisWajah(wajahBawaan("tukinem", "P"))).toBe("P");
    expect(jenisWajah(wajahBawaan("agil", "L"))).toBe("L");
    expect(wajahBawaan("tukinem", "P")).toBe(wajahBawaan("tukinem", "P"));
    const beda = new Set(["sukir", "asep", "mul", "nung", "agil", "yoga"].map((u) => wajahBawaan(u, "L")));
    expect(beda.size).toBeGreaterThan(3);
    expect(uraiAvatar(null, "tukinem", "P").seed).toBe(wajahBawaan("tukinem", "P"));
    expect(uraiAvatar("w.l04", "bimo", "L").seed).toBe("w.l04");
    expect(uraiAvatar(null, "ariz", null).seed).toBe("ariz");
  });
});

describe("hijab", () => {
  it("lapisan rambut diganti hijab", async () => {
    const { svgAvatar } = await import("./avatar-svg");
    const polos = svgAvatar("ariz", false);
    const hijab = svgAvatar("ariz", true);
    expect(polos).toContain('<g transform="translate(266 207)">');
    expect(hijab).not.toContain('<g transform="translate(266 207)">');
    expect(hijab).toContain('fill-rule="evenodd"');
  });
});
