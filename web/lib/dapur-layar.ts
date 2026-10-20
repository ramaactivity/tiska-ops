/* ==========================================================================
   DAPUR PER BARIS — Layar Dapur per dapur (D-097). Murni.
   Dapur menu = kolom menus.kitchen bila diisi kepala dapur; selain itu
   ditebak dari kategori (dessert/buah/snack/minuman → pastry & bersih,
   lainnya → masak). Menu tak dikenal → masak.
   ========================================================================== */

export type Dapur = "masak" | "pastry";

const KATEGORI_PASTRY = new Set(["dessert", "fruit", "snack", "beverage"]);

export function dapurMenu(m: { kitchen: string | null; category: string | null } | undefined): Dapur {
  if (m?.kitchen === "masak" || m?.kitchen === "pastry") return m.kitchen;
  return m?.category && KATEGORI_PASTRY.has(m.category) ? "pastry" : "masak";
}

/** Baris isi yang menjadi tugas `dapur` — satu baris bisa milik dua dapur (mis. "Snack: Risoles + Puding"). */
export function saringIsiDapur(isi: string[], dapurBaris: (baris: string) => Set<Dapur>, dapur: Dapur): string[] {
  return isi.filter((b) => dapurBaris(b).has(dapur));
}
