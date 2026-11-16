import { describe, expect, it } from "vitest";

import { labelUkuran, tautanWhatsApp, teksPesanCetak } from "./cetakan";

describe("teks pesan cetak", () => {
  it("sama persis dengan gaya chat Rama ke Oke Print", () => {
    expect(
      teksPesanCetak([
        {
          judul: "Sticker Tiska Besar 7x7cm",
          ukuran: "Diameter 7 cm",
          bahan: "Sticker Chromo glossy",
          finishing: "Half Cut potong jadi circle lingkaran bukan persegi",
          jumlah: [{ varian: null, lembar: 10 }],
        },
      ]),
    ).toBe(
      "Kak mau cetak\n\nSticker Tiska Besar 7x7cm\nUkuran : Diameter 7 cm\nBahan : Sticker Chromo glossy\nQty : 10 Lembar A3\nFinishing : Half Cut potong jadi circle lingkaran bukan persegi",
    );
  });

  it("varian dirinci, varian nol & baris kosong dilewati, beberapa cetakan dipisah baris kosong", () => {
    const t = teksPesanCetak([
      { judul: "Sticker Minuman 8x5cm", ukuran: "8x5 cm", bahan: null, finishing: "Potong", jumlah: [{ varian: "Es Dawet Ireng", lembar: 3 }, { varian: "Guava Juice", lembar: 0 }, { varian: "Sari Kedondong", lembar: 3 }] },
      { judul: "Sleeve", ukuran: "9x48 cm", bahan: null, finishing: null, jumlah: [{ varian: null, lembar: 0 }] },
      { judul: "Nama Menu 11x6,6cm", ukuran: "11x6.6 cm", bahan: "BW Carton", finishing: "Potong", jumlah: [{ varian: null, lembar: 4 }] },
    ]);
    expect(t).toBe(
      "Kak mau cetak\n\nSticker Minuman 8x5cm\nUkuran : 8x5 cm\nQty : 6 Lembar A3 (Es Dawet Ireng 3, Sari Kedondong 3)\nFinishing : Potong\n\nNama Menu 11x6,6cm\nUkuran : 11x6.6 cm\nBahan : BW Carton\nQty : 4 Lembar A3\nFinishing : Potong",
    );
    expect(teksPesanCetak([{ judul: "x", ukuran: "y", bahan: null, finishing: null, jumlah: [] }])).toBe("");
  });
});

describe("lain-lain", () => {
  it("ukuran & tautan WA", () => {
    expect(labelUkuran(70, 70, "lingkaran")).toBe("Ø 7 cm");
    expect(labelUkuran(110, 66, "persegi")).toBe("11 × 6,6 cm");
    expect(labelUkuran(null, 66, "persegi")).toBe("Ukuran belum diisi");
    expect(tautanWhatsApp("+62 851-0072-6688", "a b")).toBe("https://wa.me/6285100726688?text=a%20b");
    expect(tautanWhatsApp("0812 345", "x")).toBeNull();
  });
});

describe("stok & permintaan (tahap 2)", () => {
  it("keadaan stok, tambahan stok, ringkasan", async () => {
    const { keadaanStok, tambahanStok, ringkasPermintaan } = await import("./cetakan");
    expect(keadaanStok(null, 5)).toBe("belum");
    expect(keadaanStok(0, 5)).toBe("habis");
    expect(keadaanStok(5, 5)).toBe("menipis");
    expect(keadaanStok(6, 5)).toBe("aman");
    expect(keadaanStok(3, null)).toBe("aman");
    expect(tambahanStok(4, "pcs", 24)).toBe(96);
    expect(tambahanStok(4, "lembar", 24)).toBe(4);
    expect(ringkasPermintaan([{ nama: "Stiker", varian: "Logo", lembar: 5 }, { nama: "Label", varian: null, lembar: 2 }], 1)).toBe("Stiker (Logo) 5 lbr +1 lagi");
  });
});
