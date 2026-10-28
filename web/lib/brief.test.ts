import { describe, expect, it } from "vitest";

import { briefKonfirmasi, briefPersiapan, briefUpdate, geserJam } from "./brief";

describe("brief Konfirmasi New Order (07-BRIEF §1, format Okt 2026 — D-112)", () => {
  const rahmi = {
    pemesan: "Ibu Rahmi-KLHK",
    pic: null,
    hp: "0813-1735-1170",
    acara: null,
    cara: "antar" as const,
    venue: "Kantor Direktorat Pemanfaatan Jasa Lingkungan",
    alamat: "Jl. Ir. H Juanda No. 15, Kota Bogor",
    catatan: null,
    items: [
      {
        tanggal: "2026-10-29",
        sesi: null,
        jam: "10.00",
        nama: "LUNCH BOX 20x20 [BS-14]; Nasi Terik Daging",
        qty: "25",
        unit: "box",
        pax: null,
        isi: ["Nasi Jeruk (dipenak)", "Terik Daging Suwir", "Udang Garing Crispy", "Terong Balado", "Lalapan Timun Selada", "Rempeyek Kacang", "Air Mineral"],
      },
    ],
  };

  it("sudah dijadwalkan: sama dengan contoh asli admin (Ibu Rahmi-KLHK), tanpa harga", () => {
    const teks = briefKonfirmasi({ ...rahmi, berangkat: [{ tanggal: "2026-10-29", jam: "09.20" }] });
    expect(teks).toBe(
      [
        "🛎️ *KONFIRMASI NEW ORDER: @TISKA CATERING*",
        "",
        "*Nama Pemesan:* Ibu Rahmi-KLHK",
        "*HP:* 0813-1735-1170",
        "*Hari/Tgl Kirim:* Kamis, 29 Oktober 2026",
        "*Waktu Kirim:* 09.20 brkt dr Julang 👉🏻 10.00 WIB - tiba di lokasi",
        "*Alamat Kirim:*",
        "Kantor Direktorat Pemanfaatan Jasa Lingkungan",
        "Jl. Ir. H Juanda No. 15, Kota Bogor",
        "-------------------------------",
        "*ORDER:*",
        "🍱 *LUNCH BOX 20x20 [BS-14]; Nasi Terik Daging = 25 box*",
        "1. Nasi Jeruk (dipenak)",
        "2. Terik Daging Suwir",
        "3. Udang Garing Crispy",
        "4. Terong Balado",
        "5. Lalapan Timun Selada",
        "6. Rempeyek Kacang",
        "7. Air Mineral",
      ].join("\n"),
    );
    expect(teks).not.toMatch(/Rp/);
  });

  it("belum dijadwalkan: jam tiba saja; hanya jam berangkat: '07.45 WIB brkt dr Julang'", () => {
    expect(briefKonfirmasi(rahmi)).toContain("*Waktu Kirim:* 10.00 WIB - tiba di lokasi");
    const tanpaJam = { ...rahmi, items: rahmi.items.map((i) => ({ ...i, jam: null })), berangkat: [{ tanggal: "2026-10-29", jam: "07.45" }] };
    expect(briefKonfirmasi(tanpaJam)).toContain("*Waktu Kirim:* 07.45 WIB brkt dr Julang");
  });

  it("dua jam kirim sehari → judul Pukul urut jam; waktu kirim pakai kloter & kiriman paling awal", () => {
    const teks = briefKonfirmasi({
      ...rahmi,
      items: [
        { ...rahmi.items[0], jam: "15.30", nama: "Basic Lunch Box - Ayam Panggang", isi: [] },
        { ...rahmi.items[0], jam: "10.30", isi: [] },
      ],
      berangkat: [
        { tanggal: "2026-10-29", jam: "14.45" },
        { tanggal: "2026-10-29", jam: "09.45" },
      ],
    });
    expect(teks).toContain("*Waktu Kirim:* 09.45 brkt dr Julang 👉🏻 10.30 WIB - tiba di lokasi");
    expect(teks.indexOf("Pukul 10.30")).toBeLessThan(teks.indexOf("Pukul 15.30"));
    expect(teks).toContain("*Pukul 10.30 - tiba di lokasi*");
    expect(teks).toContain("*Pukul 15.30 - tiba di lokasi*");
  });

  it("multi-hari → daftar tanggal 📆 dan DAY 1️⃣ / 2️⃣; diambil → alamat TISKA, tanpa Julang", () => {
    const teks = briefKonfirmasi({
      pemesan: "Ibu Elsa",
      pic: null,
      hp: null,
      acara: "Workshop",
      cara: "ambil",
      venue: null,
      alamat: null,
      catatan: null,
      berangkat: [{ tanggal: "2026-10-05", jam: "11.00" }],
      items: [
        { tanggal: "2026-10-05", sesi: "Lunch", jam: "12.00–13.00", nama: "Dinner buffet PR-24", qty: "1", unit: null, pax: 45, isi: [] },
        { tanggal: "2026-10-06", sesi: "Lunch", jam: "12.00", nama: "[PR-23] Nasi Sate Udang", qty: "12", unit: "box", pax: null, isi: [] },
      ],
    });
    expect(teks).toContain("*Hari/Tgl Ambil:*\n📆 Senin, 5 Oktober 2026\n📆 Selasa, 6 Oktober 2026");
    expect(teks).toContain("*Waktu Ambil:* 12.00 WIB");
    expect(teks).not.toContain("Julang");
    expect(teks).toContain("*ORDER:* *DAY* 1️⃣ (Senin, 5 Oktober 2026)");
    expect(teks).toContain("*ORDER:* *DAY* 2️⃣");
    expect(teks).toContain("🍲 *Dinner buffet PR-24 = 45 pax*");
    expect(teks).toContain("*Alamat Ambil:*\nTISKA Catering");
  });

  it("brief UPDATE berisi perubahan saja", () => {
    expect(briefUpdate({ ke: 2, pemesan: "Ibu Fanny", acara: "Resepsi", perubahan: "• [BS-15] Ikan Dori: jumlah 40 → 45" })).toBe(
      "‼️ *UPDATE ke-2* — Ibu Fanny (Resepsi)\n\n• [BS-15] Ikan Dori: jumlah 40 → 45\n\n_Merujuk brief Konfirmasi New Order sebelumnya._",
    );
  });
});

