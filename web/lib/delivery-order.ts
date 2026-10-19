/* ==========================================================================
   DELIVERY ORDER / SURAT JALAN (D-077). Murni.
   Dibawa driver, ditandatangani penerima. TIDAK PERNAH memuat harga.
   ========================================================================== */

/** "QUO/TC/2610/007" + kloter 2 → "DO/TC/2610/007-K2". */
export function nomorDo(nomorQuotation: string, kloter?: number | null): string {
  return `DO/${nomorQuotation.replace(/^[A-Z]+\//, "")}${kloter ? `-K${kloter}` : ""}`;
}

const jam = (t: string | null | undefined) => {
  const m = t?.match(/(\d{1,2})[.:](\d{2})/);
  return m ? `${m[1].padStart(2, "0")}.${m[2]}` : null;
};

/**
 * Barang yang dibawa satu kloter: yang jam sesinya sama dengan jam berangkat;
 * kalau tidak ada yang cocok (umumnya acara satu jam), semua barang di tanggal itu.
 */
export function barangKloter<T extends { session_time: string | null }>(items: T[], jamBerangkat: string | null): T[] {
  const j = jam(jamBerangkat);
  const cocok = j ? items.filter((i) => jam(i.session_time) === j) : [];
  return cocok.length ? cocok : items;
}
