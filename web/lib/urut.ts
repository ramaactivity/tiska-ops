// File biasa (bukan "use client") karena dipanggil halaman server.

/** Baca ?urut= menjadi kolom + arah; kolom tak dikenal → bawaan. */
export function bacaUrut<K extends string>(nilai: unknown, sah: readonly K[], bawaan: `${"-" | ""}${K}`): { kolom: K; arah: "asc" | "desc" } {
  const v = typeof nilai === "string" && sah.includes(nilai.replace(/^-/, "") as K) ? nilai : bawaan;
  return { kolom: v.replace(/^-/, "") as K, arah: v.startsWith("-") ? "desc" : "asc" };
}

/** Urutkan salinan daftar menurut nilai kunci (angka, tanggal, atau teks). */
export function urutkan<T>(daftar: T[], ambil: (x: T) => number | string | Date | null, arah: "asc" | "desc"): T[] {
  const k = arah === "asc" ? 1 : -1;
  const n = (v: number | string | Date | null) => (v instanceof Date ? v.getTime() : v);
  return [...daftar].sort((a, b) => {
    const x = n(ambil(a));
    const y = n(ambil(b));
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (typeof x === "string" && typeof y === "string" ? x.localeCompare(y, "id") : x < y ? -1 : 1) * k;
  });
}
