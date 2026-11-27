import { expect, it } from "vitest";

import { POLA_UANG, tutupUang } from "./sembunyi-angka";

it("POLA_UANG menangkap format rupiah aplikasi, bukan angka biasa", () => {
  const ambil = (t: string) => [...t.matchAll(POLA_UANG)].map((m) => m[0]);
  expect(ambil("Total Rp 1.250.000 · DP -Rp 50.000")).toEqual(["Rp 1.250.000", "-Rp 50.000"]);
  expect(ambil("Omzet Rp12,5 jt bulan ini, layanan Rp1,5 juta")).toEqual(["Rp12,5 jt", "Rp1,5 juta"]);
  expect(ambil("55 box · jam 09.30 · 32%")).toEqual([]);
});

it("tutupUang mengganti nilai dengan bintang, tanda minus tetap", () => {
  expect(tutupUang("Total Rp 1.250.000 · DP -Rp 50.000 · 55 box")).toBe("Total Rp ****** · DP -Rp ****** · 55 box");
});
