import { penggunaAktif } from "@/lib/auth";
import { alatTersedia, rekapAlatEvent } from "@/lib/hitung/peralatan";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka } from "@/lib/navigasi";
import { prisma } from "@/lib/prisma";
import { rupiah } from "@/lib/uang";

import { AlatEvent } from "./alat-event";

/**
 * Peralatan per event (D-089): milik sendiri / sewaan vendor, keluar → kembali.
 * Hanya untuk yang punya izin Peralatan — halaman event lain tidak berubah.
 */
export async function PeralatanEvent({ idEvent, tanggal }: { idEvent: bigint; tanggal: Date | null }) {
  const sesi = await penggunaAktif();
  if (!sesi || !bolehBuka(sesi.peran, "peralatan", await bacaIzin())) return null;

  const [baris, alat, lain, vendor] = await Promise.all([
    prisma.event_equipment.findMany({ where: { event_id: idEvent }, orderBy: { id: "asc" }, include: { equipment: { select: { unit: true, replacement_price: true } } } }),
    prisma.equipment.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    // Dipakai event lain di tanggal yang sama (belum kembali) → peringatan kurang.
    tanggal
      ? prisma.event_equipment.groupBy({
          by: ["equipment_id"],
          where: { event_id: { not: idEvent }, equipment_id: { not: null }, status: { in: ["rencana", "keluar"] }, events: { first_date: tanggal } },
          _sum: { qty: true },
        })
      : [],
    prisma.suppliers.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { name: true, category: true } }),
  ]);
  const dipakaiLain = new Map(lain.map((g) => [g.equipment_id!.toString(), g._sum.qty ?? 0]));
  const rekap = rekapAlatEvent(
    baris.map((b) => ({
      milikSendiri: Boolean(b.equipment_id),
      qty: b.qty,
      rusak: b.qty_damaged,
      hilang: b.qty_lost,
      biayaSewa: b.rental_cost,
      hargaGanti: b.equipment?.replacement_price ?? null,
    })),
  );
  const tersedia = new Map(alat.map((a) => [a.id.toString(), alatTersedia(a.owned_qty, a.damaged_qty, dipakaiLain.get(a.id.toString()) ?? 0)]));

  return (
    <section className="rounded-[14px] border bg-card p-5">
      <h2 className="eyebrow pb-1">Peralatan</h2>
      <p className="pb-3 text-sm text-muted-foreground">
        {rekap.milik} alat milik sendiri · {rekap.sewaan} sewaan vendor
        {rekap.biayaSewa.gt(0) ? ` · biaya sewa ${rupiah(rekap.biayaSewa)}` : ""}
        {rekap.gantiRugi.gt(0) ? ` · ganti rugi ke klien ${rupiah(rekap.gantiRugi)}` : ""}
        {rekap.gantiTanpaHarga ? ` · ${rekap.gantiTanpaHarga} alat rusak/hilang belum ada harga gantinya` : ""}
      </p>
      <AlatEvent
        idEvent={idEvent.toString()}
        vendorSewa={[...vendor.filter((v) => v.category === "sewa_alat"), ...vendor.filter((v) => v.category !== "sewa_alat")].map((v) => v.name)}
        pilihan={alat.map((a) => {
          const t = tersedia.get(a.id.toString());
          return { id: a.id.toString(), label: a.name, sub: t === null ? "belum dihitung" : `tersedia ${t} ${a.unit}`, tersedia: t ?? null, satuan: a.unit };
        })}
        baris={baris.map((b) => ({
          id: b.id.toString(),
          nama: b.item_name,
          vendor: b.vendor_name,
          qty: b.qty,
          satuan: b.equipment?.unit ?? "pc",
          biayaSewa: b.rental_cost ? Number(b.rental_cost) : null,
          status: b.status,
          baik: b.qty_back,
          rusak: b.qty_damaged,
          hilang: b.qty_lost,
          catatan: b.note,
          kurang: b.equipment_id && b.status === "rencana" ? (() => {
            const t = tersedia.get(b.equipment_id!.toString());
            return t !== null && t !== undefined && b.qty > t ? t : null;
          })() : null,
        }))}
      />
    </section>
  );
}
