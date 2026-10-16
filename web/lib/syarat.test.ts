import { describe, expect, it } from "vitest";

import { type BagianSyarat, rakitSyarat, tebakJenisPesanan } from "./syarat";

const B = (kode: string, berlaku: string, urut: number): BagianSyarat => ({ kode, judul: kode.toUpperCase(), isi: `isi ${kode}`, berlaku, urut });
const semua = [
  B("buffet", "buffet_stall", 10),
  B("set", "set_menu", 20),
  B("box", "box", 30),
  B("harga_buffet", "bukan_box", 40),
  B("harga_box", "hanya_box", 41),
  B("termin", "semua", 50),
];
const judul = (s: string) => s.split("\n").filter((l) => /^[IVX]+\. /.test(l));

describe("rakit S&K", () => {
  it("box saja → bagian box + harga versi box, bernomor I–III tanpa lompat", () => {
    expect(judul(rakitSyarat(semua, { buffetStall: false, box: true, setMenu: false }))).toEqual(["I. BOX:", "II. HARGA_BOX:", "III. TERMIN:"]);
  });

  it("box + stall → buffet, box, harga versi buffet", () => {
    expect(judul(rakitSyarat(semua, { buffetStall: true, box: true, setMenu: false }))).toEqual([
      "I. BUFFET:",
      "II. BOX:",
      "III. HARGA_BUFFET:",
      "IV. TERMIN:",
    ]);
  });

  it("tebakan dari baris: kena layanan & berharga → buffet; satuan box → box", () => {
    expect(
      tebakJenisPesanan([
        { charge_service: false, unit: "box", price: "48.500" },
        { charge_service: true, unit: "pax", price: "88.500" },
      ]),
    ).toEqual({ buffetStall: true, box: true });
  });
});
