import { describe, expect, it } from "vitest";

import { ringkasanMalam, ringkasanPagi, ringkasanSore, type EventRingkas } from "./ringkasan-owner";

const ev: EventRingkas[] = [
  {
    nama: "Wedding Rina",
    pelanggan: "Bu Rina",
    venue: "Gedung A",
    kloter: [
      { no: 2, jam: "09.00", captain: null, status: [] },
      { no: 1, jam: "05.00", captain: "Pak Yoga", status: ["dimasak", "packing", "siap", "berangkat"] },
    ],
    peringatan: ["Kloter 2 (09.00): tanpa captain"],
  },
  { nama: "Box PT Agro", pelanggan: "PT Agro", venue: null, kloter: [{ no: 1, jam: "10.30", captain: "Pak Asep", status: ["dimasak", "packing", "siap", "berangkat", "tiba", "selesai"] }], peringatan: [] },
];
const nol = { prMenunggu: 0, honorMenunggu: 0, hutangJatuhTempo: 0 };

describe("ringkasan harian owner", () => {
  it("malam: daftar besok + belum siap + menunggu tindakan", () => {
    expect(ringkasanMalam("2026-10-20", ev, { prMenunggu: 1, honorMenunggu: 0, hutangJatuhTempo: 2 })).toBe(
      [
        "🌙 *Rencana besok — Selasa, 20 Oktober*",
        "",
        "1. Wedding Rina (Bu Rina) — berangkat 09.00 · Gedung A",
        "2. Box PT Agro (PT Agro) — berangkat 10.30",
        "",
        "⚠️ *Belum siap:*",
        "• Wedding Rina: Kloter 2 (09.00): tanpa captain",
        "",
        "📌 *Menunggu tindakan:*",
        "• 1 PR belanja menunggu persetujuan Finance",
        "• 2 hutang supplier jatuh tempo (hari ini/lewat)",
      ].join("\n"),
    );
  });

  it("pagi: kloter urut jam, captain & status terakhir", () => {
    const t = ringkasanPagi("2026-10-20", ev);
    expect(t.split("\n").slice(2, 5)).toEqual([
      "05.00 · Wedding Rina — kloter 1 (captain Pak Yoga) · 🚐 berangkat",
      "09.00 · Wedding Rina — kloter 2 (⚠️ tanpa captain)",
      "10.30 · Box PT Agro — kloter 1 (captain Pak Asep) · 🏁 selesai",
    ]);
  });

  it("sore: selesai bila semua kloter selesai; kosong tetap jelas", () => {
    const t = ringkasanSore("2026-10-20", ev, nol);
    expect(t).toContain("• Box PT Agro (PT Agro) — 🏁 selesai");
    expect(t).toContain("• Wedding Rina (Bu Rina) — kloter 2: belum ada status, kloter 1: 🚐 berangkat");
    expect(ringkasanSore("2026-10-20", [], nol)).toContain("Tidak ada event hari ini.");
  });
});
