import "server-only";

import { labelUkuran } from "./hitung/cetakan";
import { prisma } from "./prisma";
import { alamatPublik } from "./r2";

/* Cetakan (D-182): data katalog untuk halaman. Harga dikosongkan di server bila peran tidak boleh melihat biaya. */

export type VarianCetakan = { id: string; nama: string; gambar: string | null; halamanCanva: number | null };
export type Cetakan = {
  id: string;
  nama: string;
  grup: string;
  jenis: string;
  lebarMm: number | null;
  tinggiMm: number | null;
  bentuk: string;
  ukuran: string;
  ukuranChat: string;
  judulChat: string;
  bahan: string | null;
  finishing: string | null;
  isiPerA3: number | null;
  hargaPerA3: number | null;
  catatanHarga: string | null;
  canva: string | null;
  gambar: string | null;
  catatan: string | null;
  percetakan: { id: string; nama: string; telepon: string | null } | null;
  varian: VarianCetakan[];
};

const gambar = (kunci: string | null) => (kunci ? alamatPublik(kunci) : null);

export async function daftarCetakan(bolehLihatHarga: boolean): Promise<Cetakan[]> {
  const baris = await prisma.print_items.findMany({
    where: { active: true },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: {
      print_item_variants: { where: { active: true }, orderBy: [{ sort: "asc" }, { name: "asc" }] },
      suppliers: { select: { id: true, name: true, phone: true } },
    },
  });
  return baris.map((b) => {
    const lebar = b.width_mm == null ? null : Number(b.width_mm);
    const tinggi = b.height_mm == null ? null : Number(b.height_mm);
    const ukuran = labelUkuran(lebar, tinggi, b.shape);
    return {
      id: b.id.toString(),
      nama: b.name,
      grup: b.grup,
      jenis: b.kind,
      lebarMm: lebar,
      tinggiMm: tinggi,
      bentuk: b.shape,
      ukuran,
      ukuranChat: b.size_text ?? ukuran,
      judulChat: b.chat_label ?? b.name,
      bahan: b.material,
      finishing: b.finishing,
      isiPerA3: b.pcs_per_sheet,
      hargaPerA3: bolehLihatHarga && b.price_per_sheet != null ? Number(b.price_per_sheet) : null,
      catatanHarga: bolehLihatHarga ? b.price_note : null,
      canva: b.canva_url,
      gambar: gambar(b.thumbnail_key),
      catatan: b.notes,
      percetakan: b.suppliers ? { id: b.suppliers.id.toString(), nama: b.suppliers.name, telepon: b.suppliers.phone } : null,
      varian: b.print_item_variants.map((v) => ({ id: v.id.toString(), nama: v.name, gambar: gambar(v.thumbnail_key), halamanCanva: v.canva_page })),
    };
  });
}

export async function opsiPercetakan() {
  const s = await prisma.suppliers.findMany({ where: { active: true, category: "cetak_kemasan" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return s.map((x) => ({ id: x.id.toString(), label: x.name }));
}
