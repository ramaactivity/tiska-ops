import { describe, expect, it } from "vitest";

import { bagiRata, drafPersiapan, labelH, type Persiapan, pertahankanTercapai, rentangTanggal, rincianBox, targetHariIni, teksAgenda, teksPersiapan } from "./persiapan";

// Data asli UNPAK (pesan Mbak Ari 25 Nov 2026): 60 + 1.693 + 1.705 + 333 = 3.791 box, lipat 19–22 Nov.
const unpak: Persiapan = {
  target: [
    {
      judul: "Lipat box",
      satuan: "box",
      rincian: [
        { nama: "Snack Box Senat", jumlah: 60 },
        { nama: "Snack Box Peserta", jumlah: 3398 },
        { nama: "Lunch Box 20x20", jumlah: 333 },
      ],
      harian: [
        { tanggal: "2026-11-19", target: 791, tercapai: 791 },
        { tanggal: "2026-11-20", target: 750, tercapai: 500 },
        { tanggal: "2026-11-21", target: 750, tercapai: 0 },
        { tanggal: "2026-11-22", target: 1500, tercapai: 0 },
      ],
    },
  ],
  agenda: [
    { judul: "Persiapan Ruang Nata Box di OUTENTIKA", tim: "Tim Bapak-Bapak", dari: "2026-11-23", sampai: "2026-11-25", butir: ["Tolong rapihkan ruang bekas acara Sabtu kemarin", "Screen dilipat n disimpan kembali"] },
    { judul: "Bantu-bantu tim ibu-ibu persiapan bikin kue", tim: "Tim Ibu-Ibu", dari: "2026-11-23", sampai: "2026-11-24", butir: [] },
  ],
};

describe("persiapan acara", () => {
  it("tanggal & H-n gaya Mbak Ari", () => {
    expect(labelH("2026-11-19", "2026-11-25")).toBe("H-6");
    expect(labelH("2026-11-25", "2026-11-25")).toBe("H");
    expect(rentangTanggal("2026-11-23", "2026-11-25")).toBe("Senin-Rabu, 23-25 Nov 2026");
    expect(rentangTanggal("2026-11-25", "2026-11-25")).toBe("Rabu, 25 Nov 2026");
    expect(rentangTanggal("2026-11-30", "2026-12-02")).toBe("Senin-Rabu, 30 Nov-2 Des 2026");
  });

  it("bagi rata: sisa ke hari pertama; draf dari pesanan H-6 s.d. H-3", () => {
    expect(bagiRata(3791, ["a", "b", "c", "d"]).map((h) => h.target)).toEqual([950, 947, 947, 947]);
    expect(rincianBox([{ nama: "[SESI I PAGI] SNACK BOX", qty: 1693, satuan: "box" }, { nama: "SNACK BOX", qty: 1705, satuan: "BOX" }, { nama: "BUFFET", qty: 120, satuan: "pax" }])).toEqual([{ nama: "SNACK BOX", jumlah: 3398 }]);
    // Event menyimpan box sebagai "1 box × 29 pax" (UNPAK 14 Nov).
    expect(rincianBox([{ nama: "[08.00 - Tiba Di Lokasi] SNACK BOX", qty: 1, pax: 29, satuan: "box" }])).toEqual([{ nama: "SNACK BOX", jumlah: 29 }]);
    const d = drafPersiapan([{ nama: "Snack Box", qty: 400, satuan: "box" }], "2026-11-25");
    expect(d.target[0].harian.map((h) => [h.tanggal, h.target])).toEqual([["2026-11-19", 100], ["2026-11-20", 100], ["2026-11-21", 100], ["2026-11-22", 100]]);
    expect(drafPersiapan([{ nama: "Buffet", qty: 100, satuan: "pax" }], "2026-11-25").target).toEqual([]);
  });

  it("simpan jadwal tidak menimpa angka tercapai", () => {
    const baru = { ...unpak, target: [{ ...unpak.target[0], harian: unpak.target[0].harian.map((h) => ({ ...h, tercapai: 0 })) }] };
    expect(pertahankanTercapai(baru, unpak).target[0].harian.map((h) => h.tercapai)).toEqual([791, 500, 0, 0]);
  });

  it("teks UPDATE target format Mbak Ari", () => {
    const t = teksPersiapan(unpak, { acara: "Wisuda UNPAK", tanggalAcara: "2026-11-25", hariIni: "2026-11-22" });
    expect(t.split("\n").slice(0, 13)).toEqual([
      "‼️ *UPDATE Target Lipat box:*",
      "*Perihal:* Persiapan Acara Wisuda UNPAK [H-3]",
      "📆 *Minggu, 22 Nov 2026*",
      "*Total Order:*",
      "1. Snack Box Senat = 60",
      "2. Snack Box Peserta = 3.398",
      "3. Lunch Box 20x20 = 333",
      "👉🏻 *Total = 3.791 box*",
      "———————————————",
      "📦 *JADWAL SELESAI LIPAT BOX*",
      "👉🏻 Target per hari adalah SELESAI:",
      "📆 *19 Nov = 791 box* ✅",
      "📆 *20 Nov = 750 box* (baru 500)",
    ]);
    expect(t).toContain("👩🏻‍🍳 *BANTU-BANTU TIM IBU-IBU PERSIAPAN BIKIN KUE (Tim Ibu-Ibu):*\n📆 Senin-Selasa, 23-24 Nov 2026");
  });

  it("teks agenda 'To: Tim Bapak-Bapak'", () => {
    expect(teksAgenda(unpak.agenda[0], { acara: "Wisuda UNPAK", tanggalAcara: "2026-11-25" }).split("\n")).toEqual([
      "📣📣📣 *To: Tim Bapak-Bapak*",
      "*Perihal:* Persiapan Ruang Nata Box di OUTENTIKA — Persiapan Acara Wisuda UNPAK [H-2]",
      "📆 *Senin-Rabu, 23-25 Nov 2026*",
      "———————————————",
      "1. Tolong rapihkan ruang bekas acara Sabtu kemarin",
      "2. Screen dilipat n disimpan kembali",
    ]);
  });

  it("target hari ini untuk TV", () => {
    expect(targetHariIni(unpak, "2026-11-20")).toEqual([
      { judul: "Lipat box", satuan: "box", target: 750, tercapai: 500, totalTarget: 3791, totalTercapai: 1291, sampaiHariIni: 1541 },
    ]);
    expect(targetHariIni(unpak, "2026-11-23")).toEqual([]);
  });
});
