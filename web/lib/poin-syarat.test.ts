import { describe, expect, it } from "vitest";

import { nomorPoin, tulisPoin, uraiPoin } from "./poin-syarat";

const ASLI = [
  "KEADAAN MEMAKSA (Force Majeure) Dalam situasi darurat",
  "1 Sudah termasuk standar pengaturan tata meja.",
  "2 Sudah termasuk standar dekorasi catering:",
  "2.1 Set rangkai bunga meja Buffet",
  "2.2 Set rangkai dekorasi area Gubuk/ Stall",
  "3 Penambahan order minimal 10% dari total.",
  "*) Setiap tambahan sewa peralatan wajib diikuti staff clear-up",
].join("\n");

describe("poin S&K", () => {
  it("bolak-balik tanpa mengubah naskah", () => {
    expect(tulisPoin(uraiPoin(ASLI))).toBe(ASLI);
  });
  it("nomor dihitung ulang setelah poin dihapus/dipindah", () => {
    const p = uraiPoin(ASLI).filter((_, i) => i !== 1);
    expect(nomorPoin(p)).toEqual(["", "1", "1.1", "1.2", "2", ""]);
    expect(tulisPoin(p).split("\n")[1]).toBe("1 Sudah termasuk standar dekorasi catering:");
  });
  it("poin kosong dibuang, baris baru di dalam poin dirapatkan", () => {
    expect(tulisPoin([{ jenis: "poin", teks: "A\nB" }, { jenis: "poin", teks: "  " }, { jenis: "poin", teks: "C" }])).toBe("1 A B\n2 C");
  });
});
