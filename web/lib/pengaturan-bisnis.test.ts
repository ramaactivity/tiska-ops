import { describe, expect, it } from "vitest";

import { BAWAAN, gabungPengaturan, SKEMA_PENGATURAN } from "./pengaturan-bisnis";

describe("angka bisnis bawaan", () => {
  it("lolos skemanya sendiri", () => {
    expect(SKEMA_PENGATURAN.safeParse(BAWAAN).success).toBe(true);
  });

  it("sesuai contoh acuan PDGI (Bogor): layanan 15% dari 11.912.500 di atas minimum", () => {
    const { pct, min } = BAWAAN.layanan_perlengkapan.bogor;
    expect(Math.max((11_912_500 * pct) / 100, min)).toBe(1_786_875);
    expect((11_912_500 * BAWAAN.pbjt_pct) / 100).toBe(1_191_250);
  });
});

describe("menimpa bawaan dengan yang tersimpan", () => {
  it("baris sah menggantikan satu kunci utuh, kunci lain tetap bawaan", () => {
    const { pengaturan, ditolak } = gabungPengaturan([
      { key: "termin", value: { ...BAWAAN.termin, dp_pct: 30 } },
    ]);
    expect(ditolak).toEqual([]);
    expect(pengaturan.termin.dp_pct).toBe(30);
    expect(pengaturan.pbjt_pct).toBe(10);
  });

  it("baris rusak atau kunci asing diabaikan, bawaan tetap dipakai", () => {
    const { pengaturan, ditolak } = gabungPengaturan([
      { key: "pbjt_pct", value: "sepuluh" },
      { key: "kunci_asing", value: 1 },
    ]);
    expect(ditolak).toEqual(["pbjt_pct", "kunci_asing"]);
    expect(pengaturan.pbjt_pct).toBe(10);
  });

  it("tidak mengubah BAWAAN", () => {
    gabungPengaturan([{ key: "termin", value: { ...BAWAAN.termin, dp_pct: 20 } }]);
    expect(BAWAAN.termin.dp_pct).toBe(50);
  });
});
