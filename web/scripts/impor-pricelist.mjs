/**
 * Impor 18 pricelist + 19 berkas PDF ke Pustaka Pricelist (D-035).
 *
 *   node scripts/impor-pricelist.mjs <manifest.json>            # DRY-RUN
 *   node scripts/impor-pricelist.mjs <manifest.json> --apply    # unggah + tulis
 *
 * manifest.json dibuat skrip kompres di luar repo (PyMuPDF): per berkas berisi
 * jalur asli, jalur versi ringan (hanya bila ≥ 30% lebih kecil dan tanpa
 * galat MuPDF), ukuran, jumlah halaman. Data induk di data/pricelist.json.
 *
 * Berkas diunggah ke bucket tertutup "pricelist" di jalur
 * <code>/v<versi>-asli.pdf dan <code>/v<versi>-ringan.pdf. Unggah dulu, baru
 * baris DB ditulis dalam satu transaksi; --apply menolak bila tabel sudah berisi.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const [jalurManifest] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
if (!jalurManifest) throw new Error("Cara pakai: node scripts/impor-pricelist.mjs <manifest.json> [--apply]");

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}

const induk = JSON.parse(readFileSync("../data/pricelist.json", "utf8")).pricelist;
const manifest = JSON.parse(readFileSync(jalurManifest, "utf8"));
const namaBerkas = Object.keys(manifest);

const rencana = induk.map((p) => ({
  ...p,
  files: p.files.map((f, i) => {
    const cocok = namaBerkas.filter((n) => n.startsWith(f.file));
    if (cocok.length !== 1) throw new Error(`${p.code}: awalan "${f.file}" cocok ${cocok.length} berkas`);
    const m = manifest[cocok[0]];
    return { ...f, versi: i + 1, nama: cocok[0], ...m };
  }),
}));
const dipakai = new Set(rencana.flatMap((p) => p.files.map((f) => f.nama)));
const tak = namaBerkas.filter((n) => !dipakai.has(n));
if (tak.length) throw new Error(`Berkas di manifest tidak terpakai: ${tak.join(", ")}`);

const mb = (n) => `${(n / 1e6).toFixed(1)}MB`;
console.log(`${APPLY ? "APPLY" : "DRY-RUN"} — Pustaka Pricelist`);
console.log(`  pricelist: ${rencana.length} (aktif ${rencana.filter((p) => p.status === "aktif").length}, arsip ${rencana.filter((p) => p.status === "arsip").length})`);
console.log(`  berkas   : ${rencana.reduce((s, p) => s + p.files.length, 0)} (dengan versi ringan ${rencana.reduce((s, p) => s + p.files.filter((f) => f.ringan).length, 0)})`);
console.log(`  total unggah: ${mb(rencana.reduce((s, p) => s + p.files.reduce((t, f) => t + f.ukuran + (f.ukuran_ringan ?? 0), 0), 0))}`);
for (const p of rencana) {
  const aktif = p.files.at(-1);
  console.log(`  ${p.code} /pl/${p.slug.padEnd(26)} ${p.status.padEnd(5)} v${aktif.versi} ${mb(aktif.ukuran)}${aktif.ringan ? ` → ringan ${mb(aktif.ukuran_ringan)}` : ""} · ${aktif.halaman} hlm${p.files.length > 1 ? ` · ${p.files.length} versi` : ""}`);
}
if (!APPLY) {
  console.log("\nTidak ada yang ditulis/diunggah. Jalankan dengan --apply.");
  process.exit(0);
}

const url = (process.env.DIRECT_DATABASE_URL ?? "").replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]uselibpqcompat=[^&]*/g, "");
const klien = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await klien.connect();
const { rows: isi } = await klien.query(`SELECT count(*)::int n FROM pricelists`);
if (isi[0].n) throw new Error(`Tabel pricelists sudah berisi ${isi[0].n} baris. Dibatalkan.`);

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
async function unggah(lokal, tujuan) {
  const { error } = await sb.storage.from("pricelist").upload(tujuan, readFileSync(lokal), { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`Gagal unggah ${basename(lokal)}: ${error.message}`);
}
for (const p of rencana) {
  for (const f of p.files) {
    f.file_path = `${p.code}/v${f.versi}-asli.pdf`;
    await unggah(f.asli, f.file_path);
    if (f.ringan) {
      f.light_path = `${p.code}/v${f.versi}-ringan.pdf`;
      await unggah(f.ringan, f.light_path);
    }
    process.stdout.write(".");
  }
}
console.log(" unggah selesai");

await klien.query("BEGIN");
try {
  for (const p of rencana) {
    const { rows } = await klien.query(
      `INSERT INTO pricelists (code, slug, name, segment, region, venue, price_basis, seasonal, status, notes, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now()) RETURNING id`,
      [p.code, p.slug, p.name, p.segment ?? null, p.region ?? null, p.venue ?? null, p.price_basis ?? null, Boolean(p.seasonal), p.status, p.notes ?? null],
    );
    for (const f of p.files) {
      await klien.query(
        `INSERT INTO pricelist_files (pricelist_id, version, file_path, file_size, light_path, light_size, pages, change_note, is_active, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())`,
        [rows[0].id, f.versi, f.file_path, f.ukuran, f.light_path ?? null, f.ukuran_ringan ?? null, f.halaman, f.note, f === p.files.at(-1)],
      );
    }
  }
  await klien.query("COMMIT");
} catch (e) {
  await klien.query("ROLLBACK");
  throw e;
}

const { rows: hasil } = await klien.query(`
  SELECT (SELECT count(*) FROM pricelists)::int pl, (SELECT count(*) FROM pricelist_files)::int berkas,
         (SELECT count(*) FROM pricelist_files WHERE is_active)::int aktif`);
const { data: daftar } = await sb.storage.from("pricelist").list("18");
console.log(`Tersimpan: ${JSON.stringify(hasil[0])} · contoh isi bucket 18/: ${daftar?.map((d) => d.name).join(", ")}`);
await klien.end();
