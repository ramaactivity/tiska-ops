import { describe, expect, it } from "vitest";

import { tebakJenisAcara } from "./acara";

describe("jenis acara ditebak dari nama (D-163)", () => {
  it("nama acara Tiska yang sebenarnya", () => {
    const kasus: [string, string | null][] = [
      ["BRIN Business Lunch (Guest Visit)", "meeting"],
      ["Lunch Meeting With Regional Director", "meeting"],
      ["Pengajian Syukuran Pernikahan Nurul - Ben", "pengajian"],
      ["Holy Matrimony & Resepsi [The Wedding of Calvin & Gracia]", "pernikahan"],
      ["Gwen's 17th Birthday [Ultah Anak]", "ulang_tahun"],
      ["Grand Opening Zeelandia", "peresmian"],
      ["Santunan Anak Yatim", "sosial"],
      ["Kunjungan Kerja Spesifik", "seminar"],
      ["Mr. Robert's Farewell Party", "gathering"],
      ["Workshop", "seminar"],
      ["Lunch Gathering", "gathering"],
      ["Family Lunch", "gathering"],
      ["BOT Lunch & Dinner Business Meeting", "meeting"],
      ["Internal", "internal"],
      ["Retail", null],
    ];
    for (const [nama, jenis] of kasus) expect([nama, tebakJenisAcara(nama)]).toEqual([nama, jenis]);
  });
});
