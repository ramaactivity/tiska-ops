/**
 * Impor paket buffet / coffee break / wedding / stall dari
 * scripts/data/paket-pilihan.json (transkrip pricelist 2026, D-082).
 *
 *   node scripts/impor-paket-pilihan.mjs            → DRY-RUN (ringkasan, tanpa menyimpan)
 *   node scripts/impor-paket-pilihan.mjs --apply    → simpan dalam satu transaksi
 *
 * Kode yang sudah ada dilewati (aman dijalankan ulang). Opsi dicocokkan ke
 * master Menu lewat nama (untuk HPP nanti). Stall bermenu tunggal = paket biasa.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
const data = JSON.parse(readFileSync("scripts/data/paket-pilihan.json", "utf8"));
const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();

const kunci = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
const menu = new Map((await klien.query("select id, name from menus")).rows.map((r) => [kunci(r.name), r.id]));
const ada = new Set((await klien.query("select code from packages")).rows.map((r) => r.code));
const bentuk = Object.fromEntries((await klien.query("select id, code from service_forms")).rows.map((r) => [r.code, r.id]));

let paket = 0, slot = 0, opsi = 0, tersambung = 0, lewat = 0;
await klien.query("BEGIN");
try {
  for (const p of data) {
    if (ada.has(p.code)) { lewat++; continue; }
    // Label rapi untuk dicetak: aturan "pilih salah satu" sudah ada di kolom pick; titik dua dipakai pemisah isi.
    const kosong = p.slots.filter((s) => !s.options.length);
    p.slots = p.slots
      .filter((s) => s.options.length)
      .map((s) => ({ ...s, label: s.label.replace(/\s*\(pilih salah ?satu\)/i, "").replace(/\s*:\s*/g, " - ").trim() }))
      // Label kembar sesudah dirapikan ("Beverage" + "Beverage (pilih salah satu)") → "Beverage - pilihan".
      .map((s, i, semua) => (semua.slice(0, i).some((x) => x.label === s.label) ? { ...s, label: `${s.label} - pilihan` } : s));
    if (kosong.length) p.notes = [p.notes, ...kosong.map((s) => `${s.label}: ${s.note ?? `pilih ${s.pick}`}`)].filter(Boolean).join(" · ");
    const tunggal = p.slots.length === 1 && p.slots[0].pick === 0 && p.slots[0].options.length === 1 && /^isi$/i.test(p.slots[0].label);
    const slots = tunggal ? [] : p.slots;
    const kind = slots.some((s) => s.pick > 0) ? "choice" : "fixed";
    const sf = /stall/i.test(p.line) ? bentuk.stall : bentuk.buffet;
    const catatan = [p.notes, p.basis === "nett" ? "Harga pricelist NETT (sudah termasuk pajak & layanan)" : null].filter(Boolean).join(" · ") || null;
    const { rows } = await klien.query(
      `insert into packages (code, name, line, kind, price, unit, service_form_id, status, notes, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,'aktif',$8,now(),now()) returning id`,
      [p.code, p.name, p.line, kind, p.price, p.unit || null, sf, catatan],
    );
    paket++;
    for (const [i, s] of slots.entries()) {
      const r = await klien.query(
        `insert into package_slots (package_id, label, pick, extra, note, sort) values ($1,$2,$3,$4,$5,$6) returning id`,
        [rows[0].id, s.label, s.pick, Boolean(s.tambahan), s.note ?? null, i + 1],
      );
      slot++;
      for (const [j, o] of s.options.entries()) {
        const m = menu.get(kunci(o.name)) ?? null;
        if (m) tersambung++;
        await klien.query(`insert into package_slot_options (slot_id, name, menu_id, extra_price, sort) values ($1,$2,$3,$4,$5)`, [r.rows[0].id, o.name, m, o.extra ?? null, j + 1]);
        opsi++;
      }
    }
  }
  console.log(`${paket} paket baru (${lewat} dilewati karena kodenya sudah ada) · ${slot} kategori · ${opsi} opsi (${tersambung} tersambung ke master Menu)`);
  if (process.argv.includes("--apply")) { await klien.query("COMMIT"); console.log("✅ APPLY"); }
  else { await klien.query("ROLLBACK"); console.log("DRY-RUN — tambahkan --apply untuk menyimpan"); }
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
} finally {
  await klien.end();
}
