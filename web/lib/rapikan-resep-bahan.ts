import "server-only";

import { kataInti, kemiripanKata, rapikanTeks, skorCari } from "./cari-mirip";
import { prisma } from "./prisma";

/* ==========================================================================
   RESEP & BAHAN KEMBAR (D-123) — saran untuk Rapikan Menu. TANPA harga.

   Resep: nama sama/mirip dengan kata sajian tetap dihitung ("Box" ≠
   "Prasmanan"); pasangan Box/Prasmanan hanya disarankan bila isi bahannya
   identik. Bahan: nama + merk + varian mirip; satuan pakai berbeda tidak
   bisa digabung (takaran resep & stok akan salah) — ditandai.
   ========================================================================== */

/**
 * Kelompokkan barang yang berpasangan mirip (union-find). `skor` ≥ 1 = hampir pasti.
 * Hanya pasangan yang berbagi minimal satu kata inti (atau awalan 4 huruf) yang dibandingkan —
 * ±1.000 bahan × 1.000 jadi beberapa ribu perbandingan, bukan setengah juta.
 */
function kelompokkan<T extends { id: bigint }>(d: T[], kata: (x: T) => string[], skor: (a: T, b: T) => number, dilewati: (a: T, b: T) => boolean) {
  const indeks = new Map<string, number[]>();
  d.forEach((x, i) => {
    for (const w of new Set(kata(x).map((k) => k.slice(0, 4)))) indeks.set(w, [...(indeks.get(w) ?? []), i]);
  });
  const pasangan = new Set<string>();
  for (const ids of indeks.values()) if (ids.length < 200) for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) pasangan.add(`${ids[a]}|${ids[b]}`);
  const induk = new Map<string, string>();
  const akar = (x: string): string => {
    const p = induk.get(x);
    return p && p !== x ? akar(p) : x;
  };
  const terlibat = new Set<string>();
  const pasti = new Set<string>();
  for (const p of pasangan) {
    const [i, j] = p.split("|").map(Number);
    const s = skor(d[i], d[j]);
    if (s < 0.75 || dilewati(d[i], d[j])) continue;
    const [a, b] = [d[i].id.toString(), d[j].id.toString()];
    terlibat.add(a);
    terlibat.add(b);
    if (s >= 1) pasti.add(`${a}|${b}`).add(`${b}|${a}`);
    const ra = akar(a);
    const rb = akar(b);
    if (ra !== rb) induk.set(rb, ra);
  }
  const grup = new Map<string, T[]>();
  for (const x of d.filter((y) => terlibat.has(y.id.toString()))) grup.set(akar(x.id.toString()), [...(grup.get(akar(x.id.toString())) ?? []), x]);
  return [...grup.values()].map((g) => ({
    anggota: g,
    pasti: g.every((a) => g.some((b) => a !== b && pasti.has(`${a.id}|${b.id}`))),
  }));
}

const kunciPasangan = (a: string, b: string) => [rapikanTeks(a), rapikanTeks(b)].sort().join("|");

export type AnggotaResep = { id: string; kode: string; nama: string; menu: number; baris: number };
export type KelompokResep = { kunci: string; pasti: boolean; isiSama: boolean; anggota: AnggotaResep[] };
export type AnggotaBahan = { id: string; kode: string; nama: string; satuan: string | null; kemasan: string; resep: number; nota: number; stok: number };
export type KelompokBahan = { kunci: string; pasti: boolean; satuanSama: boolean; anggota: AnggotaBahan[] };

