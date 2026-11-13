import Link from "next/link";

import { Pil } from "@/components/halaman";
import { BATAS_PERUBAHAN_HARGA_PERSEN, perubahanHarga } from "@/lib/hitung/stok";
import { prisma } from "@/lib/prisma";
import { rupiah, type NilaiUang } from "@/lib/uang";

const tanggal = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
// Harga per gram/ml sering di bawah Rp 100 — tampilkan desimalnya supaya tidak terbaca "Rp 0".
const rp = (v: NilaiUang) => (Number(String(v)) < 100 ? `Rp ${Number(String(v)).toLocaleString("id-ID", { maximumFractionDigits: 2 })}` : rupiah(v));

/**
 * Harga bahan yang berubah karena nota / penerimaan PO (D-094), 30 hari.
 * BERISI HARGA — hanya dirender untuk peran yang boleh melihat biaya.
 * Perubahan besar ditandai untuk ditinjau; harganya tetap dipakai (tanpa rem otomatis).
 */
/** Baris harga dari nota sejak `hari` lalu + harga sebelumnya + perubahan % (satu pembaca untuk daftar & banner). */
async function dataHargaNota(hari: number, ambil: number) {
  const sejak = new Date(Date.now() - hari * 86_400_000);
  const baru = await prisma.ingredient_prices.findMany({
    where: { source: "pembelian", created_at: { gte: sejak } },
    orderBy: [{ effective_at: "desc" }, { id: "desc" }],
    take: ambil,
    include: { ingredients: { select: { id: true, name: true, usage_unit: true, purchase_unit: true } } },
  });
  if (!baru.length) return [];
  const semua = await prisma.ingredient_prices.findMany({
    where: { ingredient_id: { in: [...new Set(baru.map((b) => b.ingredient_id))] } },
    orderBy: [{ effective_at: "desc" }, { id: "desc" }],
    select: { id: true, ingredient_id: true, effective_at: true, price_per_usage_unit: true },
  });
  const sebelum = (b: (typeof baru)[number]) =>
    semua.find((x) => x.ingredient_id === b.ingredient_id && (x.effective_at < b.effective_at || (x.effective_at.getTime() === b.effective_at.getTime() && x.id < b.id)));
  return baru.map((b) => {
    const lama = sebelum(b)?.price_per_usage_unit ?? null;
    return { b, lama, pct: perubahanHarga(lama, b.price_per_usage_unit) };
  });
}

/** Banner Dashboard owner/Finance: harga bahan yang berubah besar dari nota 7 hari terakhir. */
export async function BannerHargaNota() {
  const besar = (await dataHargaNota(7, 200)).filter((x) => x.pct && x.pct.abs().gt(BATAS_PERUBAHAN_HARGA_PERSEN)).length;
  if (!besar) return null;
  return (
    <Link href="/bahan#harga-nota" className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-perhatian-garis bg-perhatian-halus p-4 text-sm text-perhatian hover:opacity-90">
      <span className="font-medium">
        {besar} harga bahan berubah lebih dari {BATAS_PERUBAHAN_HARGA_PERSEN}% dari nota minggu ini — HPP menu ikut berubah.
      </span>
      <span className="shrink-0 underline">Tinjau</span>
    </Link>
  );
}

export async function HargaDariNota() {
  const baris = await dataHargaNota(30, 40);
  if (!baris.length) return null;
  const besar = baris.filter((x) => x.pct && x.pct.abs().gt(BATAS_PERUBAHAN_HARGA_PERSEN)).length;
  return (
    <section id="harga-nota" className="mb-4 kartu">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b p-4">
        <h2 className="eyebrow">Harga dari nota · 30 hari</h2>
        <span className="text-xs text-muted-foreground">
          Otomatis dari nota pasar & penerimaan PO — HPP menu ikut. {besar ? `${besar} berubah > ${BATAS_PERUBAHAN_HARGA_PERSEN}%, mohon ditinjau.` : ""}
        </span>
      </div>
      <ul className="divide-y">
        {baris.map(({ b, lama, pct }) => {
          const satuan = b.ingredients.usage_unit ?? b.ingredients.purchase_unit ?? "satuan";
          const mencolok = pct && pct.abs().gt(BATAS_PERUBAHAN_HARGA_PERSEN);
          return (
            <li key={b.id.toString()} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/bahan/${b.ingredients.id}`} className="font-medium underline-offset-4 hover:underline">
                  {b.ingredients.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {tanggal.format(b.effective_at)} · {b.source_note}
                </p>
              </div>
              <span className="font-mono tabular-nums text-muted-foreground">
                {lama ? `${rp(lama)} → ` : "baru "}
                <span className="text-foreground">{rp(b.price_per_usage_unit)}</span>/{satuan}
              </span>
              {pct ? <Pil nada={mencolok ? "perhatian" : "netral"}>{`${pct.gt(0) ? "+" : ""}${pct.toFixed(0)}%`}</Pil> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
