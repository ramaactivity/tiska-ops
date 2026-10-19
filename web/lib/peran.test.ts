import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bolehBuka, halamanAwal, MENU } from "./navigasi";
import {
  aksesPenuh,
  bolehKelolaPricelist,
  bolehKelolaUang,
  bolehLihatBiaya,
  bolehUbahAngkaBisnis,
  bolehUbahPaket,
  bolehUbahResep,
  PERAN,
  type Peran,
} from "./peran";

const kosong = new Map<string, boolean>();
const LAPANGAN: Peran[] = ["direksi", "captain", "driver", "field"];

describe("daftar peran", () => {
  it("sama persis dengan CHECK constraint di scripts/tambah-peran-tiska.mjs", () => {
    // Peran yang ada di kode tetapi tidak di database: memilihnya di layar
    // User ditolak dengan galat yang tidak menyebut sebabnya.
    // Bukan import.meta.url: di lingkungan jsdom alamatnya bukan file://.
    const skrip = readFileSync(path.join(process.cwd(), "scripts/tambah-peran-tiska.mjs"), "utf8");
    const daftar = JSON.parse(skrip.match(/const PERAN = (\[[^\]]*\])/)![1]);
    expect(daftar).toEqual([...PERAN]);
  });
});

describe("angka rahasia (D-006)", () => {
  it("HPP, biaya, margin hanya untuk admin, owner, finance, cost", () => {
    const boleh = PERAN.filter(bolehLihatBiaya);
    expect(boleh).toEqual(["admin", "owner", "finance", "cost"]);
  });

  it("mengelola uang hanya admin, owner, finance", () => {
    expect(PERAN.filter(bolehKelolaUang)).toEqual(["admin", "owner", "finance"]);
  });

  it("owner setara admin: membuka seluruh halaman, termasuk pengaturan", () => {
    expect(aksesPenuh("owner")).toBe(true);
    for (const kelompok of MENU) {
      for (const b of kelompok.butir) expect(bolehBuka("owner", b.kunci, kosong), b.kunci).toBe(true);
    }
  });
});

describe("peran lapangan", () => {
  it("tidak membuka satu pun halaman kantor secara bawaan", () => {
    for (const p of LAPANGAN) {
      for (const kelompok of MENU) {
        for (const b of kelompok.butir) {
          expect(bolehBuka(p, b.kunci, kosong), `${p} membuka ${b.kunci}`).toBe(false);
        }
      }
    }
  });

  it("mendarat di Beranda, bukan Dashboard yang memuat omzet perusahaan", () => {
    for (const p of LAPANGAN) expect(halamanAwal(p, kosong), p).toBe("/beranda");
  });
});

describe("business development", () => {
  it("membuka quotation, lead, customer, product, paket — tanpa margin dan keuangan", () => {
    const terbuka = MENU.flatMap((k) => k.butir)
      .filter((b) => bolehBuka("bizdev", b.kunci, kosong))
      .map((b) => b.kunci);
    expect(terbuka).toEqual(["penawaran", "lead", "pelanggan", "produk", "paket", "pricelist", "event", "pengiriman"]);
    expect(bolehLihatBiaya("bizdev")).toBe(false);
  });
});

describe("dapur & gudang", () => {
  it("dapur & kepala dapur membuka Resep, gudang & kepala dapur membuka Bahan — tanpa biaya", () => {
    const buka = (p: Peran) =>
      MENU.flatMap((k) => k.butir).filter((b) => bolehBuka(p, b.kunci, kosong)).map((b) => b.kunci);
    expect(buka("kepala_dapur")).toEqual(["resep", "menu", "bahan", "kebutuhan-bahan", "event", "pengiriman", "layar-dapur"]);
    expect(buka("dapur")).toEqual(["resep", "layar-dapur"]);
    expect(buka("gudang")).toEqual(["bahan", "kebutuhan-bahan", "belanja", "uang-muka", "po", "supplier"]);
    for (const p of ["kepala_dapur", "dapur", "gudang"] as Peran[]) expect(bolehLihatBiaya(p), p).toBe(false);
    expect(halamanAwal("dapur", kosong)).toBe("/resep");
  });
});

describe("ubah resep", () => {
  it("hanya kepala dapur, owner, admin", () => {
    expect(PERAN.filter(bolehUbahResep)).toEqual(["admin", "owner", "kepala_dapur"]);
  });
});

describe("angka bisnis", () => {
  it("hanya admin, owner, finance yang boleh mengubah", () => {
    expect(PERAN.filter(bolehUbahAngkaBisnis)).toEqual(["admin", "owner", "finance"]);
  });
});

describe("ubah paket", () => {
  it("hanya admin, owner, finance — sales hanya melihat", () => {
    expect(PERAN.filter(bolehUbahPaket)).toEqual(["admin", "owner", "finance"]);
  });
});

describe("pricelist", () => {
  it("unggah versi & ubah status: admin, owner, sales, bizdev", () => {
    expect(PERAN.filter(bolehKelolaPricelist)).toEqual(["admin", "owner", "sales", "bizdev"]);
  });
});
