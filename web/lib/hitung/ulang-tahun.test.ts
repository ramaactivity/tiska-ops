import { describe, expect, it } from "vitest";

import { hariMenuju, mendatang, tanggalSah, teksDaftarWa } from "./ulang-tahun";

describe("ulang tahun", () => {
  it("tanggal sah", () => {
    expect(tanggalSah(29, 2)).toBe(true);
    expect(tanggalSah(30, 2)).toBe(false);
    expect(tanggalSah(31, 4)).toBe(false);
    expect(tanggalSah(31, 12)).toBe(true);
    expect(tanggalSah(0, 1)).toBe(false);
  });

  it("hari menuju: hari ini 0, besok 1, sudah lewat → tahun depan", () => {
    expect(hariMenuju({ hari: 28, bulan: 10 }, "2026-10-28")).toBe(0);
    expect(hariMenuju({ hari: 29, bulan: 10 }, "2026-10-28")).toBe(1);
    expect(hariMenuju({ hari: 1, bulan: 1 }, "2026-12-31")).toBe(1);
    expect(hariMenuju({ hari: 27, bulan: 10 }, "2026-10-28")).toBe(364);
  });

  it("29 Februari dirayakan 28 Februari di tahun biasa, 29 di tahun kabisat", () => {
    expect(hariMenuju({ hari: 29, bulan: 2 }, "2027-02-28")).toBe(0);
    expect(hariMenuju({ hari: 29, bulan: 2 }, "2028-02-28")).toBe(1);
  });

  it("mendatang: urut terdekat dalam n hari", () => {
    const d = [
      { nama: "A", hari: 3, bulan: 11 },
      { nama: "B", hari: 28, bulan: 10 },
      { nama: "C", hari: 1, bulan: 1 },
    ];
    expect(mendatang(d, "2026-10-28", 7).map((u) => [u.nama, u.lagi])).toEqual([
      ["B", 0],
      ["A", 6],
    ]);
  });

  it("teks WA: per bulan, tanggal sama digabung, bulan kosong dilewati", () => {
    expect(
      teksDaftarWa([
        { nama: "Reza Devyan", hari: 6, bulan: 12 },
        { nama: "Ramadan Saputra", hari: 1, bulan: 1 },
        { nama: "Bimo Dewanto", hari: 6, bulan: 12 },
      ]),
    ).toBe(
      "🎂 *DAFTAR ULANG TAHUN TIM/ KARYAWAN TC* 🎂\n\n📅 *JANUARI*\n- 01 Januari – Ramadan Saputra\n\n📅 *DESEMBER*\n- 06 Desember – Bimo Dewanto & Reza Devyan",
    );
  });
});
