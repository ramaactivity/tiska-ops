import { describe, expect, it } from "vitest";

import type { OrderLayar } from "@/lib/pesanan-dapur";

import { drafRencana, linimasa, posisi, type Rencana, rentangJam, teksSuara, teksWa, TITIK_MS } from "./rencana-masak";

const unpak: Rencana = {
  tanggal: "2026-11-25",
  judul: "ORDER Snack-Lunch Box & Buffet [WISUDA UNPAK]",
  catatan: "1. Siapkan pembagian tim DW",
  sesi: [
    {
      judul: "Sesi Masak-1; Snack Box, Snack Senat + Breakfast/ Sarapan Pagi",
      batch: "[Batch-1] Tim DW Packing 1.693 Snack Box + 30 Snack Box Senat (Pagi)",
      langkah: [
        { mulai: "04.00", selesai: null, teks: "[KLOTER-1] Siap delivery estafet ke Puri Begawan", rincian: "1.100 Snack Box\n- 80 pax Menu Breakfast" },
        { mulai: "01.00", selesai: "02.30", teks: "Target nata isi Snack Box = 550 box pertama 👉🏻 langsung masuk mobil", rincian: "" },
        { mulai: "00.00", selesai: "01.00", teks: "Tim DW estafet mulai gelar Snack box di Outentika", rincian: "" },
      ],
    },
  ],
};

describe("teksWa", () => {
  it("menyusun format Mbak Rita, langkah urut jam, kloter tebal dengan muatan", () => {
    expect(teksWa(unpak)).toBe(
      [
        "📌 *JADWAL PERSIAPAN MASAK + PACKING ORDER Snack-Lunch Box & Buffet [WISUDA UNPAK]*",
        "📆 Rabu, 25 Nov 2026",
        "⏰ 00.00-04.00 WIB",
        "——————————————-",
        "👨🏼‍🍳👩🏻‍🍳 *Sesi Masak-1; Snack Box, Snack Senat + Breakfast/ Sarapan Pagi*",
        "💁🏻‍♂️ *[Batch-1] Tim DW Packing 1.693 Snack Box + 30 Snack Box Senat (Pagi):*",
        "",
        "⏰ *00.00-01.00:* Tim DW estafet mulai gelar Snack box di Outentika",
        "⏰ *01.00-02.30:* Target nata isi Snack Box = 550 box pertama 👉🏻 langsung masuk mobil",
        "⏰ *04.00: [KLOTER-1] Siap delivery estafet ke Puri Begawan*",
        "- 1.100 Snack Box",
        "- 80 pax Menu Breakfast",
        "——————————————-",
        "‼️ *Catatan:*",
        "1. Siapkan pembagian tim DW",
      ].join("\n"),
    );
  });
  it("rencana kosong: tanpa baris jam", () => {
    expect(rentangJam({ judul: "", catatan: "", sesi: [] })).toBeNull();
  });
});

describe("linimasa & posisi", () => {
  const l = linimasa([unpak]);
  const pukul = (j: string) => Date.parse(`2026-11-25T${j}:00+07:00`);
  it("urut jam mulai, berwaktu WIB", () => {
    expect(l.map((x) => x.jamMulai)).toEqual(["00.00", "01.00", "04.00"]);
    expect(l[2].rincian).toEqual(["1.100 Snack Box", "80 pax Menu Breakfast"]);
  });
  it("tumpang tindih: dua langkah berjalan bersamaan; kloter tetap tampil 10 menit", () => {
    const dua = linimasa([{ ...unpak, sesi: [{ ...unpak.sesi[0], langkah: [...unpak.sesi[0].langkah, { mulai: "01.30", selesai: "03.30", teks: "Sesi masak Breakfast", rincian: "" }] }] }]);
    expect(posisi(dua, pukul("02:00")).sekarang.map((x) => x.jamMulai)).toEqual(["01.00", "01.30"]);
    expect(posisi(dua, pukul("02:00")).berikutnya.map((x) => x.jamMulai)).toEqual(["04.00"]);
    expect(posisi(l, pukul("04:00") + TITIK_MS - 1).sekarang.map((x) => x.jamMulai)).toEqual(["04.00"]);
    expect(posisi(l, pukul("04:00") + TITIK_MS)).toEqual({ sekarang: [], berikutnya: [] });
  });
  it("selesai lebih kecil dari mulai = lewat tengah malam", () => {
    const m = linimasa([{ ...unpak, sesi: [{ judul: "", batch: "", langkah: [{ mulai: "23.00", selesai: "01.00", teks: "Masak", rincian: "" }] }] }]);
    expect(m[0].selesai! - m[0].mulai).toBe(2 * 3_600_000);
  });
});

describe("drafRencana", () => {
  const o: OrderLayar = {
    id: "1",
    nama: "WISUDA UNPAK",
    tempat: "PURI BEGAWAN - Jalan Raya Pajajaran",
    jamTeks: "06.00",
    jam: "06.00",
    catatanDapur: null,
    kloter: [],
    items: [
      { nama: "[SESI I PAGI · 06.00] Snack Box", jumlah: "1.693 BOX", jam: null, isi: [], catatan: [] },
      { nama: "[SESI I PAGI · 06.00] Breakfast", jumlah: "80 PAX", jam: null, isi: [], catatan: [] },
      { nama: "[SESI II SIANG · 11.00] Lunch Box", jumlah: "333 BOX", jam: null, isi: [], catatan: [] },
    ],
  };
  it("satu Sesi Masak per sesi pesanan, dihitung mundur dari jam sesi, kloter bernomor", () => {
    const d = drafRencana([o]);
    expect(d.judul).toBe("ORDER [WISUDA UNPAK]");
    expect(d.sesi.map((s) => s.judul)).toEqual(["Sesi Masak-1; SESI I PAGI", "Sesi Masak-2; SESI II SIANG"]);
    expect(d.sesi[0].batch).toBe("Packing 1.693 Snack Box + 80 pax Breakfast [WISUDA UNPAK]");
    expect(d.sesi[0].langkah.map((l) => [l.mulai, l.selesai])).toEqual([["03.00", "05.00"], ["05.00", "05.45"], ["06.00", null]]);
    expect(d.sesi[1].langkah[2]).toMatchObject({ mulai: "11.00", teks: "[KLOTER-2] Siap delivery ke PURI BEGAWAN", rincian: "333 Lunch Box" });
  });
  it("jam dini hari tidak mundur ke hari sebelumnya", () => {
    const d = drafRencana([{ ...o, jam: "01.00", items: [{ nama: "Nasi Box", jumlah: "50 BOX", jam: null, isi: [], catatan: [] }] }]);
    expect(d.sesi[0].langkah[0].mulai).toBe("00.00");
  });
});

it("teksSuara membuang emoji & kurung siku", () => {
  expect(teksSuara("[KLOTER-1] Siap 👉🏻 masuk mobil 👨🏼‍🍳")).toBe("KLOTER-1 Siap masuk mobil");
});
