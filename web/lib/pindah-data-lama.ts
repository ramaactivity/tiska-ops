import "server-only";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

import { hapusBukti } from "@/lib/bukti-berkas";
import { prisma } from "@/lib/prisma";

import { type Baris, type DataLama, type Keputusan, susunRencana, TABEL_LAMA } from "./pindah-data-rencana";

/* ==========================================================================
   PINDAH DATA LAMA (D-107)

   Satu tombol: hapus data klien & transaksi hasil uji coba di Tiska Ops,
   lalu salin data Aplikasi Penjualan TC (DB lama, hanya DIBACA) ke sini.
   Semua dalam SATU transaksi: gagal di tengah = tidak ada yang berubah.
   Sebelum menghapus, isi yang akan dihapus dicadangkan ke bucket tertutup
   "cadangan" (pindah-data-<waktu>.json).

   Master data (resep, bahan, menu, paket, pricelist, user, alat, kendaraan,
   supplier, S&K, angka bisnis, company) TIDAK disentuh.
   ========================================================================== */

/** Urutan hapus mengikuti foreign key; sisanya ikut terhapus lewat CASCADE. */
const HAPUS_KLIEN = ["payment_details", "payments", "events", "invoices", "leads", "quotations", "customers"];
const HAPUS_OPERASIONAL = [
  "stock_movements",
  "stock_count_lines",
  "stock_counts",
  "supplier_payables",
  "cash_advances",
  "purchase_items", // harga bahan dari nota uji ikut terhapus (cascade)
  "purchases",
  "purchase_order_items",
  "purchase_orders",
  "purchase_request_items",
  "purchase_requests",
  "pricelist_sends",
];

// Tanggal, waktu, angka besar & desimal dibiarkan sebagai teks persis seperti di DB lama:
// tanpa geser zona waktu, tanpa pembulatan float.
const TEKS_MENTAH = new Set([20, 1082, 1114, 1184, 1700]);
const tipeMentah = {
  getTypeParser: (oid: number, format?: "text" | "binary") => (TEKS_MENTAH.has(oid) ? (v: string) => v : pg.types.getTypeParser(oid, format)),
};

export function adaSambunganLama(): boolean {
  return Boolean(process.env.LAMA_DATABASE_URL);
}

export async function bacaDataLama(): Promise<DataLama> {
  const url = process.env.LAMA_DATABASE_URL;
  if (!url) throw new Error("LAMA_DATABASE_URL belum diisi — alamat database aplikasi lama.");
  const c = new pg.Client({
    connectionString: url,
    types: tipeMentah,
    connectionTimeoutMillis: 15_000,
  });
  await c.connect();
  try {
    await c.query("BEGIN READ ONLY");
    const d = {} as DataLama;
    for (const t of [...TABEL_LAMA, "users", "signatories"] as const) {
      d[t] = (await c.query(`SELECT * FROM ${t} ORDER BY id`)).rows as Baris[];
    }
    await c.query("COMMIT");
    return d;
  } finally {
    await c.end();
  }
}

export type IsiSekarang = {
  customer: { id: string; nama: string }[];
  quotation: number;
  invoice: number;
  payment: number;
  event: number;
  lead: number;
  operasional: number;
};

export async function isiSekarang(): Promise<IsiSekarang> {
  const [customer, quotation, invoice, payment, event, lead, pr, nota, gerak] = await Promise.all([
    prisma.customers.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.quotations.count(),
    prisma.invoices.count(),
    prisma.payments.count(),
    prisma.events.count(),
    prisma.leads.count(),
    prisma.purchase_requests.count(),
    prisma.purchases.count(),
    prisma.stock_movements.count(),
  ]);
  return {
    customer: customer.map((c) => ({ id: c.id.toString(), nama: c.name })),
    quotation,
    invoice,
    payment,
    event,
    lead,
    operasional: pr + nota + gerak,
  };
}

function storageLama() {
  const url = process.env.LAMA_SUPABASE_URL;
  const kunci = process.env.LAMA_SUPABASE_SECRET_KEY;
  if (!url || !kunci) return null;
  return createClient(url, kunci, { auth: { persistSession: false } });
}

