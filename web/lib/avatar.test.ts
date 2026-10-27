import { describe, expect, it } from "vitest";

import { berkasWajah, tulisAvatar, uraiAvatar, wajahKelompok } from "./avatar";

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
