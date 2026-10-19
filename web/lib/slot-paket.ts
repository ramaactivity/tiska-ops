/* ==========================================================================
   PAKET PILIHAN PER KATEGORI (D-082). Murni.

   Pilihan klien disimpan sebagai isi baris (sub-item) berformat
   "Soup: Sup Pelangi" / "Dessert: Cheesy Cake + Puding Lapis Karamel" —
   format PO Kitchen yang sudah dikenal dapur — jadi terbaca ulang tanpa
   kolom baru. Isi yang ditulis sendiri (tanpa awalan kategori) dibiarkan.
   ========================================================================== */

export type SlotPaket = {
  label: string;
  /** Jumlah yang dipilih klien; 0 = semua opsi termasuk. */
  pilih: number;
  /** Menu tambahan berbayar (opsional). */
  tambahan: boolean;
  catatan: string | null;
  opsi: { nama: string; hargaTambahan: number | null }[];
};

const PEMISAH = " + ";
const awalan = (label: string) => `${label}: `;

/** Kategori pemilik satu baris isi — label terpanjang yang cocok ("Beverage - Tea" menang atas "Beverage"). */
export function slotMilik(nama: string, slot: SlotPaket[]): SlotPaket | undefined {
  return slot.filter((s) => nama.startsWith(awalan(s.label))).sort((a, b) => b.label.length - a.label.length)[0];
}

/**
 * Pilihan yang sudah ada di isi baris, per label kategori. Opsi dikenali dari
 * namanya (terpanjang dulu), bukan dipecah di " + " — nama menu seperti
 * "Cornflake + Susu" mengandung pemisahnya sendiri.
 */
export function bacaPilihan(namaIsi: string[], slot: SlotPaket[]): Map<string, string[]> {
  const hasil = new Map<string, string[]>();
  for (const nama of namaIsi) {
    const s = slotMilik(nama, slot);
    if (!s) continue;
    let sisa = nama.slice(awalan(s.label).length);
    const ketemu: { nama: string; posisi: number }[] = [];
    for (const o of [...s.opsi].sort((a, b) => b.nama.length - a.nama.length)) {
      const i = sisa.indexOf(o.nama);
      if (i < 0) continue;
      ketemu.push({ nama: o.nama, posisi: i });
      sisa = sisa.slice(0, i) + "\u0000".repeat(o.nama.length) + sisa.slice(i + o.nama.length);
    }
    hasil.set(s.label, ketemu.sort((a, b) => a.posisi - b.posisi).map((k) => k.nama));
  }
  return hasil;
}

/** Baris isi untuk satu kategori, atau null bila belum ada yang dipilih. */
export function barisKategori(s: SlotPaket, dipilih: string[]): string | null {
  const isi = s.pilih === 0 && !s.tambahan ? s.opsi.map((o) => o.nama) : dipilih;
  return isi.length ? `${awalan(s.label)}${isi.join(PEMISAH)}` : null;
}

/** Pilih/lepas satu opsi: "pilih 1" bergantian; lebih dari jatah ditolak (dikembalikan apa adanya). */
export function togglePilihan(s: SlotPaket, dipilih: string[], nama: string): string[] {
  if (dipilih.includes(nama)) return dipilih.filter((x) => x !== nama);
  if (s.pilih === 1) return [nama];
  if (s.pilih > 1 && dipilih.length >= s.pilih) return dipilih;
  return [...dipilih, nama];
}

/**
 * Susun ulang isi baris: baris kategori (urut kategori) di depan, isi tulis
 * sendiri di belakang. `kunciLama` mempertahankan kunci React per label.
 */
export function susunIsi<T extends { item_name: string; kunci: string }>(
  isi: T[],
  slot: SlotPaket[],
  pilihan: Map<string, string[]>,
  baru: (nama: string) => T,
): T[] {
  const milikSlot = (n: string) => Boolean(slotMilik(n, slot));
  const lama = new Map(isi.filter((a) => milikSlot(a.item_name)).map((a) => [slotMilik(a.item_name, slot)!.label, a]));
  const kategori = slot.flatMap((s) => {
    const nama = barisKategori(s, pilihan.get(s.label) ?? []);
    if (!nama) return [];
    const ada = lama.get(s.label);
    return [ada ? { ...ada, item_name: nama } : baru(nama)];
  });
  return [...kategori, ...isi.filter((a) => !milikSlot(a.item_name))];
}

/** Kategori wajib yang jumlah pilihannya belum pas. */
export function kategoriKurang(slot: SlotPaket[], pilihan: Map<string, string[]>): string[] {
  return slot.filter((s) => s.pilih > 0 && !s.tambahan && (pilihan.get(s.label)?.length ?? 0) < s.pilih).map((s) => s.label);
}
