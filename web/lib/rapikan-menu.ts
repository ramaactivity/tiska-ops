import "server-only";

import { calonMirip, kemiripanNama, skorCari } from "./cari-mirip";
import { buatPenentuMenu, kunciMenu } from "./hitung/menu-dapur";
import { prisma } from "./prisma";
import { uraiBarisIsi } from "./slot-paket";

/* ==========================================================================
   RAPIKAN MENU (D-122) — daftar kerja Pak Reza & dapur. TANPA harga.

   Semua saran dihitung dari data, tidak ada yang diubah di sini:
     kembar      menu aktif yang namanya sama/mirip → Gabungkan
     resep       menu tanpa resep yang punya resep bernama mirip → Sambungkan
     nama        nama di pilihan paket / dokumen mendatang yang belum dikenal → nama lain / menu baru
     belumResep  menu aktif tanpa resep dan tanpa calon → tugas dapur
   ========================================================================== */

export type AnggotaKembar = { id: string; nama: string; resep: { id: string; nama: string } | null; paket: number; pilihan: number; namaLain: number };
export type KelompokKembar = { kunci: string; pasti: boolean; anggota: AnggotaKembar[]; usulanInduk: string };
export type SaranResep = { idMenu: string; nama: string; paket: number; calon: { id: string; nama: string; kode: string; skor: number }[] };
export type NamaBelumDikenal = {
  nama: string;
  pilihan: number;
  dokumen: number;
  contoh: string[];
  /** Dihitung sebagai menu ini karena salah ketik tipis — perlu dipastikan. */
  tebakan: { id: string; nama: string } | null;
  calon: { id: string; nama: string; skor: number }[];
};
export type DataRapikan = Awaited<ReturnType<typeof dataRapikan>>;

