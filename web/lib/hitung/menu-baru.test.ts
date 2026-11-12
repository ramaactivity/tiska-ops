import { describe, expect, it } from "vitest";

import { pecahNamaIsi, tebakKategoriMenu } from "./menu-baru";

describe("pecahNamaIsi (D-165)", () => {
  it("memecah nama, Inggris, keterangan dari isi asli BRIN", () => {
    expect(pecahNamaIsi("Sate Daging Haas - Indonesian Spiced Beef Satay (not spicy)")).toMatchObject({
      nama: "Sate Daging Haas",
      namaEn: "Indonesian Spiced Beef Satay",
      keterangan: "not spicy",
      gandaMenu: false,
    });
    expect(pecahNamaIsi("Dessert: Fresh Fruits (Semangka, Melon, Nanas)")).toMatchObject({ awalan: "Dessert", nama: "Fresh Fruits", keterangan: "Semangka, Melon, Nanas" });
    expect(pecahNamaIsi("3. Puding Lapis Karamel - Caramel Layer Pudding")).toMatchObject({ nama: "Puding Lapis Karamel", namaEn: "Caramel Layer Pudding" });
    expect(pecahNamaIsi("Tea")).toMatchObject({ nama: "Tea", namaEn: "", keterangan: "" });
  });

  it("dua menu dalam satu baris ditandai, tidak dipecah sembarangan", () => {
    const p = pecahNamaIsi("Nasi Daun Jeruk - Fragrant Lime-Leaf Rice / Nasi Putih - Steamed Rice");
    expect(p.gandaMenu).toBe(true);
    expect(p.namaEn).toBe("");
  });

  it("menebak kategori dari awalan, nama, lalu nama Inggris", () => {
    expect(tebakKategoriMenu(pecahNamaIsi("Dessert: Fresh Fruits (Semangka)"))).toBe("dessert");
    expect(tebakKategoriMenu(pecahNamaIsi("Sate Daging Haas - Indonesian Spiced Beef Satay"))).toBe("beef");
    expect(tebakKategoriMenu(pecahNamaIsi("Dori Goreng Panir - Fried Dory"))).toBe("fish");
    expect(tebakKategoriMenu(pecahNamaIsi("Tumis Baby Buncis XO - Sauteed Baby Beans"))).toBe("vegetable");
    expect(tebakKategoriMenu(pecahNamaIsi("Coffee w/ Fresh Milk"))).toBe("beverage");
    expect(tebakKategoriMenu(pecahNamaIsi("Jadah Manten"))).toBeNull();
  });
});
