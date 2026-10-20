"use server";

import { z } from "zod";

import { kirimPush } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";

/* Langganan push per HP (D-096). Semua akun yang masuk boleh mengaktifkan untuk dirinya sendiri. */

const skema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(10).max(255), auth: z.string().min(4).max(255) }),
});

export async function simpanLangganan(langganan: unknown, perangkat: string): Promise<void> {
  const sesi = await wajibSesi();
  const l = skema.parse(langganan);
  await prisma.push_subscriptions.upsert({
    where: { endpoint: l.endpoint },
    // HP yang sama dipakai akun lain → langganan pindah ke akun yang sedang masuk.
    create: { user_id: BigInt(sesi.id), endpoint: l.endpoint, p256dh: l.keys.p256dh, auth: l.keys.auth, user_agent: perangkat.slice(0, 255) },
    update: { user_id: BigInt(sesi.id), p256dh: l.keys.p256dh, auth: l.keys.auth, user_agent: perangkat.slice(0, 255) },
  });
}

export async function hapusLangganan(endpoint: string): Promise<void> {
  const sesi = await wajibSesi();
  await prisma.push_subscriptions.deleteMany({ where: { endpoint, user_id: BigInt(sesi.id) } });
}

export async function kirimUji(): Promise<{ terkirim: number; gagal: number }> {
  const sesi = await wajibSesi();
  return kirimPush([BigInt(sesi.id)], { judul: "Notifikasi aktif ✅", isi: "Tiska Ops akan mengabari jadwal & tugas lewat HP ini.", url: "/notifikasi", tag: "uji" });
}
