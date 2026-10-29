import { describe, expect, it } from "vitest";

import { batasOrderBawaan, cekPesanan, hitungUntungPaket, jenisHari, namaProgram, nasiPutih, peringatanPaket, rapikanHp, rekapPorsi, teksFlyer } from "./ikut-menu-pesta";

describe("nama & tanggal program", () => {
  it("Sabtu/Minggu = Weekend, Senin = Weekday (flyer 6 & 7 Sep 2026)", () => {
    expect(jenisHari("2026-09-06")).toBe("Weekend");
    expect(jenisHari("2026-09-05")).toBe("Weekend");
    expect(jenisHari("2026-09-07")).toBe("Weekday");
    expect(namaProgram("2026-09-06")).toBe("Ikut Pesen Menu Pesta Tiska Weekend · Minggu, 06 September 2026");
  });
  it("batas order bawaan H-1 jam 14.00, lintas bulan", () => {
    expect(batasOrderBawaan("2026-09-06")).toEqual({ tanggal: "2026-09-05", jam: "14.00" });
    expect(batasOrderBawaan("2026-10-01")).toEqual({ tanggal: "2026-09-30", jam: "14.00" });
  });
});

describe("isi paket", () => {
  it("nasi putih ditolak, nasi olahan boleh", () => {
    expect(nasiPutih("Nasi Putih")).toBe(true);
    expect(nasiPutih("Steamed Rice")).toBe(true);
    expect(nasiPutih("Nasi Daun Jeruk")).toBe(false);
    expect(nasiPutih("Nasi Goreng Kampung")).toBe(false);
    expect(nasiPutih("Nasi Hainan")).toBe(false);
  });
  it("pola 2 protein + 1 sayur hanya diperingatkan", () => {
    const pas = [
      { nama: "Nasi Liwet Sunda", kategori: "rice" },
      { nama: "Empal Gepuk", kategori: "beef" },
      { nama: "Pepes Tahu", kategori: "egg_tofu" },
      { nama: "Tumis Baby Buncis XO", kategori: "vegetable" },
    ];
    expect(peringatanPaket(pas)).toEqual([]);
    // flyer 6 Sep paket 1: satu protein saja
    expect(peringatanPaket([{ nama: "Sate Daging Haas", kategori: "beef" }, { nama: "Tumis Baby Buncis XO", kategori: "vegetable" }])).toEqual([
      "Protein 1, polanya 2.",
    ]);
    expect(peringatanPaket([...pas, { nama: "Nasi Putih", kategori: "rice" }])).toContain("Ada nasi putih — tidak dijual di paket retail.");
    expect(peringatanPaket([])).toEqual(["Paket masih kosong."]);
  });
});

describe("hitungUntungPaket", () => {
  const dasar = { harga: 50_000, kemasan: 3_000, biayaAntar: 150_000, amanPct: 35, minPct: 30 };
  it("untung per pax, persen, nada, titik impas", () => {
    const r = hitungUntungPaket({ ...dasar, hppMenu: [8_000.5, 12_000, 4_000] });
    expect(r.hppMenu).toBe(24_000.5);
    expect(r.biayaPerPax).toBe(27_000.5);
    expect(r.untungPerPax).toBe(22_999.5);
    expect(r.untungPct).toBe(46);
    expect(r.nada).toBe("baik");
    expect(r.impasPax).toBe(7); // 150.000 / 22.999,5 = 6,5 → 7
  });
  it("di bawah batas minimum = bahaya, rugi = tanpa titik impas", () => {
    expect(hitungUntungPaket({ ...dasar, hppMenu: [30_500] }).nada).toBe("perhatian"); // untung 16.500 = 33%
    expect(hitungUntungPaket({ ...dasar, hppMenu: [34_000] }).nada).toBe("bahaya"); // untung 13.000 = 26% < 30%
    const rugi = hitungUntungPaket({ ...dasar, hppMenu: [49_000] });
    expect(rugi.untungPerPax).toBe(-2_000);
    expect(rugi.nada).toBe("bahaya");
    expect(rugi.impasPax).toBeNull();
  });
  it("menu tanpa HPP → tidak ditebak", () => {
    const r = hitungUntungPaket({ ...dasar, hppMenu: [10_000, null] });
    expect(r).toMatchObject({ hppMenu: null, menuTanpaHpp: 1, untungPct: null, nada: "netral" });
  });
});

