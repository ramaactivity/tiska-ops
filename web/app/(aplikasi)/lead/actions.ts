"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { leadMiliknya } from "@/lib/lead-akses";
import { JENIS_AKTIVITAS, SUMBER_LEAD, TAHAP_LEAD } from "@/lib/lead";
import { kodePelangganBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

export type KeadaanLead = { pesan?: string; galat?: Record<string, string> };

// Isian kosong & isian yang tidak dikirim (undefined) sama-sama berarti null.
const kosong = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);
const tanggal = z.preprocess(kosong, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

const skema = z.object({
  id: z.preprocess(kosong, z.string().regex(/^\d+$/).nullable()),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(255),
  phone: z.preprocess(kosong, z.string().trim().max(50).nullable()),
  source: z.enum(Object.keys(SUMBER_LEAD) as [string, ...string[]]),
  event_type: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  event_date: tanggal,
  location: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  pax: z.preprocess(kosong, z.coerce.number().int().min(0).max(100_000).nullable()),
  service_form: z.preprocess(kosong, z.string().trim().max(40).nullable()),
  budget: z.preprocess(kosong, z.string().trim().max(255).nullable()),
  next_followup_at: tanggal,
  notes: z.preprocess(kosong, z.string().trim().max(5000).nullable()),
});

const tgl = (s: string | null) => (s ? new Date(`${s}T00:00:00Z`) : null);

async function leadSaya(id: string) {
  const sesi = await pastikanIzin("lead");
  if (!/^\d+$/.test(id)) throw new Error("Lead tidak dikenal.");
  const lead = await prisma.leads.findFirst({ where: { id: BigInt(id), ...leadMiliknya(sesi) } });
  if (!lead) throw new Error("Lead tidak ditemukan.");
  return { sesi, lead };
}

export async function simpanLead(_s: KeadaanLead, data: FormData): Promise<KeadaanLead> {
  const sesi = await pastikanIzin("lead");
  const hasil = skema.safeParse(Object.fromEntries(data));
  if (!hasil.success) {
    const galat: Record<string, string> = {};
    for (const i of hasil.error.issues) galat[String(i.path[0])] ??= i.message;
    // Galat pada isian tersembunyi tidak terlihat di form — jangan gagal diam-diam.
    const tersembunyi = ["id", "source", "service_form"].some((k) => galat[k]);
    return { galat, pesan: tersembunyi ? "Data formulir tidak terbaca. Muat ulang halaman lalu coba lagi." : undefined };
  }
  const { id, event_date, next_followup_at, ...isi } = hasil.data;
  const kolom = { ...isi, event_date: tgl(event_date), next_followup_at: tgl(next_followup_at), updated_at: new Date() };
  let idHasil: bigint;
  if (id) {
    const ada = await prisma.leads.findFirst({ where: { id: BigInt(id), ...leadMiliknya(sesi) }, select: { id: true } });
    if (!ada) return { pesan: "Lead tidak ditemukan." };
    await prisma.leads.update({ where: { id: ada.id }, data: kolom });
    idHasil = ada.id;
  } else {
    const baru = await prisma.leads.create({
      data: { ...kolom, stage: "tanya", owner_user_id: BigInt(sesi.id), created_by: BigInt(sesi.id) },
      select: { id: true },
    });
    idHasil = baru.id;
  }
  revalidatePath("/lead");
  redirect(`/lead/${idHasil}`);
}

/** Pindah tahap pipeline + catat di riwayat. Batal wajib beralasan. */
export async function ubahTahapLead(id: string, tahap: string, alasan = ""): Promise<void> {
  const { sesi, lead } = await leadSaya(id);
  if (!Object.hasOwn(TAHAP_LEAD, tahap)) throw new Error("Tahap tidak dikenal.");
  if (tahap === lead.stage) return;
  if (tahap === "batal" && !alasan.trim()) throw new Error("Tulis alasan batalnya.");
  await prisma.$transaction([
    prisma.leads.update({
      where: { id: lead.id },
      data: { stage: tahap, lost_reason: tahap === "batal" ? alasan.trim().slice(0, 255) : null, updated_at: new Date() },
    }),
    prisma.lead_activities.create({
      data: {
        lead_id: lead.id,
        kind: "tahap",
        body: `${TAHAP_LEAD[lead.stage as keyof typeof TAHAP_LEAD] ?? lead.stage} → ${TAHAP_LEAD[tahap as keyof typeof TAHAP_LEAD]}${tahap === "batal" ? ` (${alasan.trim()})` : ""}`,
        created_by: BigInt(sesi.id),
      },
    }),
  ]);
  revalidatePath("/lead");
  revalidatePath(`/lead/${id}`);
}

/** Catat kontak (chat/telepon/kirim PL/…) dan jadwalkan follow-up berikutnya. */
export async function catatAktivitasLead(id: string, isian: { jenis: string; isi: string; followup: string | null }): Promise<void> {
  const { sesi, lead } = await leadSaya(id);
  if (!Object.hasOwn(JENIS_AKTIVITAS, isian.jenis)) throw new Error("Pilih jenis aktivitas.");
  const isi = isian.isi.trim();
  if (!isi) throw new Error("Tulis ringkasannya.");
  if (isian.followup && !/^\d{4}-\d{2}-\d{2}$/.test(isian.followup)) throw new Error("Tanggal follow-up tidak terbaca.");
  await prisma.$transaction([
    prisma.lead_activities.create({ data: { lead_id: lead.id, kind: isian.jenis, body: isi.slice(0, 5000), created_by: BigInt(sesi.id) } }),
    prisma.leads.update({ where: { id: lead.id }, data: { next_followup_at: tgl(isian.followup), updated_at: new Date() } }),
  ]);
  revalidatePath("/lead");
  revalidatePath(`/lead/${id}`);
}

/** Lead → quotation: pastikan customer ada (dibuat dari data lead bila belum), lalu buka form quotation terisi. */
export async function buatQuotationDariLead(id: string): Promise<void> {
  const { sesi, lead } = await leadSaya(id);
  let idCustomer = lead.customer_id;
  if (!idCustomer) {
    const c = await simpanDenganKodeUnik(kodePelangganBerikutnya, (kode) =>
      prisma.customers.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          pic_name: lead.name,
          customer_code: kode,
          status: "active",
          created_by: BigInt(sesi.id),
          created_at: new Date(),
          updated_at: new Date(),
        },
        select: { id: true },
      }),
    );
    idCustomer = c.id;
    await prisma.leads.update({ where: { id: lead.id }, data: { customer_id: idCustomer } });
  }
  redirect(`/penawaran/baru?lead=${lead.id}`);
}
