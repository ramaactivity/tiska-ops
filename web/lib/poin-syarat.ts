/* ==========================================================================
   POIN S&K (D-064) — isi satu bagian S&K disimpan sebagai teks per baris
   ("1 …", "5.1 …", atau baris tanpa nomor) karena teks itulah yang disalin
   apa adanya ke quotation (lib/syarat.ts). Penyunting memecahnya menjadi
   poin supaya nomor tidak perlu diketik dan selalu urut. Murni.
   ========================================================================== */

export type JenisPoin = "poin" | "sub" | "catatan";
export type Poin = { jenis: JenisPoin; teks: string };

export function uraiPoin(isi: string): Poin[] {
  return isi
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l): Poin => {
      const sub = l.match(/^\d+\.\d+\.?\s+(.*)$/);
      if (sub) return { jenis: "sub", teks: sub[1] };
      const poin = l.match(/^\d+\.?\s+(.*)$/);
      if (poin) return { jenis: "poin", teks: poin[1] };
      return { jenis: "catatan", teks: l };
    });
}

/** Label nomor tiap poin: "1", "5.1", atau "" untuk catatan. */
export function nomorPoin(poin: Poin[]): string[] {
  let n = 0;
  let m = 0;
  return poin.map((p) => {
    if (p.jenis === "poin") {
      n += 1;
      m = 0;
      return String(n);
    }
    if (p.jenis === "sub") {
      m += 1;
      return `${Math.max(n, 1)}.${m}`;
    }
    return "";
  });
}

export function tulisPoin(poin: Poin[]): string {
  const rapi = poin.map((p) => ({ ...p, teks: p.teks.replace(/\s*\n\s*/g, " ").trim() })).filter((p) => p.teks);
  const nomor = nomorPoin(rapi);
  return rapi.map((p, i) => (p.jenis === "catatan" ? p.teks : `${nomor[i]} ${p.teks}`)).join("\n");
}