function storageBaru() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}

/** Salin gambar tanda tangan lama ke bucket "tanda-tangan" baru (jalur sama). Gagal = null, dokumen tetap tercetak tanpa gambar. */
async function salinTandaTangan(jalur: unknown): Promise<string | null> {
  const lama = storageLama();
  if (!lama || !jalur) return null;
  const { data } = await lama.storage.from("tanda-tangan").download(String(jalur));
  if (!data) return null;
  const { error } = await storageBaru()
    .storage.from("tanda-tangan")
    .upload(String(jalur), data, {
      contentType: data.type || "image/png",
      upsert: true,
    });
  return error ? null : String(jalur);
}

export type HasilPindah = {
  dihapus: IsiSekarang;
  dipindah: ReturnType<typeof susunRencana>["ringkasan"];
  penandatanganBaru: number;
  cadangan: string;
  acaraMendatang: {
    id: string;
    disetujui: boolean;
    nomor: string;
    customer: string;
    tanggal: string;
  }[];
  /** true = uji coba: semua langkah dijalankan lalu dibatalkan, tidak ada yang tersimpan. */
  cobaSaja: boolean;
};

class BatalkanUji extends Error {}

export async function jalankanPindah(k: Keputusan, cobaSaja = false): Promise<HasilPindah> {
  const lama = await bacaDataLama();
  const rencana = susunRencana(lama, k);
  const dihapus = await isiSekarang();

  // Cadangan isi yang akan dihapus — jalan pulang kalau ternyata ada data uji yang ingin disimpan.
  const tabelHapus = [...HAPUS_KLIEN, ...(k.hapusOperasional ? HAPUS_OPERASIONAL : [])];
  const cadangan: Record<string, unknown> = {};
  for (const t of [
    ...tabelHapus,
    "invoice_items",
    "invoice_event_dates",
    "quotation_items",
    "quotation_event_dates",
    "event_kloters",
    "event_assignments",
    "event_items",
    "retail_programs",
    "retail_program_sets",
    "retail_program_set_items",
    "retail_orders",
    "retail_order_items",
  ]) {
    cadangan[t] = (await prisma.$queryRawUnsafe<{ j: unknown }[]>(`SELECT coalesce(json_agg(x), '[]') AS j FROM ${t} x`))[0].j;
  }
  const jalurCadangan = cobaSaja ? "(uji coba, tidak dicadangkan)" : `pindah-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const { error: gagalCadang } = cobaSaja
    ? { error: null }
    : await storageBaru()
        .storage.from("cadangan")
        .upload(jalurCadangan, new Blob([JSON.stringify(cadangan)], { type: "application/json" }));
  if (gagalCadang) throw new Error(`Cadangan gagal dibuat (${gagalCadang.message}). Tidak ada yang dihapus.`);

  // Berkas tanda tangan disalin di luar transaksi (aman diulang: jalur sama, upsert).
  const ttdLama = new Map(lama.signatories.map((s) => [String(s.id), s]));
  const ttdBaru = new Map<string, string | null>();
  for (const id of rencana.penandatanganBaru) ttdBaru.set(id, await salinTandaTangan(ttdLama.get(id)?.signature_path));
  const isiTtd = new Map<string, string>(); // penandatangan baru yang dipetakan tapi belum punya gambar
  const tanpaGambar = await prisma.signatories.findMany({
    where: { signature_path: null },
    select: { id: true },
  });
  for (const [idLama, tujuan] of Object.entries(k.penandatangan)) {
    if (tujuan !== "baru" && tanpaGambar.some((s) => s.id.toString() === tujuan)) {
      const j = await salinTandaTangan(ttdLama.get(idLama)?.signature_path);
      if (j) isiTtd.set(tujuan, j);
    }
  }

  const berkasUji = await prisma.$queryRawUnsafe<{ f: string }[]>(
    `SELECT transfer_proof f FROM payments WHERE transfer_proof IS NOT NULL
     UNION ALL SELECT client_approval_proof FROM quotations WHERE client_approval_proof IS NOT NULL
     UNION ALL SELECT photo_path FROM kloter_tracking WHERE photo_path IS NOT NULL`,
  );

  await prisma
    .$transaction(
      async (tx) => {
        for (const t of tabelHapus) await tx.$executeRawUnsafe(`DELETE FROM ${t}`);

        const idTtd = new Map<string, string>();
        for (const id of rencana.penandatanganBaru) {
          const s = ttdLama.get(id)!;
          const b = await tx.signatories.create({
            data: {
              name: String(s.name),
              signature_path: ttdBaru.get(id) ?? null,
              is_active: true,
              sort_order: Number(s.sort_order ?? 0),
            },
          });
          idTtd.set(`baru:${id}`, b.id.toString());
        }
        for (const [id, jalur] of isiTtd)
          await tx.signatories.update({
            where: { id: BigInt(id) },
            data: { signature_path: jalur },
          });

        for (const t of TABEL_LAMA) {
          const rows = rencana.baris[t].map((r) =>
            "signatory_id" in r && typeof r.signatory_id === "string" && r.signatory_id.startsWith("baru:")
              ? { ...r, signatory_id: idTtd.get(r.signatory_id) ?? null }
              : r,
          );
          if (!rows.length) continue;
          const kolomBaru = (
            await tx.$queryRawUnsafe<{ c: string }[]>(
              `SELECT column_name c FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
              t,
            )
          ).map((x) => x.c);
          const kolom = Object.keys(rows[0]).filter((c) => kolomBaru.includes(c));
          const daftar = kolom.map((c) => `"${c}"`).join(", ");
          await tx.$executeRawUnsafe(
            `INSERT INTO ${t} (${daftar}) SELECT ${daftar} FROM jsonb_populate_recordset(NULL::${t}, $1::jsonb)`,
            JSON.stringify(rows),
          );
          await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), (SELECT coalesce(max(id), 1) FROM ${t}))`);
        }

        // Pembuktian: jumlah baris & total uang di DB baru = rencana dari DB lama. Beda = batal semua.
        for (const t of TABEL_LAMA) {
          const [{ n }] = await tx.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) n FROM ${t}`);
          if (Number(n) !== rencana.baris[t].length)
            throw new Error(`Jumlah ${t} tidak cocok: ${n} vs ${rencana.baris[t].length}. Dibatalkan, tidak ada yang berubah.`);
        }
        const [{ inv, pay }] = await tx.$queryRawUnsafe<{ inv: string; pay: string }[]>(
          `SELECT (SELECT coalesce(sum(grand_total), 0) FROM invoices)::text inv, (SELECT coalesce(sum(total_amount), 0) FROM payments)::text pay`,
        );
        if (Math.abs(Number(inv) - rencana.ringkasan.totalInvoice) > 0.01 || Math.abs(Number(pay) - rencana.ringkasan.totalPayment) > 0.01) {
          throw new Error("Total invoice/payment tidak sama dengan aplikasi lama. Dibatalkan, tidak ada yang berubah.");
        }
        if (cobaSaja) throw new BatalkanUji();
      },
      { timeout: 120_000, maxWait: 15_000 },
    )
    .catch((e) => {
      if (!(e instanceof BatalkanUji)) throw e;
    });

  if (!cobaSaja) await hapusBukti(berkasUji.map((b) => b.f)).catch(() => {});

  const hariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10); // WIB
  const namaCust = new Map(rencana.baris.customers.map((c) => [String(c.id), String(c.name)]));
  const acaraMendatang = rencana.baris.quotations
    .filter((q) => (q.status === "approved" || q.status === "sent") && q.event_date && String(q.event_date) >= hariIni)
    .map((q) => ({
      id: String(q.id),
      disetujui: q.status === "approved",
      nomor: String(q.quotation_number),
      customer: namaCust.get(String(q.customer_id)) ?? "",
      tanggal: String(q.event_date),
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return {
    dihapus,
    dipindah: rencana.ringkasan,
    penandatanganBaru: rencana.penandatanganBaru.length,
    cadangan: jalurCadangan,
    acaraMendatang,
    cobaSaja,
  };
}
