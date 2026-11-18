import { describe, expect, it } from "vitest";

import { judulHariBerikutnya } from "./hari-berikutnya";

describe("judul hari berikutnya — gaya asli tim (18 Nov 2026)", () => {
  it("Mbak Rakhma: [DAY 9] Minggu, 15 November 2026 → [DAY 10] Senin, 16 November 2026", () => {
    expect(judulHariBerikutnya("[DAY 9] Minggu, 15 November 2026 - Lunch & Dinner Box")).toBe("[DAY 10] Senin, 16 November 2026 - Lunch & Dinner Box");
  });

  it("Rita: DAY-1 [Sabtu, 7 Nov 2026] → DAY-2 [Minggu, 8 Nov 2026] (bulan pendek tetap pendek)", () => {
    expect(judulHariBerikutnya("DAY-1 [Sabtu, 7 Nov 2026] Lunch & Dinner Box: Nasi Ayam Goreng Laos")).toBe("DAY-2 [Minggu, 8 Nov 2026] Lunch & Dinner Box: Nasi Ayam Goreng Laos");
  });

  it("Mas Reza: Day 1 - LUNCH BUFFET [Nusantara] → Day 2 (tanpa tanggal)", () => {
    expect(judulHariBerikutnya("Day 1 - LUNCH BUFFET [Nusantara]")).toBe("Day 2 - LUNCH BUFFET [Nusantara]");
  });

  it("ganti bulan & tahun", () => {
    expect(judulHariBerikutnya("[DAY 3] Kamis, 31 Desember 2026 - Dinner")).toBe("[DAY 4] Jumat, 1 Januari 2027 - Dinner");
  });

  it("tanggal acara bercelah: lompat ke tanggal acara berikutnya, bukan +1 hari", () => {
    expect(judulHariBerikutnya("[DAY 1] Minggu, 15 November 2026 - Lunch", ["2026-11-15", "2026-11-19"])).toBe("[DAY 2] Kamis, 19 November 2026 - Lunch");
  });

  it("tanggal terakhir di daftar → +1 hari", () => {
    expect(judulHariBerikutnya("[DAY 2] Kamis, 19 November 2026", ["2026-11-15", "2026-11-19"])).toBe("[DAY 3] Jumat, 20 November 2026");
  });

  it("nama hari huruf besar tetap huruf besar; tanpa nama hari tetap tanpa", () => {
    expect(judulHariBerikutnya("MEAL ARRANGEMENT [DAY-1] DINNER; SABTU, 24 OKTOBER 2026 19.00 WIB ready to serve")).toBe("MEAL ARRANGEMENT [DAY-2] DINNER; MINGGU, 25 OKTOBER 2026 19.00 WIB ready to serve");
    expect(judulHariBerikutnya("RESEPSI 15 November 2026")).toBe("RESEPSI 16 November 2026");
  });

  it("bukan judul hari → null (tombolnya tidak muncul)", () => {
    expect(judulHariBerikutnya("COFFEE BREAK DUPLO")).toBeNull();
    expect(judulHariBerikutnya("Nasi Box Holiday")).toBeNull();
  });
});
