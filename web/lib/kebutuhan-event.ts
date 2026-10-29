import "server-only";

import { hitungKebutuhan, type PesananMenu } from "./hitung/kebutuhan";
import { porsiProgramTanggal } from "./ikut-menu-pesta";
import { penentuMenu } from "./menu-dapur";
import { prisma } from "./prisma";
import { uraiBarisIsi } from "./slot-paket";

/**
 * Kebutuhan bahan satu tanggal dari event (D-057). Satu-satunya pembaca —
 * halaman Kebutuhan Bahan dan Purchase Request (D-075) memakai hasil yang sama.
 * TANPA harga.
 */
export async function kebutuhanTanggal(tanggal: string) {
  const tgl = new Date(`${tanggal}T00:00:00Z`);
  const event = await prisma.events.findMany({
    where: { status: { not: "batal" }, OR: [{ first_date: tgl }, { event_items: { some: { session_date: tgl } } }] },
    include: { customers: { select: { name: true } }, event_items: { orderBy: { sort: "asc" } } },
  });
  const iso = (t: Date | null) => (t ? t.toISOString().slice(0, 10) : null);

  // Paket pilihan (D-095): "Soup: Sup Pelangi" → nama menu master lewat pilihan paket yang tersambung.
  const opsi = await prisma.package_slot_options.findMany({ where: { menu_id: { not: null } }, select: { name: true, menus: { select: { name: true } } } });
  const kamus = new Map(opsi.map((o) => [o.name.toLowerCase(), o.menus!.name]));

  // Porsi per nama menu (isi paket, atau nama baris itu sendiri bila tanpa rincian).
  const porsiMenu = new Map<string, number>();
  for (const e of event) {
    for (const i of e.event_items.filter((x) => (iso(x.session_date) ?? iso(e.first_date)) === tanggal)) {
      const porsi = Math.round(Number(i.qty) * (i.pax && i.pax > 1 ? i.pax : 1));
      const isi = i.contents ? i.contents.split("\n").flatMap((b) => uraiBarisIsi(b, kamus)) : [i.item_name];
      for (const m of isi) porsiMenu.set(m, (porsiMenu.get(m) ?? 0) + porsi);
    }
  }
  // Pesanan Ikut Menu Pesta (D-116) dimasak bersama acara induknya — porsinya ikut dihitung.
  const program = await porsiProgramTanggal(tanggal);
  for (const p of program) for (const m of p.menu) porsiMenu.set(m.nama, (porsiMenu.get(m.nama) ?? 0) + m.porsi);
  // Nama di dokumen → menu dapur (D-122): persis, beda tanda baca, nama lain, menu yang digabung, salah ketik tipis.
  const { cari, nama: namaMenu } = await penentuMenu();
  const tentu = new Map([...porsiMenu.keys()].map((n) => [n, cari(n)] as const));
  const menu = await prisma.menus.findMany({
    where: { id: { in: [...new Set([...tentu.values()].flatMap((t) => (t ? [BigInt(t.id)] : [])))] } },
    select: {
      id: true,
      name: true,
      portion_factor: true,
      recipes: {
        select: {
          portions_per_batch: true,
          recipe_lines: {
            select: {
              qty_per_batch: true,
              usage_unit: true,
              ingredients: { select: { id: true, name: true, usage_unit: true, usage_qty_per_pack: true, purchase_unit: true, is_placeholder: true } },
            },
          },
        },
      },
    },
  });
  const perId = new Map(menu.map((m) => [m.id.toString(), m]));
  const perNama = new Map([...tentu].flatMap(([n, t]) => (t && perId.has(t.id) ? [[n, perId.get(t.id)!] as const] : [])));
  // Nama yang dihitung sebagai menu lain karena salah ketik tipis — ditampilkan supaya bisa dicek.
  const mirip = [...tentu].flatMap(([n, t]) => (t?.cara === "mirip" ? [{ nama: n, menu: namaMenu.get(t.id) ?? n }] : []));
  const pesanan: PesananMenu[] = [...porsiMenu.entries()].filter(([nama]) => perNama.has(nama)).map(([nama, porsi]) => {
    const m = perNama.get(nama);
    return {
      menu: m && m.name !== nama ? `${nama} → ${m.name}` : nama,
      porsi,
      faktor: m?.portion_factor.toString() ?? "1",
      resep: m?.recipes
        ? {
            porsiPerBatch: m.recipes.portions_per_batch?.toString() ?? null,
            baris: m.recipes.recipe_lines.map((l) => ({
              idBahan: l.ingredients.id.toString(),
              nama: l.ingredients.name,
              satuan: l.usage_unit ?? l.ingredients.usage_unit,
              qtyPerBatch: l.qty_per_batch.toString(),
              perKemasan: l.ingredients.usage_qty_per_pack?.toString() ?? null,
              satuanBeli: l.ingredients.purchase_unit,
              pengganti: l.ingredients.is_placeholder,
            })),
          }
        : null,
    };
  });
  // Nama yang tidak ada di master menu (diketik manual / baris tanpa rincian) — jangan hilang diam-diam.
  const tidakDikenal = [...porsiMenu.entries()].filter(([n]) => !perNama.has(n)).map(([menu, porsi]) => ({ menu, porsi }));
  const { bahan, tanpaResep } = hitungKebutuhan(pesanan);
  const totalPorsi = [...porsiMenu.values()].reduce((a, b) => a + b, 0);
  return { event, program, bahan, tanpaResep, tidakDikenal, mirip, totalPorsi };
}

/** "Serundeng (40 porsi) — belum terhubung resep" per baris, untuk catatan PR. */
export function teksBelumTerhitung(k: { tanpaResep: { menu: string; porsi: number }[]; tidakDikenal: { menu: string; porsi: number }[] }): string[] {
  const p = (n: number) => n.toLocaleString("id-ID");
  return [
    ...k.tanpaResep.map((t) => `${t.menu} (${p(t.porsi)} porsi) — menu belum terhubung resep / porsi resep kosong`),
    ...k.tidakDikenal.map((t) => `${t.menu} (${p(t.porsi)} porsi) — tidak ada di master menu`),
  ];
}
