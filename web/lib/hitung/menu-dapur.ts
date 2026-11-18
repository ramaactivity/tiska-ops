/* ==========================================================================
   MENU DAPUR (D-122) — murni.

   Satu menu dapur (punya resep), banyak nama jual. Dokumen, paket, dan
   pricelist menyimpan NAMA; fungsi ini menentukan menu dapurnya:
     1. persis       nama menu aktif sama persis
     2. rapi         sama setelah dirapikan (huruf besar-kecil, tanda baca, kode "[PR-06]")
     3. nama lain    terdaftar sebagai nama lain sebuah menu
     4. digabung     menu lama yang sudah digabung → induknya
     5. mirip        salah ketik tipis (beda 1 huruf, nama ≥ 10 huruf, calon tunggal)
   Selain itu null — tampil di Rapikan Menu sebagai "nama belum dikenal".
   ========================================================================== */

import { jarakEdit, rapikanTeks } from "@/lib/cari-mirip";

export type DataMenu = { id: string; name: string; active: boolean; adaResep: boolean; mergedInto: string | null };
export type DataNamaLain = { menuId: string; name: string };
export type CaraKetemu = "persis" | "rapi" | "nama lain" | "digabung" | "mirip";
export type HasilMenu = { id: string; cara: CaraKetemu };

/**
 * Kunci perbandingan nama menu: tanpa kode paket di depan ("[PR-06] …") dan tanpa nomor urut yang terbawa dari
 * daftar Excel ("1. Nasi Putih", "5) Kerupuk" — 35 baris isi tak dikenal dapur karena ini), dirapikan.
 * "1 Snack Asin" (tanpa titik/kurung) tetap utuh: angkanya bagian dari nama.
 */
export function kunciMenu(nama: string): string {
  return rapikanTeks(nama.replace(/^\s*\[[^\]]*\]\s*/, "").replace(/^\s*\d{1,2}\s*[.)]\s*/, ""));
}

export function buatPenentuMenu(menu: DataMenu[], namaLain: DataNamaLain[]): (nama: string) => HasilMenu | null {
  const perId = new Map(menu.map((m) => [m.id, m]));
  const induk = (id: string): string => {
    let m = perId.get(id);
    for (let i = 0; m?.mergedInto && i < 10; i++) m = perId.get(m.mergedInto) ?? m;
    return m?.id ?? id;
  };
  const aktif = menu.filter((m) => m.active);
  const persis = new Map(aktif.map((m) => [m.name.trim(), m]));
  // Dua menu aktif dengan kunci sama (menu kembar belum digabung): yang punya resep menang, lalu yang paling lama.
  const perKunci = new Map<string, DataMenu>();
  for (const m of [...aktif].sort((a, b) => Number(b.adaResep) - Number(a.adaResep) || Number(a.id) - Number(b.id))) {
    const k = kunciMenu(m.name);
    if (k && !perKunci.has(k)) perKunci.set(k, m);
  }
  const perAlias = new Map(namaLain.map((a) => [kunciMenu(a.name), a.menuId]));
  const nonaktif = new Map(menu.filter((m) => !m.active).map((m) => [kunciMenu(m.name), m]));
  // Kandidat salah ketik: semua kunci yang dikenal → menu dapurnya.
  const dikenal = [...[...perKunci].map(([k, m]) => [k, m.id] as const), ...[...perAlias].map(([k, id]) => [k, induk(id)] as const)];

  return (nama: string) => {
    const t = nama.trim();
    if (!t) return null;
    const k = kunciMenu(t);
    const r = perKunci.get(k);
    const p = persis.get(t);
    // Nama persis tapi belum beresep, sementara kembarannya (beda tanda baca) beresep → pakai yang beresep.
    if (p) return !p.adaResep && r?.adaResep ? { id: r.id, cara: "rapi" } : { id: p.id, cara: "persis" };
    if (!k) return null;
    if (r) return { id: r.id, cara: "rapi" };
    const a = perAlias.get(k);
    if (a) return { id: induk(a), cara: "nama lain" };
    const n = nonaktif.get(k);
    if (n?.mergedInto) return { id: induk(n.id), cara: "digabung" };
    if (n) return { id: n.id, cara: "rapi" };
    if (k.length >= 10) {
      const dekat = dikenal.filter(([kk]) => Math.abs(kk.length - k.length) <= 2 && jarakEdit(k, kk, 2) <= 2);
      const satu = dekat.filter(([kk]) => jarakEdit(k, kk, 1) <= 1);
      const target = new Set(dekat.map(([, id]) => id));
      if (satu.length && target.size === 1) return { id: satu[0][1], cara: "mirip" };
    }
    return null;
  };
}
