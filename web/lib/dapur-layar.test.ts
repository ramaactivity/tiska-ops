import { describe, expect, it } from "vitest";

import { dapurMenu, jamPertama, saringIsiDapur, tanggalBaris, teksSisa } from "./dapur-layar";
import { hariKeDalamNama, tanggalDalamNama } from "./hari-berikutnya";

describe("dapur per baris (D-097)", () => {
  it("kolom kitchen menang; kategori jadi tebakan; tak dikenal → masak", () => {
    expect(dapurMenu({ kitchen: "pastry", category: "chicken" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "dessert" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "beverage" })).toBe("pastry");
    expect(dapurMenu({ kitchen: null, category: "chicken" })).toBe("masak");
    expect(dapurMenu(undefined)).toBe("masak");
  });
  it("saring baris per dapur; baris campuran ikut di keduanya", () => {
    const peta: Record<string, ("masak" | "pastry")[]> = { "Soup: Soto": ["masak"], "Dessert: Puding": ["pastry"], "Snack: Risoles + Puding": ["masak", "pastry"] };
    const isi = Object.keys(peta);
    const f = (b: string) => new Set(peta[b]);
    expect(saringIsiDapur(isi, f, "pastry")).toEqual(["Dessert: Puding", "Snack: Risoles + Puding"]);
    expect(saringIsiDapur(isi, f, "masak")).toEqual(["Soup: Soto", "Snack: Risoles + Puding"]);
  });
});

describe("pesanan dari invoice (26 Nov)", () => {
  const baca = { tanggal: tanggalDalamNama, hariKe: hariKeDalamNama };
  it("berhari-hari: tanggal di judul menang, baris tanpa tanggal ikut baris di atasnya (INV/TC/2611/030)", () => {
    const nama = [
      "Arrival: Organic-BBQ DINNER BUFFET (Forest to Table-East Meet West); Minggu, 29 Nov 2026",
      "EQUIL Sparkling Water 380ml [1 dus = 12 pcs]",
      "Day-1: Organic-LUNCH (Peranakan-Baba Nyonya) BUFFET [Senin, 30 Nov 2026]",
      "Day-2: Organic-LUNCH (Korean) BUFFET [Selasa, 1 Des 2026]",
    ];
    const acara = ["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"];
    expect(tanggalBaris(nama, acara, baca)).toEqual(["2026-11-29", "2026-11-29", "2026-11-30", "2026-12-01"]);
  });
  it("tanpa tanggal tertulis: Day n → tanggal acara ke-n; baris sebelum hari pertama tampil tiap hari", () => {
    const nama = ["Air mineral galon", "Day 1 - LUNCH BUFFET [Nusantara]", "Day 2 - LUNCH BUFFET [Western]", "Kerupuk"];
    expect(tanggalBaris(nama, ["2026-12-08", "2026-12-07"], baca)).toEqual([null, "2026-12-07", "2026-12-08", "2026-12-08"]);
  });
  it("satu tanggal acara: semua baris di tanggal itu, apa pun judulnya", () => {
    expect(tanggalBaris(["[SESI I PAGI - 06.00] SNACK PAGI", "Day-3 X [Rabu, 2 Des 2026]"], ["2026-11-25"], baca)).toEqual(["2026-11-25", "2026-11-25"]);
  });
  it("jam pertama dari teks bebas tim", () => {
    expect(jamPertama("09.30 WIB brkt dr Julang")).toBe("09.30");
    expect(jamPertama("06.00–15.00")).toBe("06.00");
    expect(jamPertama("6:05 - Ready To Serve")).toBe("06.05");
    expect(jamPertama("08.00 WIB dan 11.00 WIB - tiba dilokasi")).toBe("08.00");
    expect(jamPertama("Siang")).toBeNull();
    expect(jamPertama(null)).toBeNull();
    expect(jamPertama("2026.11")).toBeNull();
  });
});

describe("teks sisa waktu", () => {
  it("menit, jam, lewat", () => {
    expect(teksSisa(0)).toBe("0 menit lagi");
    expect(teksSisa(45)).toBe("45 menit lagi");
    expect(teksSisa(60)).toBe("1 jam lagi");
    expect(teksSisa(130)).toBe("2 jam 10 menit lagi");
    expect(teksSisa(-1)).toBeNull();
    expect(teksSisa(null)).toBeNull();
  });
});
