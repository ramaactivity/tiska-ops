import { describe, expect, it } from "vitest";

import { bagiHalaman, bebanPesanan, dapurMenu, hariMenujuUltah, jamPertama, namaTempat, pecahNama, pisahSesi, saringIsiDapur, tanggalBaris, teksSisa } from "./dapur-layar";
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

describe("mode TV: bagi halaman", () => {
  const k = (order: string, tinggi = 100) => ({ tinggi, order, kepala: true });
  const i = (order: string, tinggi = 200) => ({ tinggi, order, kepala: false });
  it("isi muat satu layar → satu halaman", () => {
    expect(bagiHalaman([k("a"), i("a"), i("a")], 80, 1000)).toEqual([{ blok: [0, 1, 2], lanjutan: null }]);
  });
  it("pesanan panjang dipotong; halaman berikutnya diberi kepala lanjutan", () => {
    expect(bagiHalaman([k("a"), i("a"), i("a"), i("a"), i("a")], 80, 600)).toEqual([
      { blok: [0, 1, 2], lanjutan: null },
      { blok: [3, 4], lanjutan: "a" },
    ]);
  });
  it("kepala pesanan tidak sendirian di dasar halaman", () => {
    expect(bagiHalaman([k("a"), i("a"), k("b"), i("b")], 80, 450)).toEqual([
      { blok: [0, 1], lanjutan: null },
      { blok: [2, 3], lanjutan: null },
    ]);
  });
  it("bagian Besok selalu mulai di halaman baru, bersama pesanan pertamanya", () => {
    expect(bagiHalaman([k("a"), i("a"), { tinggi: 50, order: null, kepala: false, halamanBaru: true }, k("b"), i("b")], 80, 1000)).toEqual([
      { blok: [0, 1], lanjutan: null },
      { blok: [2, 3, 4], lanjutan: null },
    ]);
  });
  it("blok lebih tinggi dari layar dapat halaman sendiri", () => {
    expect(bagiHalaman([k("b"), i("b", 950)], 80, 1000)).toEqual([
      { blok: [0], lanjutan: null },
      { blok: [1], lanjutan: "b" },
    ]);
  });
});

describe("label sesi di judul baris", () => {
  it("kurung di depan jadi sesi; sisanya nama", () => {
    expect(pisahSesi("[SESI I PAGI - 06.00] SNACK PAGI")).toEqual({ sesi: "SESI I PAGI - 06.00", nama: "SNACK PAGI" });
    expect(pisahSesi("[SESI II SIANG 11.00 - TIBA DILOKASI]")).toEqual({ sesi: "SESI II SIANG 11.00 - TIBA DILOKASI", nama: "" });
    expect(pisahSesi("LUNCH BOX 20x20 [BS-02] Nasi Ayam")).toEqual({ sesi: null, nama: "LUNCH BOX 20x20 [BS-02] Nasi Ayam" });
  });
});

describe("nama tempat untuk layar dapur", () => {
  it("alamat lengkap dipangkas jadi nama tempat", () => {
    expect(namaTempat("PURI BEGAWAN - Jalan Raya Pajajaran No 5-7. Bogor")).toBe("PURI BEGAWAN");
    expect(namaTempat("Vila Bogor Indah #Blok DD-10/ No. 2-3 (masuk Pos Rajawali dekat kolam renang)")).toBe("Vila Bogor Indah");
    expect(namaTempat("Cafetaria & DG Residence @HQ CIFOR")).toBe("Cafetaria & DG Residence");
    expect(namaTempat("Rumah Danau Bogor Raya")).toBe("Rumah Danau Bogor Raya");
    expect(namaTempat(null)).toBeNull();
  });
});

describe("nama panjang dipecah untuk TV", () => {
  it("judul pendek + keterangan", () => {
    expect(pecahNama("FAMILY BERKAT [Nasi Keranjang 30x30]; Nasi Liwet Kecombrang (Isi 5 porsi)")).toEqual({ utama: "FAMILY BERKAT", detail: "Nasi Keranjang 30x30 · Nasi Liwet Kecombrang (Isi 5 porsi)" });
    expect(pecahNama("LUNCH BOX 20x20 [BS-02] Nasi Ayam Bakar Madu")).toEqual({ utama: "LUNCH BOX 20x20", detail: "BS-02 Nasi Ayam Bakar Madu" });
    expect(pecahNama("Packaging: 4 set Keranjang Bambu + sleeve + pita")).toEqual({ utama: "Packaging", detail: "4 set Keranjang Bambu + sleeve + pita" });
    expect(pecahNama("Snack pagi")).toEqual({ utama: "Snack pagi", detail: null });
    expect(pecahNama("[X] Abc")).toEqual({ utama: "[X] Abc", detail: null });
  });
});

describe("mode santai", () => {
  it("beban kerja per satuan, terbesar dulu", () => {
    expect(bebanPesanan([{ jumlah: 1693, satuan: "box" }, { jumlah: 80, satuan: "pax" }, { jumlah: 1705, satuan: "BOX" }, { jumlah: 120, satuan: "pax" }])).toBe("3.398 box · 200 pax");
    expect(bebanPesanan([{ jumlah: 55, satuan: "box" }, { jumlah: 4, satuan: "paket" }, { jumlah: 4, satuan: "pcs" }, { jumlah: 1, satuan: "paket" }, { jumlah: 0, satuan: "set" }])).toBe("55 box · 5 paket · 4 pcs");
    expect(bebanPesanan([{ jumlah: 30, satuan: null }])).toBe("30 pax");
    expect(bebanPesanan([])).toBe("");
  });
  it("hari menuju ulang tahun, termasuk lewat tahun", () => {
    expect(hariMenujuUltah("2026-11-27", 11, 27)).toBe(0);
    expect(hariMenujuUltah("2026-11-27", 12, 1)).toBe(4);
    expect(hariMenujuUltah("2026-12-30", 1, 2)).toBe(3);
    expect(hariMenujuUltah("2026-11-27", 11, 26)).toBe(364);
  });
});