export async function kembarResepBahan(cari = "") {
  const [resep, bahan, lewati] = await Promise.all([
    prisma.recipes.findMany({
      where: { merged_into: null },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        recipe_lines: { select: { ingredient_id: true, qty_per_batch: true } },
        _count: { select: { menus: true } },
      },
    }),
    prisma.ingredients.findMany({
      where: { merged_into: null },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        variant: true,
        usage_unit: true,
        purchase_unit: true,
        usage_qty_per_pack: true,
        _count: { select: { recipe_lines: true, purchase_items: true, stock_movements: true } },
      },
    }),
    prisma.menu_review_skips.findMany({ where: { kind: { in: ["rkembar", "bkembar"] } }, select: { kind: true, a_key: true, b_key: true } }),
  ]);
  const dilewati = new Set(lewati.map((l) => `${l.kind}|${l.a_key}|${l.b_key}`));
  const lolos = (...t: string[]) => !cari || t.some((x) => skorCari(cari, x) > 0);

  // Isi resep sebagai sidik: bahan × takaran, urut.
  const sidik = new Map(resep.map((r) => [r.id, r.recipe_lines.map((l) => `${l.ingredient_id}:${Number(l.qty_per_batch)}`).sort().join(",")]));
  const kataResep = new Map(resep.map((r) => [r.id, { penuh: kataInti(r.name, false), inti: kataInti(r.name) }]));
  const resepKembar: KelompokResep[] = kelompokkan(
    resep,
    (r) => kataResep.get(r.id)!.inti,
    (a, b) => {
      const s = kemiripanKata(kataResep.get(a.id)!.penuh, kataResep.get(b.id)!.penuh);
      if (s >= 0.75) return s;
      // Box vs Prasmanan dengan isi bahan persis sama = kemungkinan kembar.
      return kemiripanKata(kataResep.get(a.id)!.inti, kataResep.get(b.id)!.inti) >= 1 && sidik.get(a.id) && sidik.get(a.id) === sidik.get(b.id) ? 0.9 : 0;
    },
    (a, b) => dilewati.has(`rkembar|${kunciPasangan(a.code, b.code)}`),
  )
    .filter((k) => lolos(...k.anggota.map((r) => r.name)))
    .map((k) => ({
      kunci: k.anggota.map((r) => r.code).join("~"),
      pasti: k.pasti,
      isiSama: new Set(k.anggota.map((r) => sidik.get(r.id))).size === 1,
      anggota: k.anggota
        .map((r) => ({ id: r.id.toString(), kode: r.code, nama: r.name, menu: r._count.menus, baris: r.recipe_lines.length }))
        .sort((a, b) => b.menu - a.menu || b.baris - a.baris || a.kode.localeCompare(b.kode)),
    }))
    .sort((a, b) => Number(b.pasti) - Number(a.pasti) || b.anggota.reduce((s, x) => s + x.menu, 0) - a.anggota.reduce((s, x) => s + x.menu, 0));

  const namaBahan = (b: (typeof bahan)[number]) => [b.name, b.brand, b.variant].filter(Boolean).join(" ");
  const kataBahan = new Map(bahan.map((b) => [b.id, kataInti(namaBahan(b), false)]));
  const bahanKembar: KelompokBahan[] = kelompokkan(
    bahan,
    (b) => kataBahan.get(b.id)!,
    (a, b) => kemiripanKata(kataBahan.get(a.id)!, kataBahan.get(b.id)!),
    (a, b) => dilewati.has(`bkembar|${kunciPasangan(a.code, b.code)}`),
  )
    .filter((k) => lolos(...k.anggota.map(namaBahan)))
    .map((k) => ({
      kunci: k.anggota.map((b) => b.code).join("~"),
      pasti: k.pasti,
      // Satuan pakai yang belum diisi tidak dianggap beda.
      satuanSama: new Set(k.anggota.flatMap((b) => (b.usage_unit?.trim() ? [b.usage_unit.trim().toLowerCase()] : []))).size <= 1,
      anggota: k.anggota
        .map((b) => ({
          id: b.id.toString(),
          kode: b.code,
          nama: namaBahan(b),
          satuan: b.usage_unit,
          kemasan: [b.usage_qty_per_pack ? Number(b.usage_qty_per_pack).toLocaleString("id-ID") : null, b.usage_unit, b.purchase_unit ? `/ ${b.purchase_unit}` : null].filter(Boolean).join(" "),
          resep: b._count.recipe_lines,
          nota: b._count.purchase_items,
          stok: b._count.stock_movements,
        }))
        .sort((a, b) => b.resep + b.nota + b.stok - (a.resep + a.nota + a.stok) || a.kode.localeCompare(b.kode)),
    }))
    .sort((a, b) => Number(b.pasti) - Number(a.pasti) || b.anggota.reduce((s, x) => s + x.resep, 0) - a.anggota.reduce((s, x) => s + x.resep, 0));

  return { resepKembar, bahanKembar };
}
