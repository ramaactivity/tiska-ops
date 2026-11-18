import { describe, expect, it } from "vitest";

import { gridBulan, labelTanggal, periodeAktif, rapikanJam, rentangPeriode } from "./kalender";

describe("kalender", () => {
  it("Oktober 2026: 1 Okt hari Kamis → grid mulai Senin 28 Sep", () => {
    const g = gridBulan(2026, 9);
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ tanggal: "2026-09-28", hari: 28, diBulanIni: false });
    expect(g[3]).toEqual({ tanggal: "2026-10-01", hari: 1, diBulanIni: true });
    expect(g.filter((x) => x.diBulanIni)).toHaveLength(31);
  });

  it("label tanggal & jam dirapikan", () => {
    expect(labelTanggal("2026-10-20")).toBe("Sel, 20 Okt 2026");
    expect(rapikanJam("5")).toBe("05.00");
    expect(rapikanJam("05:30")).toBe("05.30");
    expect(rapikanJam("1130")).toBe("11.30");
    expect(rapikanJam("25.00")).toBeNull();
  });
});

describe("periode cepat laporan", () => {
  // Rabu 18 Nov 2026
  const h = "2026-11-18";
  it("rentang penuh, minggu Senin–Minggu", () => {
    expect(rentangPeriode("hari-ini", h)).toEqual({ dari: h, sampai: h });
    expect(rentangPeriode("minggu-ini", h)).toEqual({ dari: "2026-11-16", sampai: "2026-11-22" });
    expect(rentangPeriode("bulan-ini", h)).toEqual({ dari: "2026-11-01", sampai: "2026-11-30" });
    expect(rentangPeriode("bulan-lalu", h)).toEqual({ dari: "2026-10-01", sampai: "2026-10-31" });
    expect(rentangPeriode("tahun-ini", h)).toEqual({ dari: "2026-01-01", sampai: "2026-12-31" });
  });
  it("lintas bulan/tahun & hari Minggu", () => {
    expect(rentangPeriode("minggu-ini", "2026-11-01")).toEqual({ dari: "2026-10-26", sampai: "2026-11-01" });
    expect(rentangPeriode("bulan-lalu", "2026-01-15")).toEqual({ dari: "2025-12-01", sampai: "2025-12-31" });
    expect(rentangPeriode("bulan-ini", "2028-02-10")).toEqual({ dari: "2028-02-01", sampai: "2028-02-29" });
  });
  it("mengenali periode yang sedang terpilih", () => {
    expect(periodeAktif("2026-11-01", "2026-11-30", h)).toBe("bulan-ini");
    expect(periodeAktif("2026-11-01", "2026-11-18", h)).toBeNull();
    expect(periodeAktif("", "", h)).toBeNull();
  });
});

