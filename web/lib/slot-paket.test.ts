import { describe, expect, it } from "vitest";

import { bacaPilihan, kategoriKurang, slotMilik, susunIsi, togglePilihan, type SlotPaket } from "./slot-paket";

const SLOT: SlotPaket[] = [
  { label: "Soup", pilih: 1, tambahan: false, catatan: null, opsi: [{ nama: "Sup Pelangi", hargaTambahan: null }, { nama: "Soto Ayam", hargaTambahan: null }] },
  { label: "Dessert", pilih: 2, tambahan: false, catatan: null, opsi: ["Semangka", "Puding Lyche", "Bakpao"].map((nama) => ({ nama, hargaTambahan: null })) },
  { label: "Condiment", pilih: 0, tambahan: false, catatan: null, opsi: [{ nama: "Kerupuk dan Sambal", hargaTambahan: null }] },
  { label: "Appetizer", pilih: 0, tambahan: true, catatan: null, opsi: [{ nama: "Karedok", hargaTambahan: 15000 }] },
];
const baru = (item_name: string) => ({ item_name, kunci: `k-${item_name}` });

describe("paket pilihan per kategori", () => {
  it("pilih 1 bergantian, pilih 2 dibatasi, lepas", () => {
    expect(togglePilihan(SLOT[0], ["Sup Pelangi"], "Soto Ayam")).toEqual(["Soto Ayam"]);
    expect(togglePilihan(SLOT[1], ["Semangka", "Puding Lyche"], "Bakpao")).toEqual(["Semangka", "Puding Lyche"]);
    expect(togglePilihan(SLOT[1], ["Semangka"], "Semangka")).toEqual([]);
  });
  it("susun isi: kategori urut, termasuk otomatis, isi sendiri dibiarkan, lalu terbaca ulang", () => {
    const pilihan = new Map([["Dessert", ["Semangka", "Bakpao"]], ["Soup", ["Soto Ayam"]], ["Appetizer", ["Karedok"]]]);
    const isi = susunIsi([{ item_name: "Es Buah request", kunci: "x" }], SLOT, pilihan, baru);
    expect(isi.map((a) => a.item_name)).toEqual(["Soup: Soto Ayam", "Dessert: Semangka + Bakpao", "Condiment: Kerupuk dan Sambal", "Appetizer: Karedok", "Es Buah request"]);
    expect(bacaPilihan(isi.map((a) => a.item_name), SLOT).get("Dessert")).toEqual(["Semangka", "Bakpao"]);
    expect(kategoriKurang(SLOT, new Map([["Soup", ["Soto Ayam"]], ["Dessert", ["Semangka"]]]))).toEqual(["Dessert"]);
  });
  it("kunci baris kategori dipertahankan saat pilihan berubah", () => {
    const awal = [{ item_name: "Soup: Sup Pelangi", kunci: "a" }];
    expect(susunIsi(awal, SLOT, new Map([["Soup", ["Soto Ayam"]]]), baru)[0]).toEqual({ item_name: "Soup: Soto Ayam", kunci: "a" });
  });
});

describe("paket pilihan — nama yang mengandung pemisah", () => {
  const S2: SlotPaket[] = [
    { label: "Beverage", pilih: 0, tambahan: false, catatan: null, opsi: [{ nama: "Air Putih", hargaTambahan: null }] },
    { label: "Beverage - Tea", pilih: 1, tambahan: false, catatan: null, opsi: [{ nama: "Es Lemon Tea", hargaTambahan: null }, { nama: "Es Teh Sereh", hargaTambahan: null }] },
    { label: "Stall", pilih: 2, tambahan: false, catatan: null, opsi: ["Cornflake + Susu", "Cornflake", "Roti Jala + Kari Ayam"].map((nama) => ({ nama, hargaTambahan: null })) },
  ];
  it("label terpanjang menang; opsi ber-' + ' terbaca utuh", () => {
    expect(slotMilik("Beverage - Tea: Es Teh Sereh", S2)?.label).toBe("Beverage - Tea");
    const isi = susunIsi([], S2, new Map([["Beverage - Tea", ["Es Teh Sereh"]], ["Stall", ["Roti Jala + Kari Ayam", "Cornflake + Susu"]]]), baru);
    expect(isi.map((a) => a.item_name)).toEqual(["Beverage: Air Putih", "Beverage - Tea: Es Teh Sereh", "Stall: Roti Jala + Kari Ayam + Cornflake + Susu"]);
    const p = bacaPilihan(isi.map((a) => a.item_name), S2);
    expect(p.get("Beverage - Tea")).toEqual(["Es Teh Sereh"]);
    expect(p.get("Stall")).toEqual(["Roti Jala + Kari Ayam", "Cornflake + Susu"]);
  });
});
