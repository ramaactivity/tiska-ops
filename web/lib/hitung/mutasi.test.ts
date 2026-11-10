import { describe, expect, it } from "vitest";

import { kartuMutasi, rekapMutasi } from "./mutasi";

const m = [
  { id: "1", idBahan: "A", tanggal: "2026-10-28", qty: 10 },
  { id: "2", idBahan: "A", tanggal: "2026-11-02", qty: 5 },
  { id: "3", idBahan: "A", tanggal: "2026-11-02", qty: -3 },
  { id: "4", idBahan: "A", tanggal: "2026-11-15", qty: -4.5 },
  { id: "5", idBahan: "A", tanggal: "2026-12-01", qty: -1 },
  { id: "6", idBahan: "B", tanggal: "2026-11-03", qty: -2 },
  { id: "7", idBahan: "C", tanggal: "2026-12-05", qty: 9 },
];

describe("rekapMutasi", () => {
  it("saldo awal, masuk, keluar, akhir per bahan; bahan di luar periode tidak muncul", () => {
    const r = rekapMutasi(m, "2026-11-01", "2026-11-30");
    expect(r.map((x) => [x.idBahan, x.awal.toNumber(), x.masuk.toNumber(), x.keluar.toNumber(), x.akhir.toNumber()])).toEqual([
      ["A", 10, 5, 7.5, 7.5],
      ["B", 0, 0, 2, -2],
    ]);
  });
});

describe("kartuMutasi", () => {
  it("saldo berjalan mulai dari saldo awal, urut tanggal lalu id", () => {
    const k = kartuMutasi(m.filter((x) => x.idBahan === "A"), "2026-11-01", "2026-11-30");
    expect(k.awal.toNumber()).toBe(10);
    expect(k.baris.map((b) => [b.id, b.saldo.toNumber()])).toEqual([
      ["2", 15],
      ["3", 12],
      ["4", 7.5],
    ]);
    expect(k.akhir.toNumber()).toBe(7.5);
  });
});
