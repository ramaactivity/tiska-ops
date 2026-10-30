import { describe, expect, it } from "vitest";

import { kunciSah, namaUnduhan } from "./foto-menu";

describe("foto menu", () => {
  it("hanya kunci R2 buatan server yang diterima", () => {
    const u = "menu/2026/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab.jpg";
    expect(kunciSah(u, "menu/2026/3f2b8c1e-1a2b-4c3d-8e9f-0123456789ab_t.jpg")).toBe(true);
    expect(kunciSah(u, "menu/2026/lain_t.jpg")).toBe(false);
    expect(kunciSah("../rahasia.jpg", "x")).toBe(false);
    expect(kunciSah("menu/2026/abc.jpg", "menu/2026/abc_t.jpg")).toBe(false);
  });
  it("nama unduhan rapi dari nama menu", () => {
    expect(namaUnduhan("Ayam Bakar Madu (dengan subalan)", 2)).toBe("ayam-bakar-madu-dengan-subalan-2.jpg");
    expect(namaUnduhan("Sate Ayam Café", 1)).toBe("sate-ayam-cafe-1.jpg");
    expect(namaUnduhan("!!!", 1)).toBe("foto-menu-1.jpg");
  });
});
