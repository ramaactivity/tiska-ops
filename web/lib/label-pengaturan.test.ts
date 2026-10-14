import { describe, expect, it } from "vitest";

import { ambilJalur, KELOMPOK_PENGATURAN, susunJalur } from "./label-pengaturan";
import { BAWAAN, SKEMA_PENGATURAN } from "./pengaturan-bisnis";

describe("halaman Angka Bisnis", () => {
  it("memuat SETIAP angka bisnis — tidak ada yang tidak bisa diubah", () => {
    expect(KELOMPOK_PENGATURAN.map((k) => k.kunci).sort()).toEqual(Object.keys(BAWAAN).sort());
  });

  it("menyusun ulang tiap kelompok persis seperti bawaannya (jalur lengkap & benar)", () => {
    for (const k of KELOMPOK_PENGATURAN) {
      const pasangan = k.isian.map(([jalur]) => [jalur, ambilJalur(BAWAAN[k.kunci], jalur) as number] as [string, number]);
      const susun = susunJalur(pasangan);
      expect(susun, k.kunci).toEqual(BAWAAN[k.kunci]);
      expect(SKEMA_PENGATURAN.shape[k.kunci].safeParse(susun).success, k.kunci).toBe(true);
    }
  });
});
