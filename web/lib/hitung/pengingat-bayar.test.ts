import { describe, expect, it } from "vitest";

import { jatuhTempoBerikut, keadaanTagihan, labelSisa, pesanPengingatBayar, sisaHari } from "./pengingat-bayar";

describe("pengingat bayar", () => {
  it("jatuh tempo berikutnya menjaga tanggal tetap, akhir bulan untuk bulan pendek", () => {
    expect(jatuhTempoBerikut("2026-01-31", 1, 31)).toBe("2026-02-28");
    expect(jatuhTempoBerikut("2026-02-28", 1, 31)).toBe("2026-03-31");
    expect(jatuhTempoBerikut("2026-11-20", 1, 20)).toBe("2026-12-20");
    expect(jatuhTempoBerikut("2026-12-20", 1, 20)).toBe("2027-01-20");
    expect(jatuhTempoBerikut("2026-11-30", 3, 30)).toBe("2027-02-28");
    expect(jatuhTempoBerikut("2028-02-29", 12, 29)).toBe("2029-02-28");
  });
  it("sisa hari & keadaan", () => {
    expect(sisaHari("2026-11-05", "2026-11-02")).toBe(3);
    expect(sisaHari("2026-10-31", "2026-11-02")).toBe(-2);
    expect(keadaanTagihan(-1, 3)).toBe("lewat");
    expect(keadaanTagihan(0, 3)).toBe("hari-ini");
    expect(keadaanTagihan(3, 3)).toBe("segera");
    expect(keadaanTagihan(4, 3)).toBe("nanti");
    expect(labelSisa(1)).toBe("besok");
    expect(labelSisa(-2)).toBe("lewat 2 hari");
  });
  it("pesan push: yang lewat dulu, maks 4 baris", () => {
    expect(pesanPengingatBayar([])).toBeNull();
    const p = pesanPengingatBayar([
      { nama: "Wifi kantor", sisa: 1, nominal: 350000 },
      { nama: "Air PDAM", sisa: -2, nominal: null },
    ])!;
    expect(p.judul).toBe("⚠️ 1 tagihan lewat jatuh tempo");
    expect(p.isi).toBe("Air PDAM (lewat 2 hari) · Wifi kantor (besok, Rp 350.000)");
    const banyak = pesanPengingatBayar(Array.from({ length: 6 }, (_, i) => ({ nama: `T${i}`, sisa: i + 1, nominal: null })))!;
    expect(banyak.judul).toBe("🔔 6 tagihan perlu dibayar");
    expect(banyak.isi.endsWith("· +2 lagi")).toBe(true);
  });
});
