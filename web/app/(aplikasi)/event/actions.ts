"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { eventMiliknya } from "@/lib/event-akses";
import { barisEvent, isiPesananEvent, itemDariDb } from "@/lib/event";
import { batasKunci, CARA_LAYANAN, caraLayananBawaan, ringkasPerubahan, STATUS_EVENT } from "@/lib/hitung/event";
import { aksesPenuh, bolehUbahEvent } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { hanyaMiliknya, pastikanIzin } from "@/lib/rbac";

async function bolehUbah() {
  const sesi = await pastikanIzin("event");
  if (!bolehUbahEvent(sesi.peran)) throw new Error("Peran ini hanya bisa membaca event.");
  return sesi;
}

async function eventSaya(id: string) {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(id)) throw new Error("Event tidak dikenal.");
  const e = await prisma.events.findFirst({ where: { id: BigInt(id), ...eventMiliknya(sesi) } });
  if (!e) throw new Error("Event tidak ditemukan.");
  return { sesi, e };
}

/** Quotation disetujui → event (salinan isi pesanan tanpa harga + batas kunci). */
export async function buatEvent(idQuotation: string): Promise<void> {
  const sesi = await bolehUbah();
  if (!/^\d+$/.test(idQuotation)) throw new Error("Quotation tidak dikenal.");
  const q = await prisma.quotations.findFirst({
    where: { id: BigInt(idQuotation), ...hanyaMiliknya(sesi) },
    select: { id: true, status: true, events: { select: { id: true } } },
  });
  if (!q) throw new Error("Quotation tidak ditemukan.");
  if (q.events) redirect(`/event/${q.events.id}`);
  if (q.status !== "approved") throw new Error("Event dibuat dari quotation yang sudah disetujui customer.");

  const isi = await isiPesananEvent(q.id);
  const id = await prisma.$transaction(async (tx) => {
    const e = await tx.events.create({
      data: {
        quotation_id: q.id,
        invoice_id: isi.invoiceId,
        customer_id: isi.q.customer_id,
        name: isi.q.event_type?.trim() || "Event",
        service_mode: caraLayananBawaan(isi.adaBuffet),
        first_date: isi.pertama ? new Date(`${isi.pertama}T00:00:00Z`) : null,
        venue: isi.q.venue,
        pic_name: isi.q.contact_person,
        pic_phone: isi.q.contact_phone,
        eo_name: isi.q.fnb_planner,
        guest_count: isi.q.guest_count,
        lock_at: batasKunci(isi.pertama, isi.adaBuffet),
        created_by: BigInt(sesi.id),
      },
      select: { id: true },
    });
    await tx.event_items.createMany({ data: barisEvent(e.id, isi.items) });
    return e.id;
  });
  revalidatePath("/event");
  redirect(`/event/${id}`);
}

/** Ambil ulang isi pesanan dari invoice/quotation → "UPDATE ke-n". Sesudah batas kunci hanya owner. */
export async function perbaruiEvent(id: string): Promise<{ pesan: string }> {
  const { sesi, e } = await eventSaya(id);
  const isi = await isiPesananEvent(e.quotation_id);
  const lama = itemDariDb(await prisma.event_items.findMany({ where: { event_id: e.id }, orderBy: { sort: "asc" } }));
  const ringkas = ringkasPerubahan(lama, isi.items);
  if (!ringkas.length) return { pesan: "Isi pesanan sama dengan event — tidak ada yang diperbarui." };
  const lewat = Boolean(e.lock_at && e.lock_at < new Date());
  if (lewat && !aksesPenuh(sesi.peran)) throw new Error("Sudah lewat batas perubahan — minta owner yang memperbarui.");
  const ke = e.change_count + 1;
  await prisma.$transaction([
    prisma.event_items.deleteMany({ where: { event_id: e.id } }),
    prisma.event_items.createMany({ data: barisEvent(e.id, isi.items) }),
    prisma.events.update({
      where: { id: e.id },
      data: {
        change_count: ke,
        invoice_id: isi.invoiceId,
        first_date: isi.pertama ? new Date(`${isi.pertama}T00:00:00Z`) : null,
        lock_at: batasKunci(isi.pertama, isi.adaBuffet),
        updated_at: new Date(),
      },
    }),
    prisma.event_changes.create({
      data: { event_id: e.id, change_no: ke, summary: ringkas.join("\n"), after_lock: lewat, created_by: BigInt(sesi.id) },
    }),
  ]);
  revalidatePath(`/event/${id}`);
  return { pesan: `UPDATE ke-${ke} tercatat (${ringkas.length} perubahan).` };
}

export async function ubahStatusEvent(id: string, status: string): Promise<void> {
  const { e } = await eventSaya(id);
  if (!Object.hasOwn(STATUS_EVENT, status)) throw new Error("Status tidak dikenal.");
  await prisma.events.update({ where: { id: e.id }, data: { status, updated_at: new Date() } });
  revalidatePath("/event");
  revalidatePath(`/event/${id}`);
}

const kosong = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const teks = (max: number) => z.preprocess(kosong, z.string().trim().max(max).nullable());
const skemaInfo = z.object({
  id: z.string().regex(/^\d+$/),
  service_mode: z.enum(Object.keys(CARA_LAYANAN) as [string, ...string[]]),
  venue: teks(255),
  address: teks(2000),
  maps_url: z.preprocess(kosong, z.string().trim().url("Link Maps tidak sah.").max(500).nullable()),
  pic_name: teks(255),
  pic_phone: teks(50),
  eo_name: teks(255),
  guest_count: z.preprocess(kosong, z.coerce.number().int().min(0).max(100_000).nullable()),
  notes: teks(5000),
});

export async function simpanInfoEvent(_s: { pesan?: string; sukses?: boolean }, data: FormData): Promise<{ pesan?: string; sukses?: boolean }> {
  const hasil = skemaInfo.safeParse(Object.fromEntries(data));
  if (!hasil.success) return { pesan: hasil.error.issues[0]?.message ?? "Isian tidak sah." };
  const { id, ...isi } = hasil.data;
  const { e } = await eventSaya(id);
  await prisma.events.update({ where: { id: e.id }, data: { ...isi, updated_at: new Date() } });
  revalidatePath(`/event/${id}`);
  return { sukses: true, pesan: "Info event tersimpan." };
}
