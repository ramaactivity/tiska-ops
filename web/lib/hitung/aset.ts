/* ==========================================================================
   ASET DIGITAL (D-127) — murni. Tautan Drive/Canva/dokumen yang dibuka dari Tiska Ops.
   ========================================================================== */

export const KATEGORI_ASET = {
  dokumentasi: "Dokumentasi acara",
  pricelist: "Pricelist",
  brosur: "Brosur & katalog",
  kartu_menu: "Kartu menu",
  kartu_nama: "Kartu nama",
  label_stiker: "Label & stiker",
  sosmed: "Konten sosmed",
  dokumen: "Dokumen penting",
  lainnya: "Lainnya",
} as const;
export type KategoriAset = keyof typeof KATEGORI_ASET;

/** Tautan yang ditempel → alamat lengkap https://…; null kalau bukan alamat web. "drive.google.com/…" tanpa https ikut diterima. */
export function rapikanTautan(teks: string): string | null {
  const t = teks.trim();
  if (!t || /\s/.test(t)) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    if ((u.protocol !== "https:" && u.protocol !== "http:") || !u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

export type JenisTautan = "folder" | "drive" | "docs" | "sheets" | "slides" | "form" | "canva" | "lain";

/** Jenis tautan dari alamatnya — untuk ikon & label kartu. */
export function jenisTautan(url: string): { jenis: JenisTautan; label: string } {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { jenis: "lain", label: "Tautan" };
  }
  const host = u.hostname.replace(/^www\./, "");
  const p = u.pathname;
  if (host === "drive.google.com") return /\/folders\//.test(p) ? { jenis: "folder", label: "Folder Google Drive" } : { jenis: "drive", label: "Berkas Google Drive" };
  if (host === "docs.google.com") {
    if (p.startsWith("/spreadsheets")) return { jenis: "sheets", label: "Google Sheets" };
    if (p.startsWith("/presentation")) return { jenis: "slides", label: "Google Slides" };
    if (p.startsWith("/forms")) return { jenis: "form", label: "Google Form" };
    return { jenis: "docs", label: "Google Docs" };
  }
  if (host === "canva.com" || host.endsWith(".canva.com") || host === "canva.link") return { jenis: "canva", label: "Canva" };
  return { jenis: "lain", label: host };
}
