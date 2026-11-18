import { describe, expect, it } from "vitest";

import { bisaJadiAlat, jadikanAlat, tampakAlat } from "./sewa-alat";
import { subtotalBaris, uraikanRupiah } from "./uang";

const baris = (x: Partial<Parameters<typeof jadikanAlat>[0]> = {}) => ({
  qty: "1",
  pax: "",
  unit: "",
  price: "0",
  day: "1",
  is_compliment: false,
  charge_service: true,
  charge_pb1: true,
  charge_ppn: false,
  children: [] as { item_name: string; price: string }[],
  ...x,
});

const nilai = (b: ReturnType<typeof baris>) =>
  subtotalBaris({ day: 1, qty: uraikanRupiah(b.qty) ?? 0, pax: uraikanRupiah(b.pax), price: uraikanRupiah(b.price) ?? 0, is_compliment: false }).toNumber();

describe("pindah baris menu ke Sewa alat (QUO/TC/2611/006)", () => {
  it("Skirting Hitam: Qty 1 × Pax 2 pcs → Qty 2, isi jadi catatan, nilai tetap", () => {
    const asal = baris({ qty: "1", pax: "2", unit: "pcs", price: "50.000", children: [{ item_name: "2 Meja (uk P 180cm x L 70cm x T 75cm)", price: "" }] });
    const alat = jadikanAlat(asal, false);
    expect(alat).toMatchObject({ jenis: "alat", qty: "2", pax: "", unit: "pcs", catatan: "2 Meja (uk P 180cm x L 70cm x T 75cm)", children: [] });
    expect(nilai(alat)).toBe(nilai(asal));
  });

  it("Set bunga rangkai satuan 'pax' dikosongkan, dua isi jadi dua baris catatan", () => {
    const alat = jadikanAlat(baris({ qty: "1", pax: "1", unit: "pax", price: "385.000", catatan: "Untuk stall", children: [{ item_name: "Dekor Bunga Simple di Stall", price: "" }, { item_name: "2 Rangkai Bunga Simple Untuk Pedestal", price: "" }] }), false);
    expect(alat.unit).toBe("");
    expect(alat.catatan).toBe("Untuk stall\nDekor Bunga Simple di Stall\n2 Rangkai Bunga Simple Untuk Pedestal");
  });

  it("pajak ikut saklar PPN dokumen; PBJT & layanan selalu lepas", () => {
    expect(jadikanAlat(baris(), true)).toMatchObject({ charge_ppn: true, charge_pb1: false, charge_service: false });
    expect(jadikanAlat(baris(), false)).toMatchObject({ charge_ppn: false, charge_pb1: false, charge_service: false });
  });

  it("qty desimal & ribuan tetap terbaca (2,5 × 1.000 = 2.500)", () => {
    expect(jadikanAlat(baris({ qty: "2,5", pax: "1.000" }), false).qty).toBe("2.500");
  });

  it("paket atau isi berharga tidak bisa dipindah", () => {
    expect(bisaJadiAlat(baris({ package_id: "3" }))).toBe(false);
    expect(bisaJadiAlat(baris({ children: [{ item_name: "Soto", price: "25.000" }] }))).toBe(false);
    expect(bisaJadiAlat(baris({ children: [{ item_name: "untuk meja VIP", price: "" }] }))).toBe(true);
  });
});

describe("nama yang tampak alat/dekor", () => {
  it.each(["Skirting Hitam", "Centerpiece", "ADDITIONAL: SET BUNGA RANGKAI", "GELAS GOBLET", "SEWA MEJA STALL & PERLENGKAPAN", "Disposable Piring + Sendok (1x pakai)", "Kursi Futura"])("%s → alat", (n) => {
    expect(tampakAlat(n)).toBe(true);
  });
  it.each(["PARSEL BUAH MEJA - VIP", "COFFEE BREAK DUPLO", "Infused Water", "Nasi Box", "ANEKA STALL - SELAT SOLO", "Kembang Tahu"])("%s → bukan alat", (n) => {
    expect(tampakAlat(n)).toBe(false);
  });
});
