import { describe, expect, it } from "vitest";

import { bandingkanVersi, type SalinanPenawaran } from "./revisi";

const dasar: SalinanPenawaran = {
  nomor: "QUO/TC/2610/001",
  tanggal: "2026-10-16",
  berlaku: "2026-10-30",
  tanggalAcara: ["2026-10-20"],
  tamu: 40,
  subtotal: "1940000",
  layanan: "0",
  pajak: "194000",
  ppn: "0",
  delivery: "0",
  total: "2134000",
  baris: [
    { nama: "[BS-15] Ikan Dori", hari: "1", qty: "40", pax: null, harga: "48500", nilai: "1940000", sesi: "", isi: ["Nasi Putih", "Ayam Kemangi"] },
  ],
  biaya: [],
};

describe("perbandingan versi quotation", () => {
  it("menu ditukar, qty & harga berubah, baris baru, total berubah", () => {
    const baru: SalinanPenawaran = {
      ...dasar,
      subtotal: "2400000",
      total: "2640000",
      pajak: "240000",
      baris: [
        { ...dasar.baris[0], qty: "50", harga: "48000", isi: ["Nasi Putih", "Ayam Bakar Madu"] },
        { nama: "Sewa chafing dish", hari: "1", qty: "4", pax: null, harga: "0", nilai: "0", sesi: "", isi: [] },
      ],
    };
    const h = bandingkanVersi(dasar, baru);
    expect(h.baris).toEqual([
      { jenis: "ubah", nama: "[BS-15] Ikan Dori", rincian: ["jumlah 40 → 50", "harga Rp 48.500 → Rp 48.000", "menu Ayam Kemangi → Ayam Bakar Madu"] },
      { jenis: "tambah", nama: "Sewa chafing dish" },
    ]);
    expect(h.angka.map((a) => a.label)).toEqual(["Subtotal", "PBJT", "Total"]);
    expect(h.angka.at(-1)).toEqual({ label: "Total", lama: "Rp 2.134.000", baru: "Rp 2.640.000" });
  });

  it("tidak ada perubahan → kosong; baris dihapus terdeteksi", () => {
    expect(bandingkanVersi(dasar, dasar)).toEqual({ angka: [], baris: [] });
    expect(bandingkanVersi(dasar, { ...dasar, baris: [] }).baris).toEqual([{ jenis: "hapus", nama: "[BS-15] Ikan Dori" }]);
  });
});
