import { describe, expect, it } from "vitest";

import { type DataProgres, progresEvent } from "./progres-event";

const data = (d: Partial<DataProgres>): DataProgres => ({
  status: "final",
  caraLayanan: "antar",
  tanggal: "2026-12-20",
  invoice: [],
  terkunci: false,
  kloter: [],
  jumlahBast: 0,
  rekap: null,
  ...d,
});
const selesai = (d: Partial<DataProgres>, hariIni = "2026-12-01") =>
  progresEvent(data(d), hariIni)
    .langkah.filter((l) => l.selesai)
    .map((l) => l.kunci);

describe("progres pesanan", () => {
  it("baru disetujui: hanya langkah pertama", () => {
    expect(selesai({})).toEqual(["disetujui"]);
  });

  it("DP dari pembayaran sebagian, lunas hanya bila SEMUA invoice lunas", () => {
    const dua = [{ status: "paid", dibayar: 5 }, { status: "unpaid", dibayar: 0 }];
    expect(selesai({ invoice: dua })).toEqual(["disetujui", "invoice", "dp"]);
    expect(selesai({ invoice: [{ status: "paid", dibayar: 5 }] })).toContain("lunas");
  });

  it("diambil customer: tanpa langkah tim; BAST hanya set-up & service", () => {
    const kunci = (c: string) => progresEvent(data({ caraLayanan: c }), "2026-12-01").langkah.map((l) => l.kunci);
    expect(kunci("ambil")).not.toContain("tim");
    expect(kunci("antar")).not.toContain("bast");
    expect(kunci("setup_service")).toContain("bast");
  });

  it("terkirim bila semua kloter selesai atau event ditandai selesai", () => {
    const k = [{ anggota: 3, selesai: true }, { anggota: 2, selesai: false }];
    expect(selesai({ kloter: k })).not.toContain("kirim");
    expect(selesai({ kloter: k.map((x) => ({ ...x, selesai: true })) })).toContain("kirim");
    expect(selesai({ status: "selesai" })).toEqual(expect.arrayContaining(["kunci", "tim", "kirim"]));
  });

  it("peringatan tim di H-2 s.d. hari H, invoice sesudah acara lewat", () => {
    expect(progresEvent(data({}), "2026-12-18").peringatan).toEqual(["Tim belum ditugaskan, acara H-2"]);
    expect(progresEvent(data({}), "2026-12-20").peringatan).toEqual(["Tim belum ditugaskan, acara hari ini"]);
    expect(progresEvent(data({}), "2026-12-17").peringatan).toEqual([]);
    expect(progresEvent(data({ kloter: [{ anggota: 1, selesai: false }] }), "2026-12-21").peringatan).toEqual(["Acara sudah lewat, invoice belum dibuat"]);
    expect(progresEvent(data({ caraLayanan: "ambil" }), "2026-12-20").peringatan).toEqual([]);
  });

  it("tanpa izin uang: langkah & peringatan invoice/pembayaran hilang", () => {
    const p = progresEvent(data({ kloter: [{ anggota: 1, selesai: false }] }), "2026-12-21", false);
    expect(p.langkah.map((l) => l.kunci)).toEqual(["disetujui", "kunci", "tim", "kirim", "rekap"]);
    expect(p.peringatan).toEqual([]);
  });

  it("batal: tanpa langkah", () => {
    expect(progresEvent(data({ status: "batal" }), "2026-12-01")).toEqual({ langkah: [], peringatan: [] });
  });
});
