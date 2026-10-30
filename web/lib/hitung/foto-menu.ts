/* ==========================================================================
   FOTO MENU (D-124) — murni.
   ========================================================================== */

export const SAJIAN = { box: "Box", prasmanan: "Prasmanan / buffet", stall: "Stall", plated: "Plated", lainnya: "Lainnya" } as const;
export type Sajian = keyof typeof SAJIAN;

/** Kunci berkas di R2: "menu/2026/<uuid>.jpg" + thumbnail "menu/2026/<uuid>_t.jpg". */
const POLA = /^menu\/\d{4}\/[0-9a-f-]{36}\.jpg$/;
export function kunciSah(utama: string, thumb: string): boolean {
  return POLA.test(utama) && thumb === utama.replace(/\.jpg$/, "_t.jpg");
}

/** Nama berkas saat diunduh/dikirim: "ayam-bakar-madu-1.jpg". */
export function namaUnduhan(nama: string, urutan: number): string {
  const dasar =
    nama
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "foto-menu";
  return `${dasar}-${urutan}.jpg`;
}
