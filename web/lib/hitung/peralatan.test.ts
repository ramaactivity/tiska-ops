import { describe, expect, it } from "vitest";

import { alatTersedia, hitungKembali, rekapAlatEvent } from "./peralatan";

describe("peralatan", () => {
  it("tersedia = milik − rusak − dipakai event lain; belum dihitung = null", () => {
    expect(alatTersedia(20, 2, 10)).toBe(8);
    expect(alatTersedia(20, 2, 30)).toBe(0);
    expect(alatTersedia(null, 0, 0)).toBeNull();
  });

  it("kembali: baik = keluar − rusak − hilang", () => {
    expect(hitungKembali(10, 1, 2)).toEqual({ baik: 7 });
    expect(hitungKembali(10, 0, 0)).toEqual({ baik: 10 });
    expect(hitungKembali(3, 2, 2)).toEqual({ galat: "Rusak + hilang (4) melebihi yang dibawa (3)." });
    expect("galat" in hitungKembali(3, 1.5, 0)).toBe(true);
  });

  it("rekap: milik vs sewaan, biaya sewa, ganti rugi; tanpa harga ganti dihitung terpisah", () => {
    const r = rekapAlatEvent([
      { milikSendiri: true, qty: 4, rusak: 0, hilang: 1, biayaSewa: null, hargaGanti: 1_500_000 },
      { milikSendiri: true, qty: 100, rusak: 3, hilang: 0, biayaSewa: null, hargaGanti: null },
      { milikSendiri: false, qty: 50, rusak: 0, hilang: 2, biayaSewa: "750000", hargaGanti: 20_000 },
    ]);
    expect([r.milik, r.sewaan, r.biayaSewa.toNumber(), r.gantiRugi.toNumber(), r.gantiTanpaHarga]).toEqual([2, 1, 750000, 1_540_000, 1]);
  });
});
