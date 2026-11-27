import { describe, expect, it } from "vitest";

import type { OrderLayar } from "@/lib/pesanan-dapur";

import { bebanAngka, bedaPesanan, drafGabungan, drafRencana, gabungHari, keBerangkat, lamaNata, linimasa, posisi, type Rencana, rentangJam, sidikPesanan, teksSuara, teksWa, TITIK_MS } from "./rencana-masak";

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

describe("jadwal per pesanan", () => {
  it("bedaPesanan: jam, jumlah berubah, baris baru & hilang", () => {
    const lama = { jam: "06.00", items: [["Snack Box", "1.693 BOX"], ["Breakfast", "80 PAX"]] as [string, string][] };
    expect(bedaPesanan(lama, lama)).toEqual([]);
    expect(
      bedaPesanan(lama, { jam: "07.00", items: [["Snack Box", "1.750 BOX"], ["Lunch Box", "333 BOX"]] }),
    ).toEqual(["Jam: 06.00 → 07.00", "Snack Box: 1.693 BOX → 1.750 BOX", "Baru: Lunch Box 333 BOX", "Dihapus: Breakfast 80 PAX"]);
  });
  it("sidikPesanan mengabaikan baris judul tanpa jumlah", () => {
    expect(sidikPesanan({ jam: null, items: [{ nama: "STARTER", jumlah: null, jam: null, isi: [], catatan: [] }, { nama: "Sup", jumlah: "50 PAX", jam: null, isi: [], catatan: [] }] })).toEqual({ jam: null, items: [["Sup", "50 PAX"]] });
  });
  it("gabungHari: satu pesanan apa adanya; beberapa pesanan → judul & catatan bernama", () => {
    const a = { ...unpak, pesanan: "UNPAK" };
    expect(gabungHari(unpak.tanggal, [a])).toBe(a);
    const g = gabungHari(unpak.tanggal, [a, { tanggal: unpak.tanggal, pesanan: "CIFOR", judul: "x", catatan: "", sesi: [] }]);
    expect(g.judul).toBe("ORDER [UNPAK + CIFOR]");
    expect(g.catatan).toBe("UNPAK: 1. Siapkan pembagian tim DW");
    expect(g.sesi).toHaveLength(1);
  });
  it("linimasa membawa nama pesanan", () => {
    expect(linimasa([{ ...unpak, pesanan: "UNPAK" }])[0].pesanan).toBe("UNPAK");
  });
});

describe("jadwal gabungan (pola Mbak Rita 27 Nov)", () => {
  const o = (nama: string, jam: string | null, jamTeks: string | null, items: [string, string][]): OrderLayar => ({
    id: nama,
    nama,
    tempat: null,
    jamTeks,
    jam,
    catatanDapur: null,
    kloter: [],
    items: items.map(([n, j]) => ({ nama: n, jumlah: j, jam: null, isi: [], catatan: [] })),
  });
  const lala = o("Kak Lala", "09.30", "09.30", [["LUNCH BOX", "55 BOX"], ["FAMILY BERKAT", "4 PAKET"], ["Packaging", "4 PCS"], ["FAMILY BERKAT", "1 PAKET"], ["Packaging", "1 PCS"]]);
  const mila = o("Ibu Mila", "11.00", "11.00 - Tiba Di Lokasi", [["MENU PESTA WEEKEND", "1 BOX"]]);
  const tekmet = o("Snack Box TekMet", "12.45", "12.45", [["Snack Box", "15 BOX"]]);

  it("jam 'tiba di lokasi' → berangkat 60 menit sebelumnya; jam biasa = jam berangkat", () => {
    expect(keBerangkat("11.00", "11.00 - Tiba Di Lokasi")).toBe("10.00");
    expect(keBerangkat("09.30", "09.30 WIB brkt dr Julang")).toBe("09.30");
    expect(bebanAngka(lala)).toBe(65);
    expect([lamaNata(65), lamaNata(1), lamaNata(160)]).toEqual([60, 30, 120]);
  });

  it("draf sama dengan jadwal Mbak Rita: masak bersama 06.00, nata bergiliran urut berangkat, delivery per pesanan", () => {
    const d = drafGabungan([tekmet, mila, lala]);
    expect(d.sesi[0].judul).toBe("Sesi Masak 1 [Pagi-Siang] Snack Box TekMet, Ibu Mila, Kak Lala");
    expect(d.sesi.map((s) => s.langkah.map((l) => `${l.mulai}${l.selesai ? `-${l.selesai}` : ""} ${l.teks}`))).toEqual([
      ["06.00-08.30 Estafet siap masak-matang", "08.30-09.30 Nata menu Kak Lala masuk packing", "09.30 Siap delivery order Kak Lala brkt dr Julang"],
      ["09.30-10.00 Nata menu Ibu Mila masuk packing", "10.00 Siap delivery order Ibu Mila brkt dr Julang"],
      ["10.15-12.15 Estafet masak-matang menu Snack Box TekMet", "12.15-12.45 Nata menu Snack Box TekMet masuk packing", "12.45 Siap delivery order Snack Box TekMet brkt dr Julang"],
    ]);
  });

  it("teks WA gabungan: ORDER BESOK, daftar pesanan bernomor, blok dipisah garis", () => {
    const t = teksWa({ ...drafGabungan([lala, mila]), tanggal: "2026-11-27", gabungan: ["Kak Lala", "Ibu Mila"] }, "2026-11-26");
    expect(t.split("\n").slice(0, 9)).toEqual([
      "*JADWAL PERSIAPAN ORDER BESOK:*",
      "📆 *Jumat, 27 Nov 2026*",
      "1. Kak Lala",
      "2. Ibu Mila",
      "---------------------------",
      "👩🏻‍🍳👨🏼‍🍳 *Sesi Masak 1 [Pagi] Kak Lala, Ibu Mila:*",
      "",
      "⏰ *06.00-08.30:* Estafet siap masak-matang",
      "⏰ *08.30-09.30:* Nata menu Kak Lala masuk packing",
    ]);
    expect(t).toContain("------------------------------\n⏰ *09.30-10.00:* Nata menu Ibu Mila masuk packing\n⏰ *10.00:* Siap delivery order Ibu Mila brkt dr Julang");
  });

  it("pesanan besar pagi: masak tetap ≥2 jam (mundur dari 06.00); pesanan sore dimasak sendiri", () => {
    const besar = o("Ibu Gerdha", "09.00", "09.00–10.00", [["LUNCH BOX", "225 BOX"]]);
    const sore = o("Ibu Ina", "15.00", "15.00", [["Nasi Box", "20 BOX"]]);
    const d = drafGabungan([besar, sore]);
    expect(d.sesi[0].langkah[0]).toMatchObject({ mulai: "05.00", selesai: "07.00", teks: "Estafet siap masak-matang" });
    expect(d.sesi[1].langkah.map((l) => `${l.mulai}-${l.selesai ?? ""} ${l.teks}`)).toEqual([
      "12.30-14.30 Estafet masak-matang menu Ibu Ina",
      "14.30-15.00 Nata menu Ibu Ina masuk packing",
      "15.00- Siap delivery order Ibu Ina brkt dr Julang",
    ]);
  });

  it("pesanan tanpa jam tidak dijadwalkan, dicatat", () => {
    const d = drafGabungan([lala, o("Bu X", null, null, [["Nasi", "5 BOX"]])]);
    expect(d.catatan).toBe("Jam belum diisi di invoice: Bu X");
    expect(d.sesi).toHaveLength(1);
  });
});
