import { describe, expect, it } from "vitest";

import { jatuhTempo, keadaanHutang, sisaTerima, statusPoSesudahTerima, teksPesanPo } from "./po";

describe("PO tempo & hutang", () => {
  it("jatuh tempo melewati akhir bulan; TOP 0 = hari itu", () => {
    expect(jatuhTempo("2026-10-19", 14)).toBe("2026-11-02");
    expect(jatuhTempo("2026-12-25", 30)).toBe("2027-01-24");
    expect(jatuhTempo("2026-10-19", 0)).toBe("2026-10-19");
  });

  it("sisa terima tidak minus; status sebagian/diterima", () => {
    expect(sisaTerima(10, "12.5").toString()).toBe("0");
    expect(sisaTerima("10", "2.5").toString()).toBe("7.5");
    expect(statusPoSesudahTerima([{ qty: 10, diterima: 10 }, { qty: 5, diterima: 2 }])).toBe("sebagian");
    expect(statusPoSesudahTerima([{ qty: 10, diterima: 10 }, { qty: "5", diterima: "5.000" }])).toBe("diterima");
  });

  it("keadaan hutang: lewat / segera (≤3 hari) / belum / lunas", () => {
    expect(keadaanHutang("belum", "2026-10-18", "2026-10-19")).toBe("lewat");
    expect(keadaanHutang("belum", "2026-10-22", "2026-10-19")).toBe("segera");
    expect(keadaanHutang("belum", "2026-10-23", "2026-10-19")).toBe("belum");
    expect(keadaanHutang("lunas", "2026-10-01", "2026-10-19")).toBe("lunas");
  });

  it("pesan PO untuk WA supplier", () => {
    expect(
      teksPesanPo({
        nomor: "PO/TC/2610/001",
        kontak: "Pak Asep",
        tanggalKirim: "2026-10-21",
        baris: [
          { nama: "Daging Ayam BLD", qty: "12.5", satuan: "kg" },
          { nama: "Telur", qty: 300, satuan: null },
        ],
        catatan: null,
      }),
    ).toBe(
      "Halo Pak Asep, ini pesanan dari Tiska Catering (PO/TC/2610/001):\n\n1. Daging Ayam BLD — 12,5 kg\n2. Telur — 300\n\nMohon dikirim Rabu, 21 Oktober.\nMohon konfirmasi ketersediaan dan harganya ya. Terima kasih.",
    );
  });
});
