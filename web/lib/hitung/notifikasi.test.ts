import { describe, expect, it } from "vitest";

import { pesanHutangJatuhTempo, pesanJadwalBesok, pesanPrDiputus } from "./notifikasi";

describe("teks notifikasi", () => {
  it("jadwal besok: tugas paling pagi, captain, sisa tugas, ajakan Siap", () => {
    expect(
      pesanJadwalBesok("2026-10-21", [
        { jam: "09.00", event: "Arisan Bu Sari", kloter: 2, captain: false, sudahSiap: true },
        { jam: "05.00", event: "Wedding Rina", kloter: 1, captain: true, sudahSiap: false },
      ]),
    ).toEqual({
      judul: "Besok berangkat 05.00",
      isi: 'Rabu, 21 Okt · Wedding Rina kloter 1 · kamu captain (+1 tugas lagi). Tekan "Siap 👍".',
      url: "/beranda",
      tag: "jadwal-2026-10-21",
    });
    expect(pesanJadwalBesok("2026-10-21", [])).toBeNull();
  });

  it("PR disetujui/dikembalikan & hutang", () => {
    expect(pesanPrDiputus("PR/TC/2610/001", "5", true).judul).toBe("PR disetujui ✅");
    expect(pesanPrDiputus("PR/TC/2610/001", "5", false).url).toBe("/belanja/5");
    expect(pesanHutangJatuhTempo(0)).toBeNull();
    expect(pesanHutangJatuhTempo(2)?.isi).toBe("2 tagihan supplier jatuh tempo hari ini / sudah lewat.");
  });
});