describe("teksFlyer", () => {
  it("sama dengan data flyer 6 Sep, dengan keterangan PBJT & area Bogor", () => {
    expect(
      teksFlyer({
        tanggalKirim: "2026-09-06",
        batasOrder: { tanggal: "2026-09-05", jam: "14.00" },
        paket: [
          { judul: "the Menu 1", isi: ["Nasi Daun Jeruk", "Sate Daging Haas", "Tumis Baby Buncis XO", "Keripik Kentang"] },
          { judul: "the Menu 2", isi: ["Ayam Bakar Madu", "Dori Asam Manis Saus Mangga", "Tumis Baby Buncis XO"] },
        ],
        harga: 50_000,
        minPax: 4,
        area: "Bogor",
        kontak: "Admin +62 813-8310-8103 (Ida)",
      }),
    ).toBe(
      [
        "Open Pre-Order — Ikut Pesen Menu Pesta Tiska Weekend",
        "Pengiriman Minggu, 06 September 2026",
        "",
        "the Menu 1: Nasi Daun Jeruk · Sate Daging Haas · Tumis Baby Buncis XO · Keripik Kentang",
        "the Menu 2: Ayam Bakar Madu · Dori Asam Manis Saus Mangga · Tumis Baby Buncis XO",
        "",
        "50K per pax (belum termasuk PBJT)",
        "Minimum order 4 pax",
        "Free delivery area Bogor",
        "Last order: Sabtu, 05 September 2026 jam 14.00 WIB",
        "Pemesanan: Admin +62 813-8310-8103 (Ida)",
      ].join("\n"),
    );
  });
});

describe("pesanan (Tahap B)", () => {
  it("cekPesanan: minimal, kuota opsional, kosong", () => {
    expect(cekPesanan({ pax: [2, 2], minPax: 4, maksPax: null, paxTerpakai: 500 })).toBeNull();
    expect(cekPesanan({ pax: [3, 0], minPax: 4, maksPax: null, paxTerpakai: 0 })).toBe("Minimal order 4 pax (sekarang 3).");
    expect(cekPesanan({ pax: [0, 0], minPax: 4, maksPax: null, paxTerpakai: 0 })).toBe("Isi jumlah pax minimal di satu paket.");
    expect(cekPesanan({ pax: [10], minPax: 4, maksPax: 100, paxTerpakai: 95 })).toBe("Kuota tinggal 5 pax.");
    expect(cekPesanan({ pax: [5], minPax: 4, maksPax: 100, paxTerpakai: 95 })).toBeNull();
  });
  it("rapikanHp menyamakan +62 dan 0", () => {
    expect(rapikanHp("+62 813-8310-8103")).toBe(rapikanHp("0813 8310 8103"));
  });
  it("rekapPorsi: menu yang sama di dua paket dijumlah", () => {
    const r = rekapPorsi(
      [
        { idSet: "1", judul: "the Menu 1", isi: ["Nasi Daun Jeruk", "Tumis Baby Buncis XO"] },
        { idSet: "2", judul: "the Menu 2", isi: ["Ayam Bakar Madu", "Tumis Baby Buncis XO"] },
        { idSet: "3", judul: "the Menu 3", isi: ["Pepes Tahu"] },
      ],
      [{ idSet: "1", pax: 4 }, { idSet: "2", pax: 6 }, { idSet: "1", pax: 5 }],
    );
    expect(r.totalPax).toBe(15);
    expect(r.paket.map((p) => p.pax)).toEqual([9, 6, 0]);
    expect(r.menu).toEqual([
      { nama: "Nasi Daun Jeruk", porsi: 9 },
      { nama: "Tumis Baby Buncis XO", porsi: 15 },
      { nama: "Ayam Bakar Madu", porsi: 6 },
    ]);
  });
});
