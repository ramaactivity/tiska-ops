"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hargaBahanSistem } from "@/lib/harga-bahan";
import { barisDariKebutuhan, totalBelanja } from "@/lib/hitung/belanja";
import { kebutuhanTanggal, teksBelumTerhitung } from "@/lib/kebutuhan-event";
import { nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { bolehKelolaUang } from "@/lib/peran";
import { satuanStok } from "@/lib/hitung/stok";
import { pesanPrDiajukan, pesanPrDiputus } from "@/lib/hitung/notifikasi";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { saldoStok } from "@/lib/stok";
import { pastikanIzin } from "@/lib/rbac";

/* Purchase Request (Fase 3.7a, D-075). Harga perkiraan dihitung & disimpan di
   server; layar hanya menampilkannya ke peran yang boleh melihat biaya. */

async function prIni(id: string, kelolaUang = false) {
  const sesi = await pastikanIzin("belanja");
  if (kelolaUang && !bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang boleh menyetujui belanja.");
  if (!/^\d+$/.test(id)) throw new Error("PR tidak dikenal.");
  const pr = await prisma.purchase_requests.findUnique({ where: { id: BigInt(id) } });
  if (!pr) throw new Error("PR tidak ditemukan.");
  return { sesi, pr };
}

/** Ubah status hanya bila status saat ini masih yang diharapkan — dua orang menekan bersamaan tidak saling menimpa. */
async function pindahStatus(id: bigint, dari: string[], data: Parameters<typeof prisma.purchase_requests.update>[0]["data"]) {
  const { count } = await prisma.purchase_requests.updateMany({ where: { id, status: { in: dari } }, data: { ...data, updated_at: new Date() } });
  if (!count) throw new Error("Status PR sudah berubah. Muat ulang halaman.");
  revalidatePath("/belanja");
  revalidatePath(`/belanja/${id}`);
}

/** Buat PR dari Kebutuhan Bahan satu tanggal — rumus & daftar yang sama persis dengan halamannya. */
export async function buatPrDariTanggal(tanggal: string): Promise<void> {
  const sesi = await pastikanIzin("belanja");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error("Tanggal tidak sah.");
  const k = await kebutuhanTanggal(tanggal);
  if (!k.event.length) throw new Error("Tidak ada event di tanggal ini.");
  const idBahan = k.bahan.map((b) => BigInt(b.idBahan));
  const [harga, saldo, bahanStok] = await Promise.all([
    hargaBahanSistem(idBahan),
    saldoStok(idBahan),
    prisma.ingredients.findMany({ where: { id: { in: idBahan } }, select: { id: true, min_stock: true, usage_unit: true, purchase_unit: true } }),
  ]);
  // Stok gudang dikurangkan & minimum diisi ulang (D-087).
  const stok = new Map(
    bahanStok.map((b) => [b.id.toString(), { saldo: saldo.get(b.id.toString()) ?? 0, minimum: b.min_stock, satuan: satuanStok(b) }]),
  );
  const { baris, cukupDariStok } = barisDariKebutuhan(k.bahan, new Map([...harga].map(([id, h]) => [id.toString(), h])), stok);
  const angka = (n: { toString(): string }) => Number(n.toString()).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  const belum = [
    ...teksBelumTerhitung(k).map((t) => `Belum terhitung: ${t}`),
    ...cukupDariStok.map((c) => `Cukup dari stok gudang: ${c.nama} ${angka(c.qty)} ${c.satuan ?? ""}`.trim()),
  ];
  const pr = await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("purchase_requests", "pr_number", "PR"),
    (nomor) =>
      prisma.purchase_requests.create({
        data: {
          pr_number: nomor,
          need_date: new Date(`${tanggal}T00:00:00Z`),
          event_ids: k.event.map((e) => e.id),
          est_total: totalBelanja(baris).total,
          notes: belum.length ? `Catatan otomatis (tambahkan manual bila perlu):\n${belum.join("\n")}` : null,
          created_by: BigInt(sesi.id),
          purchase_request_items: {
            create: baris.map((b, i) => ({
              ingredient_id: b.idBahan ? BigInt(b.idBahan) : null,
              item_name: b.nama,
              qty_needed: b.qtyPerlu,
              qty_from_stock: b.dariStok,
              usage_unit: b.satuanPakai,
              qty_to_buy: b.qtyBeli,
              buy_unit: b.satuanBeli,
              est_price: b.hargaPerkiraan,
              sort: i,
            })),
          },
        },
        select: { id: true },
      }),
  );
  revalidatePath("/belanja");
  revalidatePath("/kebutuhan-bahan");
  redirect(`/belanja/${pr.id}`);
}

const skemaBaris = z.object({
  id: z.string().regex(/^\d+$/).nullable(),
  idBahan: z.string().regex(/^\d+$/).nullable(),
  nama: z.string().trim().min(1, "Nama barang wajib diisi.").max(255),
  qtyBeli: z.coerce.number().min(0, "Jumlah tidak boleh minus.").max(1_000_000),
  satuanBeli: z.string().trim().max(30).nullable(),
  note: z.string().trim().max(255).nullable(),
});
export type IsianBarisPr = z.input<typeof skemaBaris>;

/**
 * Simpan isi PR (hanya saat Draft). Baris lama mempertahankan harga & jumlah
 * perlu dari server — layar gudang tidak pernah menerima harga, jadi tidak
 * boleh ikut menentukannya. Baris baru dari master bahan diberi harga kemasan.
 */
export async function simpanIsiPr(id: string, isian: IsianBarisPr[], catatan: string): Promise<void> {
  const { pr } = await prIni(id);
  if (pr.status !== "draft") throw new Error("Isi PR hanya bisa diubah saat Draft.");
  const baris = z.array(skemaBaris).max(500).parse(isian);
  const lama = new Map(
    (await prisma.purchase_request_items.findMany({ where: { pr_id: pr.id } })).map((b) => [b.id.toString(), b]),
  );
  const idBahanBaru = baris.filter((b) => !b.id && b.idBahan).map((b) => BigInt(b.idBahan!));
  const [bahan, harga] = await Promise.all([
    prisma.ingredients.findMany({ where: { id: { in: idBahanBaru } }, select: { id: true, name: true, purchase_unit: true, usage_unit: true, usage_qty_per_pack: true } }),
    hargaBahanSistem(idBahanBaru),
  ]);
  const perBahan = new Map(bahan.map((b) => [b.id.toString(), b]));

  const data = baris.map((b, i) => {
    const ada = b.id ? lama.get(b.id) : undefined;
    if (b.id && !ada) throw new Error("Ada baris yang sudah dihapus orang lain. Muat ulang halaman.");
    if (ada) {
      return {
        pr_id: pr.id,
        ingredient_id: ada.ingredient_id,
        item_name: ada.item_name,
        qty_needed: ada.qty_needed,
        qty_from_stock: ada.qty_from_stock,
        usage_unit: ada.usage_unit,
        qty_to_buy: b.qtyBeli,
        buy_unit: ada.buy_unit,
        est_price: ada.est_price,
        source: ada.source,
        note: b.note,
        sort: i,
      };
    }
    const m = b.idBahan ? perBahan.get(b.idBahan) : undefined;
    if (b.idBahan && !m) throw new Error("Bahan tidak ditemukan.");
    const h = m ? harga.get(m.id) : undefined;
    const kemasan = m?.purchase_unit && m.usage_qty_per_pack && Number(m.usage_qty_per_pack) > 0;
    return {
      pr_id: pr.id,
      ingredient_id: m?.id ?? null,
      item_name: m?.name ?? b.nama,
      qty_needed: null,
      qty_from_stock: null,
      usage_unit: null,
      qty_to_buy: b.qtyBeli,
      buy_unit: m ? (kemasan ? m.purchase_unit : m.usage_unit) : b.satuanBeli,
      est_price: !h ? null : kemasan ? (h.perKemasan ?? h.perSatuan.times(m!.usage_qty_per_pack!.toString())) : h.perSatuan,
      source: "manual",
      note: b.note,
      sort: i,
    };
  });
  const total = totalBelanja(data.map((b) => ({ qtyBeli: b.qty_to_buy, hargaPerkiraan: b.est_price }))).total;
  await prisma.$transaction([
    prisma.purchase_request_items.deleteMany({ where: { pr_id: pr.id } }),
    prisma.purchase_request_items.createMany({ data }),
    prisma.purchase_requests.updateMany({
      where: { id: pr.id, status: "draft" },
      data: { est_total: total, notes: catatan.trim() || null, updated_at: new Date() },
    }),
  ]);
  revalidatePath(`/belanja/${pr.id}`);
  revalidatePath("/belanja");
}

export async function ajukanPr(id: string): Promise<void> {
  const { sesi, pr } = await prIni(id);
  const jumlah = await prisma.purchase_request_items.count({ where: { pr_id: pr.id } });
  if (!jumlah) throw new Error("PR masih kosong.");
  await pindahStatus(pr.id, ["draft"], { status: "diajukan", submitted_by: BigInt(sesi.id), submitted_at: new Date() });
  kirimNanti(["finance"], pesanPrDiajukan(pr.pr_number, pr.id.toString(), pr.need_date.toISOString().slice(0, 10)));
}

/** Finance menyetujui + menetapkan dana yang ditransfer ke pembelanja (bawaan: perkiraan total). */
export async function setujuiPr(id: string, transfer: number): Promise<void> {
  const { sesi, pr } = await prIni(id, true);
  if (!Number.isFinite(transfer) || transfer < 0 || transfer > 10_000_000_000) throw new Error("Nominal transfer tidak sah.");
  await pindahStatus(pr.id, ["diajukan"], {
    status: "disetujui",
    transfer_amount: Math.round(transfer),
    approved_by: BigInt(sesi.id),
    approved_at: new Date(),
  });
  if (pr.created_by) kirimNanti([pr.created_by], pesanPrDiputus(pr.pr_number, pr.id.toString(), true));
}

/** Finance mengembalikan ke Draft dengan catatan (mis. "kurangi minyak, stok masih ada"). */
export async function kembalikanPr(id: string, catatan: string): Promise<void> {
  const { pr } = await prIni(id, true);
  if (!catatan.trim()) throw new Error("Tulis catatan untuk pembelanja.");
  await pindahStatus(pr.id, ["diajukan"], { status: "draft", finance_note: catatan.trim().slice(0, 2000) });
  if (pr.created_by) kirimNanti([pr.created_by], pesanPrDiputus(pr.pr_number, pr.id.toString(), false));
}

/** Batal: Draft/Diajukan oleh penyusun; yang sudah disetujui hanya Finance/owner (dananya mungkin sudah ditransfer). */
export async function batalkanPr(id: string): Promise<void> {
  const { sesi, pr } = await prIni(id);
  const dari = bolehKelolaUang(sesi.peran) ? ["draft", "diajukan", "disetujui"] : ["draft", "diajukan"];
  await pindahStatus(pr.id, dari, { status: "batal" });
}
