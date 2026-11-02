import { describe, expect, it } from "vitest";

import { hitungTotalDokumen } from "../uang";
import { type AturanLoyalti, barisGratisPax, bolehDigabung, kalimatAturan, kartuLoyalti, memenuhi, pesanWaHadiah } from "./loyalti";

const aturan: AturanLoyalti = { id: "1", syarat: 3, minBelanja: 100_000, minPax: null, jendelaHari: 30, berlakuHari: 14, mulai: "2026-11-01" };
const p = (id: string, tanggal: string, nilai = 150_000, pax = 4) => ({ id, tanggal, nilai, pax });

describe("kartu loyalti", () => {
  it("3 pesanan dalam 30 hari → 1 hadiah, kartu kembali kosong", () => {
    const k = kartuLoyalti(aturan, [p("1", "2026-11-02"), p("2", "2026-11-10"), p("3", "2026-11-20"), p("4", "2026-11-25")], new Set(), "2026-11-26");
    expect(k.hadiah).toEqual([{ kunci: "1:3", didapat: "2026-11-20", hangus: "2026-12-04", idPesanan: "3", status: "tersedia" }]);
    expect(k.stempel).toBe(1);
    expect(k.batas).toBe("2026-12-24");
  });
  it("stempel lewat jendela gugur satu per satu (jendela bergeser)", () => {
    const k = kartuLoyalti(aturan, [p("1", "2026-11-01"), p("2", "2026-11-25"), p("3", "2026-12-05"), p("4", "2026-12-10")], new Set(), "2026-12-11");
    // 1 Nov gugur saat 5 Des (lewat 30 Nov); 25 Nov + 5 Des + 10 Des = hadiah.
    expect(k.hadiah.map((h) => h.kunci)).toEqual(["1:4"]);
    expect(k.stempel).toBe(0);
  });
  it("stempel berjalan gugur bila jendela lewat hari ini", () => {
    const k = kartuLoyalti(aturan, [p("1", "2026-11-02"), p("2", "2026-11-10")], new Set(), "2026-12-05");
    expect(k.stempel).toBe(1);
    expect(k.batas).toBe("2026-12-09");
  });
  it("pesanan di bawah minimal, sebelum mulai, dan tanpa jendela", () => {
    const tanpaBatas = { ...aturan, jendelaHari: null, berlakuHari: null };
    const k = kartuLoyalti(tanpaBatas, [p("0", "2026-10-30"), p("1", "2026-11-02", 50_000), p("2", "2026-11-03"), p("3", "2027-05-01"), p("4", "2028-01-01")], new Set(), "2028-02-01");
    expect(k.hadiah).toEqual([{ kunci: "1:4", didapat: "2028-01-01", hangus: null, idPesanan: "4", status: "tersedia" }]);
    expect(k.batas).toBeNull();
  });
  it("status hadiah: dipakai & hangus", () => {
    const daftar = [p("1", "2026-11-02"), p("2", "2026-11-03"), p("3", "2026-11-04"), p("4", "2026-11-05"), p("5", "2026-11-06"), p("6", "2026-11-07")];
    const k = kartuLoyalti(aturan, daftar, new Set(["1:3"]), "2026-11-30");
    expect(k.hadiah.map((h) => h.status)).toEqual(["dipakai", "hangus"]);
  });
  it("kalimat aturan & draf WA", () => {
    expect(kalimatAturan({ ...aturan, hadiah: "Free 1 box Paket A" })).toBe("Pesan 3× (min. Rp 100.000/pesanan) dalam 30 hari → Free 1 box Paket A. Hadiah berlaku 14 hari.");
    expect(kalimatAturan({ ...aturan, minBelanja: null, jendelaHari: null, berlakuHari: null, hadiah: "Gratis ongkir" })).toBe("Pesan 3× → Gratis ongkir.");
    expect(pesanWaHadiah("Dina", 3, "Free 1 box Paket A", "2026-12-04")).toContain("sampai 4 Desember 2026");
  });
  it("minimal pax per pesanan & bonus tiap pesanan", () => {
    const a = { ...aturan, minBelanja: null, minPax: 4 };
    expect(memenuhi(a, p("1", "2026-11-02", 150_000, 3))).toBe(false);
    expect(memenuhi(a, p("1", "2026-11-02", 150_000, 4))).toBe(true);
    expect(kartuLoyalti(a, [p("1", "2026-11-02", 1, 4), p("2", "2026-11-03", 1, 2), p("3", "2026-11-04", 1, 5)], new Set(), "2026-11-05").stempel).toBe(2);
    expect(kalimatAturan({ ...a, hadiah: "1 botol minuman 120 ml", jenis: "tiap_pesanan" })).toBe("Setiap pesanan min. 4 pax → 1 botol minuman 120 ml.");
    expect(kalimatAturan({ ...a, syarat: 5, jendelaHari: 182, berlakuHari: null, hadiah: "Gratis 1 pax" })).toBe("Pesan 5× (min. 4 pax/pesanan) dalam 182 hari → Gratis 1 pax.");
  });
  it("tidak bisa digabung (dua arah)", () => {
    expect(bolehDigabung({ stackable: false }, [])).toBe(true);
    expect(bolehDigabung({ stackable: false }, [{ stackable: true }])).toBe(false);
    expect(bolehDigabung({ stackable: true }, [{ stackable: false }])).toBe(false);
    expect(bolehDigabung({ stackable: true }, [{ stackable: true }])).toBe(true);
  });
  it("gratis 1 pax: 4 pax × Rp50.000 = 200rb jadi 150rb, PBJT dari harga sesudah potongan", () => {
    const g = barisGratisPax(1, 50_000, 4);
    const t = hitungTotalDokumen({
      items: [
        { qty: 1, pax: 4, price: 50_000, charge_pb1: true, charge_service: false },
        { qty: 1, pax: g.pax, price: g.harga, charge_pb1: true, charge_service: false },
      ],
      pb1_enabled: true,
      pb1_percent: 10,
    });
    expect([t.subtotal.toFixed(0), t.pb1_amount.toFixed(0), t.grand_total.toFixed(0)]).toEqual(["150000", "15000", "165000"]);
    expect(barisGratisPax(3, 50_000, 2).pax).toBe(2);
  });
});
