import { describe, expect, it } from "vitest";

import { pesanHutangJatuhTempo, pesanJadwalBesok, pesanPrDiputus, pesanStatusKirim, pesanUlangTahun } from "./notifikasi";

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

  it("status kirim ke admin & sales", () => {
    expect(
      pesanStatusKirim({ label: "✅ Sudah sampai", jam: "09.28", oleh: "Pak Agus", event: "Wedding Rina", kloter: 1, idEvent: "7", idKloter: "12", foto: true }),
    ).toEqual({ judul: "✅ Sudah sampai 09.28 · Pak Agus", isi: "Wedding Rina kloter 1 · foto bukti di halaman event", url: "/event/7", tag: "kirim-12" });
  });

  it("ulang tahun: hari ini didahulukan, besok jadi persiapan, kosong = tidak kirim", () => {
    expect(pesanUlangTahun([], [])).toBeNull();
    expect(pesanUlangTahun(["Sukir"], ["Asep", "Daud"])?.judul).toBe("🎂 Hari ini ulang tahun Sukir");
    expect(pesanUlangTahun(["Sukir"], ["Asep", "Daud"])?.isi).toBe("Besok: Asep & Daud. Jangan lupa ucapan & perayaan kecilnya.");
    expect(pesanUlangTahun([], ["A", "B", "C"])?.judul).toBe("🎂 Besok ulang tahun A, B & C");
  });
});
