import { describe, expect, it } from "vitest";

import { kelompokTagih, nomorWa, pesanPengingat } from "./penagihan";

const H = "2026-10-16";

describe("kelompok penagihan", () => {
  it("lewat tempo tanpa kabar → tagih; dihubungi ≤3 hari / janji aktif → menunggu", () => {
    expect(kelompokTagih({ tempo: ["2026-08-30"], kontakTerakhir: null, janji: null }, H)).toEqual({ kelompok: "tagih", terlambat: 47, menujuTempo: Infinity });
    expect(kelompokTagih({ tempo: ["2026-08-30"], kontakTerakhir: "2026-10-14", janji: null }, H).kelompok).toBe("menunggu");
    expect(kelompokTagih({ tempo: ["2026-08-30"], kontakTerakhir: "2026-10-01", janji: null }, H).kelompok).toBe("tagih");
    expect(kelompokTagih({ tempo: ["2026-08-30"], kontakTerakhir: "2026-10-01", janji: "2026-10-17" }, H).kelompok).toBe("menunggu");
    expect(kelompokTagih({ tempo: ["2026-08-30"], kontakTerakhir: "2026-10-01", janji: "2026-10-15" }, H).kelompok).toBe("tagih");
  });

  it("belum lewat: ≤7 hari → segera; lebih → belum", () => {
    expect(kelompokTagih({ tempo: ["2026-10-20", "2026-11-30"], kontakTerakhir: null, janji: null }, H)).toEqual({ kelompok: "segera", terlambat: 0, menujuTempo: 4 });
    expect(kelompokTagih({ tempo: ["2026-10-25"], kontakTerakhir: null, janji: null }, H).kelompok).toBe("belum");
  });

  it("draf pesan & nomor WA", () => {
    expect(pesanPengingat([{ nomor: "INV/TC/2608/017", sisa: "4380000", tempo: "2026-08-30" }])).toBe(
      "Selamat siang Kak, kami dari Tiska Catering mau mengingatkan invoice INV/TC/2608/017 sebesar Rp 4.380.000 (jatuh tempo 30 Agu 2026).\n\nMohon info jadwal pembayarannya ya, Kak. Terima kasih.",
    );
    expect(nomorWa("0812-0000-1111")).toBe("6281200001111");
    expect(nomorWa("+62 812 0000 1111")).toBe("6281200001111");
    expect(nomorWa("-")).toBeNull();
  });
});
