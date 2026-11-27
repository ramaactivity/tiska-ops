import { expect, it } from "vitest";

import { kurangPesanan, pesanKelengkapan } from "./kelengkapan";

it("kurangPesanan: pick-up tidak butuh tempat & driver", () => {
  expect(kurangPesanan({ jam: "09.30", jamTeks: "09.30", tempat: "Vila Bogor Indah #Blok DD" }, { jadwal: true, driver: true })).toEqual([]);
  expect(kurangPesanan({ jam: null, jamTeks: null, tempat: null }, { jadwal: false, driver: false })).toEqual(["jam", "tempat", "jadwal masak", "driver"]);
  expect(kurangPesanan({ jam: "09.30", jamTeks: "09.30 ready to PICK-UP", tempat: null }, { jadwal: true, driver: false })).toEqual([]);
});

it("pesanKelengkapan: ringkas, tetap terkirim saat kosong", () => {
  const p = pesanKelengkapan(
    "2026-11-28",
    [
      { kunci: "a", nama: "Kak Lala", jam: "09.30", kurang: [] },
      { kunci: "b", nama: "Ibu Mila", jam: null, kurang: ["jam", "driver"] },
    ],
    1,
  );
  expect(p).toEqual({
    judul: "Besok 2 pesanan · 1 lengkap",
    isi: "Sabtu, 28 Nov. Ibu Mila: jam, driver belum · 1 invoice belum ada tanggal acaranya · Cocokkan dengan grup WA.",
    url: "/jadwal-masak?tgl=2026-11-28",
    tag: "kelengkapan-2026-11-28",
  });
  expect(pesanKelengkapan("2026-11-28", [], 0).judul).toBe("Besok belum ada pesanan di aplikasi");
});
