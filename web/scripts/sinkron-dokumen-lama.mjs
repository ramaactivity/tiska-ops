/**
 * Sinkron dokumen yang masih diinput di APLIKASI LAMA sesudah pindah data (D-144) ke Tiska Ops — per NOMOR DOKUMEN.
 * Sejak pindah, kedua aplikasi menambah baris sendiri-sendiri sehingga id bertabrakan; karena itu dokumen dicocokkan
 * lewat quotation_number / invoice_number, dan baris anak disisipkan dengan id BARU dari urutan Tiska Ops.
 *
 *   node scripts/sinkron-dokumen-lama.mjs QUO-2026-0014 INV-2026-0074 --biaya INV-2026-0056,INV-2026-0061          (simulasi)
 *   node scripts/sinkron-dokumen-lama.mjs ... --apply                                                               (satu transaksi)
 *
 * Per nomor: sudah ada di Tiska Ops → kepala dokumen ditimpa dengan versi aplikasi lama + baris anak diganti;
 * belum ada → disisipkan. Kolom khusus Tiska Ops (sumber order, Partner Fee, persetujuan klien, …) tidak disentuh.
 * --biaya: biaya Margin (invoice_costs) yang dibuat di aplikasi lama sesudah pindah + ringkasan invoice_margins-nya.
 * Akun & penandatangan memakai pemetaan D-144. Payment TIDAK disinkron di sini (cek manual bila ada).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

for (const baris of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = baris.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].replace(/^"|"$/g, "");
}
for (const oid of [20, 1700, 1082, 1114, 1184, 1083]) pg.types.setTypeParser(oid, (v) => v);

const PINDAH = "2026-11-10 09:22:00"; // 10 Nov 16.22 WIB
const AKUN = { 1: "38", 3: "266", 4: "40", 140: "39", 309: "41", 408: "10" };
const TTD = { 1: "12", 14: "11", 16: "10" };
const KOLOM_AKUN = new Set(["created_by", "cancelled_by", "updated_by", "finalized_by"]);
const JENIS = {
  QUO: { t: "quotations", no: "quotation_number", fk: "quotation_id", anak: ["quotation_items", "quotation_event_dates", "quotation_charges", "quotation_costs"] },
  INV: { t: "invoices", no: "invoice_number", fk: "invoice_id", anak: ["invoice_items", "invoice_event_dates", "invoice_charges", "invoice_costs", "invoice_margins"] },
};

const arg = process.argv.slice(2);
const apply = arg.includes("--apply");
const iBiaya = arg.indexOf("--biaya");
const biaya = iBiaya >= 0 ? arg[iBiaya + 1].split(",") : [];
const nomor = arg.filter((a, i) => !a.startsWith("--") && i !== iBiaya + 1);

const lama = new pg.Client({ connectionString: process.env.LAMA_DATABASE_URL });
const baru = new pg.Client({ connectionString: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL });
await Promise.all([lama.connect(), baru.connect()]);
await lama.query("BEGIN READ ONLY");
await baru.query("BEGIN");

const kolomBaru = new Map();
async function kolom(t) {
  if (!kolomBaru.has(t)) kolomBaru.set(t, new Set((await baru.query("select column_name from information_schema.columns where table_name=$1", [t])).rows.map((r) => r.column_name)));
  return kolomBaru.get(t);
}
async function idTiska(t, kunci, nilaiLama) {
  if (nilaiLama == null) return null;
  const r = (await lama.query(`select ${kunci} k from ${t} where id=$1`, [nilaiLama])).rows[0];
  if (!r) throw new Error(`${t} id ${nilaiLama} tidak ada di aplikasi lama`);
  const x = (await baru.query(`select id from ${t} where ${kunci}=$1`, [r.k])).rows[0];
  if (!x) throw new Error(`${t} ${r.k} belum ada di Tiska Ops`);
  return x.id;
}
/** Baris lama → kolom Tiska Ops (tanpa id), FK & akun dipetakan. Kolom lama yang tidak ada di Tiska Ops = berhenti. */
async function petakan(t, r, ganti = {}) {
  const ada = await kolom(t);
  const out = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === "id") continue;
    if (!ada.has(k)) throw new Error(`kolom ${t}.${k} tidak ada di Tiska Ops — berhenti (D-144)`);
    let x = v;
    if (KOLOM_AKUN.has(k) && v != null) x = AKUN[v] ?? (() => { throw new Error(`akun lama ${v} belum dipetakan`); })();
    else if (k === "signatory_id" && v != null) x = TTD[v] ?? (() => { throw new Error(`penandatangan lama ${v} belum dipetakan`); })();
    else if (k === "customer_id") x = await idTiska("customers", "customer_code", v);
    else if (k === "quotation_id" && t === "invoices") x = await idTiska("quotations", "quotation_number", v);
    else if (k === "product_id" && v != null) {
      if (!(await baru.query("select 1 from products where id=$1", [v])).rowCount) throw new Error(`${t}: product ${v} tidak ada di Tiska Ops`);
    }
    out[k] = x;
  }
  return { ...out, ...ganti };
}
async function sisip(t, data) {
  const k = Object.keys(data);
  const r = await baru.query(`insert into ${t} (${k.join(",")}) values (${k.map((_, i) => `$${i + 1}`).join(",")}) returning id`, Object.values(data));
  return r.rows[0].id;
}

