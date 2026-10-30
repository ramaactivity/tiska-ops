import { calonMirip, kata } from "../cari-mirip";
import type { HasilMenu } from "./menu-dapur";

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

/** Potongan nama file/folder yang bukan nama menu: "IMG_1234", "DSC0001", "WhatsApp Image 2026-…", tanggal, angka. */
const GENERIK = /^(img|dsc|dscn|pxl|photo|foto|image|whatsapp image|wa|screenshot|vid|p)\b|^[\d\s-]+$/;

/**
 * Tebak menu dari jalur file ("Event Agro/Ayam Bakar Madu/IMG_01.jpg"): bagian paling dalam dulu.
 * Cocok pasti (nama, beda tanda baca, nama lain) menang; selain itu nama mirip ≥ 0,6.
 */
export function buatPenebakMenu(cari: { cari: (nama: string) => HasilMenu | null; nama: Map<string, string> }, menu: { id: string; nama: string }[]) {
  return (jalur: string | null): { id: string; nama: string } | null => {
    if (!jalur) return null;
    const bagian = jalur.replace(/\.[a-z0-9]+$/i, "").split("/").reverse();
    for (const b of bagian) {
      const bersih = kata(b).join(" ");
      if (bersih.length < 4 || GENERIK.test(bersih)) continue;
      const t = cari.cari(b);
      if (t && t.cara !== "mirip") return { id: t.id, nama: cari.nama.get(t.id) ?? b };
      const c = calonMirip(b, menu, (m) => m.nama, 0.6, 1)[0];
      if (c) return c.x;
    }
    return null;
  };
}
