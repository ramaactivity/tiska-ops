import "server-only";

import { labelUkuran } from "./hitung/cetakan";
import { prisma } from "./prisma";
import { alamatPublik } from "./r2";

/* Cetakan (D-182): data katalog untuk halaman. Harga dikosongkan di server bila peran tidak boleh melihat biaya. */

export type VarianCetakan = { id: string; nama: string; gambar: string | null; halamanCanva: number | null; sisa: number | null };
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
  /** Tahap 2: satuan & batas stok; `sisa` untuk cetakan tanpa varian (null = belum pernah dihitung). */
  satuanStok: string;
  stokMin: number | null;
  sisa: number | null;
};

const gambar = (kunci: string | null) => (kunci ? alamatPublik(kunci) : null);

export async function daftarCetakan(bolehLihatHarga: boolean): Promise<Cetakan[]> {
  const saldo = await prisma.print_stock_movements.groupBy({ by: ["item_id", "variant_id"], _sum: { qty: true } });
  const sisaDi = (item: bigint, varian: bigint | null) => {
    const s = saldo.find((x) => x.item_id === item && x.variant_id === varian);
    return s ? (s._sum.qty ?? 0) : null;
  };
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
      varian: b.print_item_variants.map((v) => ({ id: v.id.toString(), nama: v.name, gambar: gambar(v.thumbnail_key), halamanCanva: v.canva_page, sisa: sisaDi(b.id, v.id) })),
      satuanStok: b.stock_unit,
      stokMin: b.min_stock,
      sisa: sisaDi(b.id, null),
    };
  });
}

export async function opsiPercetakan() {
  const s = await prisma.suppliers.findMany({ where: { active: true, category: "cetak_kemasan" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return s.map((x) => ({ id: x.id.toString(), label: x.name }));
}

export type BarisPermintaan = { itemId: string; varianId: string | null; nama: string; varian: string | null; gambar: string | null; lembar: number };
export type Permintaan = {
  id: string;
  status: string;
  tanggal: string;
  catatan: string | null;
  balasan: string | null;
  peminta: { id: string; nama: string };
  pemutus: string | null;
  dibuat: string;
  baris: BarisPermintaan[];
};

/** Permintaan cetak (D-183): admin/owner melihat semua, peran lain hanya miliknya. 60 hari terakhir + yang masih berjalan. */
export async function daftarPermintaan(semua: boolean, idUser: bigint): Promise<Permintaan[]> {
  const batas = new Date(Date.now() - 60 * 86_400_000);
  const baris = await prisma.print_requests.findMany({
    where: { ...(semua ? {} : { requested_by: idUser }), OR: [{ created_at: { gte: batas } }, { status: { in: ["diajukan", "perlu_tanya", "disetujui", "dipesan", "menunggu_bayar", "dibayar"] } }] },
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      users_print_requests_requested_byTousers: { select: { id: true, name: true } },
      users_print_requests_decided_byTousers: { select: { name: true } },
      print_request_lines: {
        orderBy: { id: "asc" },
        include: { print_items: { select: { name: true, thumbnail_key: true } }, print_item_variants: { select: { name: true, thumbnail_key: true } } },
      },
    },
  });
  return baris.map((p) => ({
    id: p.id.toString(),
    status: p.status,
    tanggal: p.needed_date.toISOString().slice(0, 10),
    catatan: p.note,
    balasan: p.reply,
    peminta: { id: p.users_print_requests_requested_byTousers.id.toString(), nama: p.users_print_requests_requested_byTousers.name },
    pemutus: p.users_print_requests_decided_byTousers?.name ?? null,
    dibuat: p.created_at.toISOString(),
    baris: p.print_request_lines.map((l) => ({
      itemId: l.item_id.toString(),
      varianId: l.variant_id?.toString() ?? null,
      nama: l.print_items.name,
      varian: l.print_item_variants?.name ?? null,
      gambar: gambar(l.print_item_variants?.thumbnail_key ?? l.print_items.thumbnail_key),
      lembar: l.sheets,
    })),
  }));
}
