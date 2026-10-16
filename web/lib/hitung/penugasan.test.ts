import { describe, expect, it } from "vitest";

import { briefJadwalTim } from "../brief";
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
        judul: "Ibu Mahya-BSI Pajajaran",
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
        "⚙️ *JADWAL TIM SERVICE [H]: IBU MAHYA-BSI PAJAJARAN*",
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
});