describe("brief Jadwal Persiapan Order (07-BRIEF §5)", () => {
  it("menghitung mundur seperti contoh grup Kitchen 14 Okt", () => {
    const teks = briefPersiapan({
      tanggal: "2026-10-14",
      besok: true,
      pemesan: ["Mba Reka-Telkomsat", "Mba Elsa-Pocari"],
      sesi: [
        { judul: "Mba Reka Telkomsat", siap: "07.00", ambil: false, packing: "Doclang & Tampah", menitMasak: 120 },
        { judul: "Pocari", siap: "10.00", ambil: true, packing: "12 box", menitMasak: 150 },
      ],
    });
    expect(teks).toBe(
      [
        "*JADWAL PERSIAPAN ORDER BESOK:*",
        "📆 *Rabu, 14 Oktober 2026*",
        "1. Mba Reka-Telkomsat",
        "2. Mba Elsa-Pocari",
        "---------------------------",
        "👩🏻‍🍳👨🏻‍🍳 *Sesi Masak-1; Mba Reka Telkomsat:*",
        "⏰*04.30-06.30:* Estafet siap masak + matang",
        "⏰*06.30-07.00:* Nata + packing Doclang & Tampah",
        "⏰ *07.00:* Siap brkt dr Julang",
        "---------------------------",
        "👩🏻‍🍳👨🏻‍🍳 *Sesi Masak-2; Pocari:*",
        "⏰*07.00-09.30:* Estafet siap masak + matang",
        "⏰*09.30-10.00:* Nata + packing 12 box",
        "⏰ *10.00:* Ready to pick-up + Invoice",
      ].join("\n"),
    );
  });
  it("geserJam berputar lewat tengah malam & menerima titik dua", () => {
    expect(geserJam("01:00", -150)).toBe("22.30");
    expect(geserJam("7.5", 0)).toBe("07.05");
  });
});
