import { describe, expect, it } from "vitest";

import { jamSuara, kalimatSuara, labelHari } from "./tim";

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
});
