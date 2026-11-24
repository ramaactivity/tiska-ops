import { describe, expect, it } from "vitest";

import { kategoriAlatDariNama } from "./peralatan";

describe("tebakan kategori alat dari nama (D-218) — nama asli dari dokumen", () => {
  it.each([
    ["Skirting Hitam", "Meja, taplak & runner"],
    ["Centerpiece", "Dekor & vas bunga"],
    ["ADDITIONAL: SET BUNGA RANGKAI", "Dekor & vas bunga"],
    ["Kursi Futura + stretch cover putih", "Kursi"],
    ["GELAS GOBLET", "Gelas"],
    ["Disposable Piring + Sendok (1x pakai)", "Piring & alat makan"],
    ["Taplak Round Table VIP Off-white Monogram", "Meja, taplak & runner"],
    ["Chafing dish", "Penghangat"],
    ["Juice Pitcher", "Pitcher"],
    ["Chaving Kaca Bulat Besar", "Penghangat"],
    ["Dandang Kukus", "Alat dapur"],
    ["Conveyor Toaster", "Alat dapur"],
    ["Troley", "Angkut & simpan"],
    ["Cool Box", "Angkut & simpan"],
    ["Sound system", "Lainnya"],
  ])("%s → %s", (nama, kategori) => {
    expect(kategoriAlatDariNama(nama)).toBe(kategori);
  });
});
