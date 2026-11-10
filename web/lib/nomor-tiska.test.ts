import { describe, expect, it } from "vitest";

import { awalanNomor, namaBerkasCetak, nomorRevisi } from "./nomor-tiska";

describe("nomor Tiska (D-007)", () => {
  it("bulan menurut WIB — 31 Okt 20.00 UTC sudah November di Jakarta", () => {
    expect(awalanNomor("QUO", new Date("2026-10-16T03:00:00Z"))).toBe("QUO/TC/2610/");
    expect(awalanNomor("INV", new Date("2026-10-31T20:00:00Z"))).toBe("INV/TC/2611/");
    // Tanggal dokumen dari form ("2026-08-31" → tengah malam UTC = 07.00 WIB) tetap bulan Agustus.
    expect(awalanNomor("INV", new Date("2026-08-31"))).toBe("INV/TC/2608/");
    expect(awalanNomor("QUO", new Date("2026-08-01"))).toBe("QUO/TC/2608/");
  });

  it("revisi: asli tanpa akhiran, revisi pertama -R2, akhiran lama diganti", () => {
    expect(nomorRevisi("QUO/TC/2610/006", 0)).toBe("QUO/TC/2610/006");
    expect(nomorRevisi("QUO/TC/2610/006", 1)).toBe("QUO/TC/2610/006-R2");
    expect(nomorRevisi("QUO/TC/2610/006-R2", 2)).toBe("QUO/TC/2610/006-R3");
    expect(nomorRevisi("QUO-2026-0001", 1)).toBe("QUO-2026-0001-R2");
  });

  it("nama berkas PDF: garis miring jadi strip", () => {
    expect(namaBerkasCetak("QUO/TC/2610/006-R2")).toBe("QUO-TC-2610-006-R2");
    expect(namaBerkasCetak("06/QUO-TC/10/26-rev 2")).toBe("06-QUO-TC-10-26-rev-2");
  });
});
