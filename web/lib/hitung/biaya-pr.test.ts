import { describe, expect, it } from "vitest";

import { biayaRabPerEvent } from "./biaya-pr";

const baris = [
  { kategori: "hpp_bahan_baku", qty: 2, harga: 50_000 },
  { kategori: "hpp_bahan_baku", qty: 1, harga: 25_000 },
  { kategori: "bbm", qty: 1, harga: 100_000 },
];

describe("biayaRabPerEvent", () => {
  it("estimasi per kategori; realisasi null sebelum ada nota", () => {
    const h = biayaRabPerEvent({ status: "diajukan", jumlahEvent: 1, baris, nota: [] });
    expect(h.map((b) => [b.kategori, b.estimasi.toNumber(), b.realisasi])).toEqual([
      ["hpp_bahan_baku", 125_000, null],
      ["bbm", 100_000, null],
    ]);
  });

  it("realisasi dari nota; barang tanpa baris PR = bahan baku; kategori hanya di nota tetap muncul", () => {
    const h = biayaRabPerEvent({
      status: "disetujui",
      jumlahEvent: 1,
      baris: [{ kategori: "bbm", qty: 1, harga: 100_000 }],
      nota: [
        { kategori: "bbm", total: 120_000 },
        { kategori: null, total: 30_000 },
      ],
    });
    expect(h.map((b) => [b.kategori, b.estimasi.toNumber(), b.realisasi?.toNumber()])).toEqual([
      ["bbm", 100_000, 120_000],
      ["hpp_bahan_baku", 0, 30_000],
    ]);
  });

  it("dibagi rata antar event, dibulatkan rupiah", () => {
    const h = biayaRabPerEvent({ status: "selesai", jumlahEvent: 3, baris: [{ kategori: "e_toll", qty: 1, harga: 100_000 }], nota: [] });
    expect(h[0].estimasi.toNumber()).toBe(33_333);
  });

  it("bahan yang diambil dari stok jadi baris tersendiri (estimasi = realisasi), dibagi rata", () => {
    const h = biayaRabPerEvent({ status: "disetujui", jumlahEvent: 2, baris: [], nota: [], nilaiDariStok: 90_001 });
    expect(h.map((b) => [b.kategori, b.estimasi.toNumber(), b.realisasi?.toNumber(), b.dariStok])).toEqual([["hpp_bahan_baku", 45_001, 45_001, true]]);
    expect(biayaRabPerEvent({ status: "draft", jumlahEvent: 1, baris: [], nota: [], nilaiDariStok: 1000 })).toEqual([]);
  });

  it("PR draft/batal atau untuk stok (tanpa event) tidak masuk margin", () => {
    expect(biayaRabPerEvent({ status: "draft", jumlahEvent: 1, baris, nota: [] })).toEqual([]);
    expect(biayaRabPerEvent({ status: "batal", jumlahEvent: 1, baris, nota: [] })).toEqual([]);
    expect(biayaRabPerEvent({ status: "disetujui", jumlahEvent: 0, baris, nota: [] })).toEqual([]);
  });
});
