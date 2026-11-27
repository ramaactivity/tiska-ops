"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { eventMiliknya } from "@/lib/event-akses";
import { bolehUbahEvent } from "@/lib/peran";
import { Persiapan, pertahankanTercapai } from "@/lib/persiapan";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Persiapan acara besar H-n (docs/25 #5). Jadwal: peran yang boleh mengubah event. Progres: juga kepala dapur. */

async function eventIni(idEvent: string, progres = false) {
  const sesi = await pastikanIzin("event");
  if (!bolehUbahEvent(sesi.peran) && !(progres && sesi.peran === "kepala_dapur")) throw new Error("Peran ini hanya bisa membaca persiapan acara.");
  if (!/^\d+$/.test(idEvent)) throw new Error("Event tidak dikenal.");
  const e = await prisma.events.findFirst({ where: { id: BigInt(idEvent), ...eventMiliknya(sesi) }, select: { id: true } });
  if (!e) throw new Error("Event tidak ditemukan.");
  return { sesi, id: e.id };
}

/** Simpan target & agenda (ditimpa utuh) — angka tercapai tetap dari database. Kosong = baris dihapus. */
export async function simpanPersiapan(idEvent: string, isi: Persiapan): Promise<void> {
  const { sesi, id } = await eventIni(idEvent);
  const r = Persiapan.safeParse(isi);
  if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Isi persiapan tidak sah.");
  for (const a of r.data.agenda) if (a.sampai < a.dari) throw new Error(`Agenda "${a.judul}": tanggal selesai sebelum tanggal mulai.`);
  if (!r.data.target.length && !r.data.agenda.length) {
    await prisma.event_preps.deleteMany({ where: { event_id: id } });
  } else {
    await prisma.$transaction(async (tx) => {
      const [kunci] = await tx.$queryRaw<{ data: unknown }[]>`SELECT data FROM event_preps WHERE event_id = ${id} FOR UPDATE`;
      const lama = kunci ? Persiapan.safeParse(kunci.data) : null;
      const data = pertahankanTercapai(r.data, lama?.success ? lama.data : null);
      await tx.event_preps.upsert({
        where: { event_id: id },
        create: { event_id: id, data, updated_by: BigInt(sesi.id) },
        update: { data, updated_by: BigInt(sesi.id), updated_at: new Date() },
      });
    });
  }
  revalidatePath(`/event/${id}`);
}

/** Tombol progres (+50, +100, atau koreksi negatif): dikunci per baris supaya dua orang yang menekan bersamaan tidak saling menimpa. */
export async function tambahTercapai(idEvent: string, judul: string, tanggal: string, tambah: number): Promise<number> {
  const { sesi, id } = await eventIni(idEvent, true);
  const t = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(tanggal);
  const n = z.number().int().min(-100_000).max(100_000).parse(tambah);
  const hasil = await prisma.$transaction(async (tx) => {
    const [baris] = await tx.$queryRaw<{ data: unknown }[]>`SELECT data FROM event_preps WHERE event_id = ${id} FOR UPDATE`;
    const p = baris ? Persiapan.safeParse(baris.data) : null;
    if (!p?.success) throw new Error("Persiapan acara ini belum disimpan.");
    const h = p.data.target.find((x) => x.judul === judul)?.harian.find((x) => x.tanggal === t);
    if (!h) throw new Error("Target hari itu tidak ditemukan — muat ulang halaman.");
    h.tercapai = Math.max(0, h.tercapai + n);
    await tx.event_preps.update({ where: { event_id: id }, data: { data: p.data, updated_by: BigInt(sesi.id), updated_at: new Date() } });
    return h.tercapai;
  });
  revalidatePath(`/event/${id}`);
  return hasil;
}