const laporan = [];
for (const no of nomor) {
  const j = JENIS[no.slice(0, 3)];
  if (!j) throw new Error(`nomor tidak dikenal: ${no}`);
  const induk = (await lama.query(`select * from ${j.t} where ${j.no}=$1`, [no])).rows[0];
  if (!induk) throw new Error(`${no} tidak ada di aplikasi lama`);
  const ada = (await baru.query(`select id, updated_at, grand_total from ${j.t} where ${j.no}=$1`, [no])).rows[0];
  if (ada && ada.updated_at > induk.updated_at) throw new Error(`${no}: versi Tiska Ops lebih baru (${ada.updated_at}) dari aplikasi lama (${induk.updated_at}) — tidak ditimpa`);
  const data = await petakan(j.t, induk);
  let id;
  if (ada) {
    id = ada.id;
    const k = Object.keys(data);
    await baru.query(`update ${j.t} set ${k.map((c, i) => `${c}=$${i + 1}`).join(",")} where id=$${k.length + 1}`, [...Object.values(data), id]);
    // Anak lama dihapus dulu (isi baru menggantikan), sub-item sebelum induknya.
    for (const t of [...j.anak].reverse()) {
      if (t.endsWith("_items")) await baru.query(`delete from ${t} where ${j.fk}=$1 and parent_id is not null`, [id]);
      await baru.query(`delete from ${t} where ${j.fk}=$1`, [id]);
    }
  } else {
    id = await sisip(j.t, data);
  }
  const hitung = {};
  for (const t of j.anak) {
    const rows = (await lama.query(`select * from ${t} where ${j.fk}=$1 order by ${t.endsWith("_items") ? "parent_id nulls first, id" : "id"}`, [induk.id])).rows;
    const peta = new Map();
    for (const r of rows) {
      const ganti = { [j.fk]: id };
      if (t.endsWith("_items")) ganti.parent_id = r.parent_id == null ? null : peta.get(String(r.parent_id)) ?? (() => { throw new Error(`${t}: induk ${r.parent_id} belum disisip`); })();
      peta.set(String(r.id), await sisip(t, await petakan(t, r, ganti)));
    }
    hitung[t] = rows.length;
  }
  const akhir = (await baru.query(`select grand_total, subtotal, status from ${j.t} where id=$1`, [id])).rows[0];
  laporan.push(`${no}: ${ada ? `DIPERBARUI (Rp${ada.grand_total} → Rp${akhir.grand_total})` : `DISISIPKAN id ${id} (Rp${akhir.grand_total})`} status ${akhir.status} · ${Object.entries(hitung).map(([t, n]) => `${t} ${n}`).join(", ")}`);
}

for (const no of biaya) {
  const inv = (await lama.query("select id from invoices where invoice_number=$1", [no])).rows[0];
  const tujuan = (await baru.query("select id from invoices where invoice_number=$1", [no])).rows[0];
  if (!inv || !tujuan) throw new Error(`${no} tidak ada di salah satu aplikasi`);
  const rows = (await lama.query("select * from invoice_costs where invoice_id=$1 and created_at > $2 order by id", [inv.id, PINDAH])).rows;
  for (const r of rows) {
    const dobel = (await baru.query("select 1 from invoice_costs where invoice_id=$1 and category=$2 and description=$3 and coalesce(estimated_amount,0)=coalesce($4::numeric,0)", [tujuan.id, r.category, r.description, r.estimated_amount])).rowCount;
    if (dobel) throw new Error(`${no}: biaya "${r.description}" sudah ada di Tiska Ops`);
    await sisip("invoice_costs", await petakan("invoice_costs", r, { invoice_id: tujuan.id }));
  }
  const m = (await lama.query("select * from invoice_margins where invoice_id=$1", [inv.id])).rows[0];
  if (m) {
    const data = await petakan("invoice_margins", m, { invoice_id: tujuan.id });
    await baru.query("delete from invoice_margins where invoice_id=$1", [tujuan.id]);
    await sisip("invoice_margins", data);
  }
  laporan.push(`${no}: biaya Margin +${rows.length} (${rows.map((r) => `${r.description} Rp${r.estimated_amount ?? r.actual_amount}`).join("; ")})${m ? `, ringkasan margin: biaya Rp${m.total_cost}, untung Rp${m.profit}` : ""}`);
}

console.log(laporan.join("\n"));
await baru.query(apply ? "COMMIT" : "ROLLBACK");
await lama.query("ROLLBACK");
await Promise.all([lama.end(), baru.end()]);
console.log(apply ? "\n✅ Tersimpan (satu transaksi)." : "\n(simulasi — tidak ada yang tersimpan; tambah --apply untuk menjalankan)");
