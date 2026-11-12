import { describe, expect, it } from "vitest";

import { namaIsiBernomor, peringkatIsi, posisiSisipIsi } from "./urutan-isi";

describe("urutan isi menu (D-159)", () => {
  it("menebak kategori dari nama bila menu belum berkategori", () => {
    const daftar = [
      "Beverages: Mineral Water, Infused Water, Serelli (Lemongrass, Lemon, Lychee) Tea Punch",
      "Puding Lapis Karamel - Caramel Layer Pudding",
      "Condiments: Indonesian home-made Chili",
      "Ayam Bakar Madu - Honey-Glazed Grilled Chicken",
      "Nasi Daun Jeruk - Fragrant Lime-Leaf Rice",
      "Sup Tekwan",
      "Asinan Buah / Sayur",
      "Dessert: Fresh Fruits (Semangka, Melon)",
    ];
    expect(daftar.map((n) => peringkatIsi(n))).toEqual([6, 5, 4, 3, 2, 1, 0, 5]);
  });
  it("kategori menu menang atas tebakan nama", () => {
    expect(peringkatIsi("Es Buah", "dessert")).toBe(5);
    expect(peringkatIsi("Lumpia", "chicken")).toBe(3);
  });
  it("isi baru diselipkan di tempat kategorinya; yang tidak dipesan dilewati", () => {
    // Nasi, Ayam, Dessert — tambah Sup → setelah Nasi? Tidak: Sup (1) sebelum Nasi (2).
    expect(posisiSisipIsi([2, 3, 5], 1)).toBe(0);
    // tambah Condiment (4) → sesudah Ayam, sebelum Dessert
    expect(posisiSisipIsi([2, 3, 5], 4)).toBe(2);
    // tambah minuman → paling akhir
    expect(posisiSisipIsi([2, 3, 5], 6)).toBe(3);
    // urutan manual tidak berurut tetap dihormati: selip sesudah isi terakhir yang ≤
    expect(posisiSisipIsi([3, 2, 5], 3)).toBe(2);
  });
  it("nomor isi tidak dobel dengan nomor/strip yang sudah diketik", () => {
    expect(namaIsiBernomor("1. Coffee w/ Fresh Milk", 0)).toBe("1. Coffee w/ Fresh Milk");
    expect(namaIsiBernomor("Sup Tekwan", 10)).toBe("11. Sup Tekwan");
    expect(namaIsiBernomor("- Tea", 1)).toBe("2. Tea");
    expect(namaIsiBernomor("3) Snack Asin", 2)).toBe("3. Snack Asin");
  });
});
