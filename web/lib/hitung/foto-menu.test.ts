import { describe, expect, it } from "vitest";

import { buatPenebakMenu, kunciSah, namaUnduhan } from "./foto-menu";
import { buatPenentuMenu } from "./menu-dapur";

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
  it("tebak menu dari nama file/folder: bagian terdalam dulu, nama generik dilewati", () => {
    const data = [
      { id: "1", name: "Ayam Bakar Madu", active: true, adaResep: true, mergedInto: null },
      { id: "2", name: "Sambal Goreng Kentang", active: true, adaResep: true, mergedInto: null },
    ];
    const menu = data.map((m) => ({ id: m.id, nama: m.name }));
    const tebak = buatPenebakMenu({ cari: buatPenentuMenu(data, [{ menuId: "2", name: "Sambel Kentang" }]), nama: new Map(menu.map((m) => [m.id, m.nama])) }, menu);
    expect(tebak("Event Agro/Ayam Bakar Madu/IMG_0012.JPG")?.id).toBe("1");
    expect(tebak("Sambel Kentang/WhatsApp Image 2026-10-01 at 10.12.jpeg")?.id).toBe("2");
    expect(tebak("Ayam Bakar Madu/ayam bakar mdu 2.jpg")?.id).toBe("1");
    expect(tebak("DSC0001.jpg")).toBeNull();
    expect(tebak("Dokumentasi Nikahan Budi/IMG_1.jpg")).toBeNull();
    expect(tebak(null)).toBeNull();
  });
});
