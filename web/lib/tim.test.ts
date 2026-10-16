import { describe, expect, it } from "vitest";

import { ambangPengumuman, jamSuara, kalimatSuara, labelHari, menitMenuju, statusBerikutnya, statusDapurBerikutnya, tandaiAmbang } from "./tim";

describe("halaman tim", () => {
  it("jam dibaca alami", () => {
    expect(jamSuara("05.00")).toBe("jam lima pagi");
    expect(jamSuara("13.30")).toBe("jam satu siang lewat tiga puluh menit");
    expect(jamSuara("16.15")).toBe("jam empat sore lewat lima belas menit");
    expect(jamSuara("12.00")).toBe("jam dua belas siang");
  });

  it("label hari: hari ini / besok / tanggal pendek", () => {
    expect(labelHari("2026-10-16", "2026-10-16")).toBe("Hari ini");
    expect(labelHari("2026-10-17", "2026-10-16")).toBe("Besok");
    expect(labelHari("2026-11-10", "2026-10-16")).toBe("Sel, 10 Nov");
  });

  it("kalimat suara lengkap untuk driver", () => {
    expect(
      kalimatSuara({ tanggal: "2026-10-17", hariIni: "2026-10-16", jam: "05.00", kendaraan: "Grand Max", tugas: "ambil bunga", tujuan: "BSI Pajajaran", peran: "driver" }),
    ).toBe("Besok, Sabtu, tujuh belas Oktober. Berangkat jam lima pagi dari Julang. Kamu bawa Grand Max. Tugas khusus: ambil bunga. Tujuan: BSI Pajajaran.");
  });

  it("status kirim berurutan: berangkat → tiba → selesai", () => {
    expect(statusBerikutnya([])).toBe("berangkat");
    expect(statusBerikutnya(["berangkat"])).toBe("tiba");
    expect(statusBerikutnya(["berangkat", "tiba"])).toBe("selesai");
    expect(statusBerikutnya(["berangkat", "tiba", "selesai"])).toBeNull();
  });

  it("layar dapur: menit menuju berangkat (WIB) & ambang pengumuman", () => {
    const kini = new Date("2026-10-16T21:30:00Z"); // 04.30 WIB 17 Okt
    expect(menitMenuju("2026-10-17", "05.00", kini)).toBe(30);
    expect(menitMenuju("2026-10-17", "04.00", kini)).toBe(-30);
    expect(ambangPengumuman(28, [60])).toBe(30);
    expect(ambangPengumuman(28, [60, 30])).toBeNull();
    expect(ambangPengumuman(10, [60, 30])).toBe(15);
    expect(ambangPengumuman(90, [])).toBeNull();
    // Mengumumkan 30 ikut menandai 60 — tidak boleh menyusul "60 menit lagi".
    expect(ambangPengumuman(24, tandaiAmbang(30))).toBeNull();
    expect(tandaiAmbang(15)).toEqual([15, 30, 60]);
  });

  it("status masak terpisah dari status kirim", () => {
    expect(statusDapurBerikutnya(["berangkat"])).toBe("dimasak");
    expect(statusDapurBerikutnya(["dimasak", "packing"])).toBe("siap");
    expect(statusBerikutnya(["dimasak", "packing", "siap"])).toBe("berangkat");
  });
});
