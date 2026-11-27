import { describe, expect, it } from "vitest";

import { briefJadwalTim, judulJadwalTim } from "../brief";
import { cariBentrok, type Penugasan } from "./penugasan";

const p = (x: Partial<Penugasan>): Penugasan => ({
  idEvent: "1",
  namaEvent: "BSI",
  tanggal: "2026-10-02",
  kloter: 1,
  jam: "05.00",
  orang: "n:pak agil",
  namaOrang: "Pak Agil",
  kendaraan: null,
  namaKendaraan: null,
  ...x,
});

describe("penugasan", () => {
  it("bentrok: orang/kendaraan sama di dua event pada tanggal sama; beda tanggal aman", () => {
    const b = cariBentrok([
      p({ kendaraan: "7", namaKendaraan: "Luxio" }),
      p({ idEvent: "2", namaEvent: "SICC", jam: "06.00", kendaraan: "7", namaKendaraan: "Luxio" }),
      p({ idEvent: "3", namaEvent: "Telkom", tanggal: "2026-10-03" }),
    ]);
    expect(b.get("1")).toEqual(["Pak Agil juga dijadwalkan di BSI (kloter 1 05.00) & SICC (kloter 1 06.00)", "Luxio juga dijadwalkan di BSI (kloter 1 05.00) & SICC (kloter 1 06.00)"]);
    expect(b.has("3")).toBe(false);
  });

  it("brief Jadwal Tim Service mengikuti format grup captain", () => {
    expect(
      briefJadwalTim({
        acara: "Ibu Mahya",
        tempat: "BSI Pajajaran",
        hariKe: 0,
        setup: false,
        adaSetupSebelumnya: false,
        picSales: null,
        perlengkapan: [],
        tanggal: "2026-10-02",
        picEo: "Luthfi/ Diah (Dimensio EO)",
        kloter: [
          {
            no: 1,
            jam: "05.00",
            catatan: "sekalian bawa menu Breakfast",
            anggota: [
              { nama: "Pak Nung", peran: "driver", kendaraan: "Luxio", tugas: "ambil bunga" },
              { nama: "Yoga", peran: "captain", kendaraan: null, tugas: null },
              { nama: "Pak Daud", peran: "steward", kendaraan: null, tugas: "itung alat piring2 dan sendok" },
            ],
          },
          { no: 2, jam: "06.00", catatan: null, anggota: [{ nama: "Pak Agil", peran: "delivery_lauk", kendaraan: null, tugas: null }] },
        ],
      }),
    ).toBe(
      [
        "⚙️ *JADWAL SERVICE [EVENT IBU MAHYA] @BSI Pajajaran*",
        "",
        "📆 *Jumat, 2 Oktober 2026*",
        "*PIC EO:* Luthfi/ Diah (Dimensio EO)",
        "⏰ *[KLOTER-1] 05.00 WIB berangkat dr Julang* sekalian bawa menu Breakfast",
        "💁🏻‍♂️ *Tim:*",
        "1. Pak Nung (Luxio) 👉🏻 ambil bunga",
        "2. Yoga (PIC)",
        "3. Pak Daud (Steward) 👉🏻 itung alat piring2 dan sendok",
        "———————————————",
        "⏰ *[KLOTER-2] 06.00 WIB berangkat dr Julang*",
        "💁🏻‍♂️ *Tim:*",
        "1. Pak Agil (Delivery Lauk)",
      ].join("\n"),
    );
  });

  it("loading set-up H-1 & kloter satu orang ala Mbak Ari (UNPAK 24 Nov, BMW 21 Nov)", () => {
    const umum = { acara: "Wisuda UNPAK", tempat: "Puri Begawan", picEo: null, picSales: "Bu Tinne & Rakhma" };
    expect(judulJadwalTim({ ...umum, hariKe: -1, setup: true, adaSetupSebelumnya: false })).toBe("JADWAL LOADING SET UP [EVENT WISUDA UNPAK] @Puri Begawan (H-1)");
    expect(judulJadwalTim({ ...umum, hariKe: 0, setup: true, adaSetupSebelumnya: true })).toBe("JADWAL SERVICE [EVENT WISUDA UNPAK] @Puri Begawan");
    expect(judulJadwalTim({ ...umum, hariKe: 0, setup: true, adaSetupSebelumnya: false })).toBe("JADWAL LOADING SET UP & SERVICE [EVENT WISUDA UNPAK] @Puri Begawan");
    const t = briefJadwalTim({
      ...umum,
      tanggal: "2026-11-24",
      hariKe: -1,
      setup: true,
      adaSetupSebelumnya: false,
      perlengkapan: [{ nama: "Taplak Cream fullength", qty: 18 }],
      kloter: [
        {
          no: 1,
          jam: "13.00",
          catatan: "1. Warna taplak Cream fullength + Runner Maroon\n2. Bawa lampu sorot",
          anggota: [
            { nama: "Pak Agil", peran: "driver", kendaraan: null, tugas: null },
            { nama: "Yoga", peran: "captain", kendaraan: null, tugas: null },
          ],
        },
        { no: 2, jam: "14.30", catatan: "Drop lauk di BMW\nDelivery Order Ibu Ina-Bintaro", anggota: [{ nama: "Pak Agil", peran: "driver", kendaraan: null, tugas: null }] },
      ],
    });
    expect(t.split("\n")).toEqual([
      "⚙️ *JADWAL LOADING SET UP [EVENT WISUDA UNPAK] @Puri Begawan (H-1)*",
      "",
      "📆 *Selasa, 24 November 2026*",
      "🧕🏻 *PIC Sales TC:* Bu Tinne & Rakhma",
      "⏰ *[KLOTER-1] 13.00 WIB berangkat dr Julang*",
      "💁🏻‍♂️ *Tim Set-up:*",
      "1. Pak Agil",
      "2. Yoga (PIC)",
      "",
      "📌 *Catatan Perlengkapan Peralatan:*",
      "1. Warna taplak Cream fullength + Runner Maroon",
      "2. Bawa lampu sorot",
      "———————————————",
      "⏰ *[KLOTER-2] 14.30 WIB berangkat dr Julang:* Pak Agil",
      "1. Drop lauk di BMW",
      "2. Delivery Order Ibu Ina-Bintaro",
      "———————————————",
      "🧺 *Perlengkapan dibawa:*",
      "1. Taplak Cream fullength = 18",
    ]);
  });
});
