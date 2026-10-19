import { describe, expect, it } from "vitest";

import { briefKonfirmasi, briefPersiapan, briefUpdate, geserJam } from "./brief";

describe("brief Konfirmasi New Order (07-BRIEF §1)", () => {
  it("box satu hari dua jadwal — format sama dengan contoh Eris Riswan, tanpa harga", () => {
    const teks = briefKonfirmasi({
      pemesan: "bapak Eris Riswan",
      pic: "bapak Eris Riswan",
      hp: "0811-xxxx-1970",
      acara: null,
      cara: "antar",
      venue: "Pondok Indah Golf Ballroom",
      alamat: "Jalan Metro Pondok Indah - Jakarta Selatan",
      catatan: "Mbaa... nitiiip dimasak gurih enak muantaaaaaap yaa 😉",
      items: [
        { tanggal: "2026-10-04", sesi: "Lunch", jam: "10.30", nama: "Basic Lunch Box - Ikan Dori Sambal Matah", qty: "56", unit: "box", pax: null, isi: ["Nasi Putih", "Ikan dori sambel matah", "Bakwan sayur", "Lalapan"] },
        { tanggal: "2026-10-04", sesi: "Dinner", jam: "15.30", nama: "Basic Lunch Box - Ayam Panggang", qty: "125", unit: "box", pax: null, isi: ["Nasi Putih", "Ayam panggang", "Sambal terasi", "Lalapan"] },
      ],
    });
    expect(teks).toBe(
      [
        "🛎 *KONFIRMASI NEW ORDER: TISKA CATERING*",
        "",
        "*Nama Pemesan:* bapak Eris Riswan",
        "*HP:* 0811-xxxx-1970",
        "*Hari/Tanggal Acara:* Minggu, 04 Oktober 2026",
        "*Waktu Kirim:* 10.30 WIB - *Tiba Di Lokasi*",
        "*Alamat Lokasi kirim:*",
        "*PONDOK INDAH GOLF BALLROOM*",
        "JALAN METRO PONDOK INDAH - JAKARTA SELATAN",
        "-------------------------------",
        "*ORDER:*",
        "",
        "*Mbaa... nitiiip dimasak gurih enak muantaaaaaap yaa 😉*",
        "",
        "*Pukul 10.30 - Tiba dilokasi*",
        "🍱 *BASIC LUNCH BOX - IKAN DORI SAMBAL MATAH* = *56 BOX*",
        "Menu:",
        "1. Nasi Putih",
        "2. Ikan dori sambel matah",
        "3. Bakwan sayur",
        "4. Lalapan",
        "",
        "*Pukul 15.30 - Tiba dilokasi*",
        "🍱 *BASIC LUNCH BOX - AYAM PANGGANG* = *125 BOX*",
        "Menu:",
        "1. Nasi Putih",
        "2. Ayam panggang",
        "3. Sambal terasi",
        "4. Lalapan",
      ].join("\n"),
    );
    expect(teks).not.toMatch(/Rp/);
  });

  it("multi-hari → daftar tanggal 📆 dan DAY 1️⃣ / 2️⃣; diambil → alamat TISKA", () => {
    const teks = briefKonfirmasi({
      pemesan: "Ibu Elsa",
      pic: null,
      hp: null,
      acara: "Workshop",
      cara: "ambil",
      venue: null,
      alamat: null,
      catatan: null,
      items: [
        { tanggal: "2026-10-05", sesi: "Lunch", jam: "12.00–13.00", nama: "Dinner buffet PR-24", qty: "1", unit: null, pax: 45, isi: [] },
        { tanggal: "2026-10-06", sesi: "Lunch", jam: "12.00", nama: "[PR-23] Nasi Sate Udang", qty: "12", unit: "box", pax: null, isi: [] },
      ],
    });
    expect(teks).toContain("📆 Senin, 05 Oktober 2026\n📆 Selasa, 06 Oktober 2026");
    expect(teks).toContain("*ORDER:* *DAY* 1️⃣ (Senin, 05 Oktober 2026)");
    expect(teks).toContain("*ORDER:* *DAY* 2️⃣");
    expect(teks).toContain("🍲 *DINNER BUFFET PR-24* = *45 PAX*");
    expect(teks).toContain("*Alamat Ambil:*\nTISKA Catering");
    expect(teks).toContain("*Pukul 12.00 - Diambil*");
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
