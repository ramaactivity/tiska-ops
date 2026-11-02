import { describe, expect, it } from "vitest";

import { type AturanLoyalti, kalimatAturan, kartuLoyalti, pesanWaHadiah } from "./loyalti";

const aturan: AturanLoyalti = { id: "1", syarat: 3, minBelanja: 100_000, jendelaHari: 30, berlakuHari: 14, mulai: "2026-11-01" };
const p = (id: string, tanggal: string, nilai = 150_000) => ({ id, tanggal, nilai });

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
});
