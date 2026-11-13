import { describe, expect, it } from "vitest";

import { pecahSyarat } from "./teks-syarat";

describe("pecahSyarat (D-163)", () => {
  it("memecah S&K Tiska jadi judul + butir bernomor, baris kosong dibuang", () => {
    const t = "Termin Pembayaran Deposit :\n\n1 Tahap : Approval\n2. Pelunasan h+7\n3) Transfer BCA\nCatatan lepas";
    expect(pecahSyarat(t)).toEqual([
      { jenis: "judul", isi: "Termin Pembayaran Deposit:" },
      { jenis: "butir", nomor: "1", isi: "Tahap : Approval" },
      { jenis: "butir", nomor: "2", isi: "Pelunasan h+7" },
      { jenis: "butir", nomor: "3", isi: "Transfer BCA" },
      { jenis: "teks", isi: "Catatan lepas" },
    ]);
  });

  it("baris huruf kapital semua jadi judul", () => {
    expect(pecahSyarat("SYARAT DAN KETENTUAN PEMESANAN DI TISKA CATERING")[0].jenis).toBe("judul");
    expect(pecahSyarat("LOST & BREAKABLE: Adanya kehilangan")[0].jenis).toBe("teks");
  });

  it("sub-butir 5.1 menjorok di bawah induknya", () => {
    expect(pecahSyarat("5.1 Set rangkai bunga")).toEqual([{ jenis: "butir", nomor: "5.1", isi: "Set rangkai bunga", anak: true }]);
  });

  it("angka yang bukan nomor butir (mis. nominal) tidak dipecah", () => {
    expect(pecahSyarat("50% uang muka")[0].jenis).toBe("teks");
    expect(pecahSyarat("2026 harga naik")[0].jenis).toBe("teks");
  });
});