const hariIniWib = () => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())}T00:00:00Z`);

export async function dataRapikan(cari = "") {
  const hariIni = hariIniWib();
  const [menu, resep, alias, lewati, opsi, event, isiQuo, isiPaket] = await Promise.all([
    prisma.menus.findMany({
      select: {
        id: true,
        name: true,
        active: true,
        merged_into: true,
        recipe_id: true,
        recipes: { select: { id: true, name: true } },
        _count: { select: { package_items: true, package_slot_options: true, menu_aliases: true } },
      },
    }),
    prisma.recipes.findMany({ select: { id: true, code: true, name: true } }),
    prisma.menu_aliases.findMany({ select: { menu_id: true, name: true } }),
    prisma.menu_review_skips.findMany({ select: { kind: true, a_key: true, b_key: true } }),
    prisma.package_slot_options.findMany({ select: { name: true, menu_id: true, package_slots: { select: { packages: { select: { code: true } } } } } }),
    prisma.events.findMany({
      where: { status: { not: "batal" }, OR: [{ first_date: { gte: hariIni } }, { event_items: { some: { session_date: { gte: hariIni } } } }] },
      select: { event_items: { select: { item_name: true, contents: true } } },
    }),
    prisma.quotation_items.findMany({
      where: { parent_id: { not: null }, quotations: { status: { in: ["draft", "sent", "approved"] }, event_date: { gte: hariIni } } },
      select: { item_name: true },
    }),
    prisma.package_items.findMany({ select: { menus: { select: { recipe_id: true } } } }),
  ]);

  const cariMenu = buatPenentuMenu(
    menu.map((m) => ({ id: m.id.toString(), name: m.name, active: m.active, adaResep: m.recipe_id !== null, mergedInto: m.merged_into?.toString() ?? null })),
    alias.map((a) => ({ menuId: a.menu_id.toString(), name: a.name })),
  );
  const aktif = menu.filter((m) => m.active);
  const perId = new Map(menu.map((m) => [m.id.toString(), m]));
  const dilewati = new Set(lewati.map((l) => `${l.kind}|${l.a_key}|${l.b_key}`));
  const lolosCari = (...t: string[]) => !cari || t.some((x) => skorCari(cari, x) > 0);

  /* ---------- Menu kembar: pasangan kata inti sama (urutan, tanda baca, kata sajian, salah ketik tipis) ---------- */
  const induk = new Map<string, string>();
  const akar = (x: string): string => (induk.get(x) && induk.get(x) !== x ? akar(induk.get(x)!) : x);
  const pasti = new Set<string>();
  const terlibat = new Set<string>();
  for (let i = 0; i < aktif.length; i++) {
    for (let j = i + 1; j < aktif.length; j++) {
      const a = aktif[i];
      const b = aktif[j];
      const s = kemiripanNama(a.name, b.name);
      if (s < 0.75) continue;
      const [x, y] = [kunciMenu(a.name), kunciMenu(b.name)].sort();
      if (dilewati.has(`kembar|${x}|${y}`)) continue;
      terlibat.add(a.id.toString());
      terlibat.add(b.id.toString());
      const ra = akar(a.id.toString());
      const rb = akar(b.id.toString());
      if (ra !== rb) induk.set(rb, ra);
      if (s === 1) pasti.add(`${a.id}|${b.id}`);
    }
  }
  const grup = new Map<string, typeof aktif>();
  for (const m of aktif.filter((x) => terlibat.has(x.id.toString()))) {
    const r = akar(m.id.toString());
    grup.set(r, [...(grup.get(r) ?? []), m]);
  }
  const kembar: KelompokKembar[] = [...grup.values()]
    .filter((g) => g.length > 1 && lolosCari(...g.map((m) => m.name)))
    .map((g) => {
      const anggota = g
        .map((m) => ({
          id: m.id.toString(),
          nama: m.name,
          resep: m.recipes ? { id: m.recipes.id.toString(), nama: m.recipes.name } : null,
          paket: m._count.package_items,
          pilihan: m._count.package_slot_options,
          namaLain: m._count.menu_aliases,
        }))
        .sort((a, b) => Number(Boolean(b.resep)) - Number(Boolean(a.resep)) || b.paket + b.pilihan - (a.paket + a.pilihan) || Number(a.id) - Number(b.id));
      const yakin = g.every((a) => g.some((b) => a !== b && (pasti.has(`${a.id}|${b.id}`) || pasti.has(`${b.id}|${a.id}`))));
      return { kunci: g.map((m) => kunciMenu(m.name)).sort().join("~"), pasti: yakin, anggota, usulanInduk: anggota[0].id };
    })
    .sort((a, b) => Number(b.pasti) - Number(a.pasti) || b.anggota.reduce((s, x) => s + x.paket + x.pilihan, 0) - a.anggota.reduce((s, x) => s + x.paket + x.pilihan, 0));

  /* ---------- Menu tanpa resep → calon resep bernama mirip ---------- */
  const tanpaResep = aktif.filter((m) => !m.recipe_id);
  const saranResep: SaranResep[] = [];
  const belumResep: { id: string; nama: string; paket: number; pilihan: number }[] = [];
  for (const m of tanpaResep) {
    const calon = calonMirip(m.name, resep, (r) => r.name, 0.5, 3).filter((c) => !dilewati.has(`resep|${kunciMenu(m.name)}|${c.x.code}`));
    const pakai = m._count.package_items + m._count.package_slot_options;
    if (calon.length) {
      if (lolosCari(m.name, ...calon.map((c) => c.x.name)))
        saranResep.push({ idMenu: m.id.toString(), nama: m.name, paket: pakai, calon: calon.map((c) => ({ id: c.x.id.toString(), nama: c.x.name, kode: c.x.code, skor: c.skor })) });
    } else if (lolosCari(m.name)) belumResep.push({ id: m.id.toString(), nama: m.name, paket: m._count.package_items, pilihan: m._count.package_slot_options });
  }
  saranResep.sort((a, b) => b.paket - a.paket || b.calon[0].skor - a.calon[0].skor);
  belumResep.sort((a, b) => b.paket + b.pilihan - (a.paket + a.pilihan));

  /* ---------- Nama belum dikenal: pilihan paket belum tersambung + isi dokumen mendatang ---------- */
  const kamus = new Map(opsi.filter((o) => o.menu_id).map((o) => [o.name.toLowerCase(), perId.get(o.menu_id!.toString())?.name ?? o.name]));
  const nama = new Map<string, { nama: string; pilihan: number; dokumen: number; contoh: Set<string> }>();
  const catat = (n: string, jenis: "pilihan" | "dokumen", contoh: string) => {
    const k = kunciMenu(n);
    if (k.length < 2) return;
    const x = nama.get(k) ?? { nama: n.trim(), pilihan: 0, dokumen: 0, contoh: new Set<string>() };
    x[jenis]++;
    if (contoh) x.contoh.add(contoh);
    nama.set(k, x);
  };
  for (const o of opsi) if (!o.menu_id) catat(o.name, "pilihan", o.package_slots.packages.code);
  for (const e of event)
    for (const i of e.event_items) for (const n of i.contents ? i.contents.split("\n").flatMap((b) => uraiBarisIsi(b, kamus)) : [i.item_name]) catat(n, "dokumen", "");
  for (const q of isiQuo) for (const n of uraiBarisIsi(q.item_name, kamus)) catat(n, "dokumen", "");
  const pilihanMenu = [...aktif.map((m) => ({ id: m.id.toString(), nama: m.name })), ...alias.map((a) => ({ id: a.menu_id.toString(), nama: a.name }))];
  const belumDikenal: NamaBelumDikenal[] = [];
  for (const [k, x] of nama) {
    const t = cariMenu(x.nama);
    if (t && t.cara !== "mirip") continue;
    if (dilewati.has(`nama|${k}|*`) || !lolosCari(x.nama)) continue;
    const calon = calonMirip(x.nama, pilihanMenu, (p) => p.nama, 0.5, 6)
      .filter((c, i, s) => s.findIndex((d) => d.x.id === c.x.id) === i)
      .slice(0, 3)
      .map((c) => ({ id: c.x.id, nama: perId.get(c.x.id)?.name ?? c.x.nama, skor: c.skor }));
    belumDikenal.push({ nama: x.nama, pilihan: x.pilihan, dokumen: x.dokumen, contoh: [...x.contoh].slice(0, 3), tebakan: t ? { id: t.id, nama: perId.get(t.id)?.name ?? "" } : null, calon });
  }
  belumDikenal.sort((a, b) => b.dokumen - a.dokumen || b.pilihan - a.pilihan);

  /* ---------- Kemajuan ---------- */
  const namaPilihan = [...new Set(opsi.map((o) => kunciMenu(o.name)))];
  const pilihanBeresep = namaPilihan.filter((k) => {
    const t = cariMenu(k);
    return t && t.cara !== "mirip" && perId.get(t.id)?.recipe_id;
  }).length;
  const kemajuan = {
    isiPaket: { siap: isiPaket.filter((i) => i.menus.recipe_id).length, total: isiPaket.length },
    pilihanPaket: { siap: pilihanBeresep, total: namaPilihan.length },
    menu: { siap: aktif.length - tanpaResep.length, total: aktif.length },
  };

  return { kembar, saranResep, belumDikenal, belumResep, kemajuan, resep: resep.map((r) => ({ id: r.id.toString(), label: r.name, sub: r.code })), menu: aktif.map((m) => ({ id: m.id.toString(), label: m.name })) };
}
