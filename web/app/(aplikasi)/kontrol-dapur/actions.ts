"use server";

import { z } from "zod";

import type { ModeTayang, Perintah } from "@/lib/kontrol-dapur";
import { prisma } from "@/lib/prisma";
import { pastikanIzin } from "@/lib/rbac";

/* Kontrol Dapur MVP (docs/23 §6 P1). Semua aksi lewat izin "kontrol-dapur" (owner/admin otomatis, kepala dapur). */

const pengguna = async () => BigInt((await pastikanIzin("kontrol-dapur")).id);

/** Keadaan terkini untuk halaman Kontrol (dibaca ulang beberapa detik sekali). */
export async function bacaKontrol() {
  await pengguna();
  const [k, layar, pengumuman] = await Promise.all([
    prisma.kitchen_controls.findUnique({ where: { id: 1 } }),
    prisma.kitchen_screens.findMany({ orderBy: { created_at: "asc" } }),
    prisma.kitchen_announcements.findMany({ orderBy: { id: "desc" }, take: 8 }),
  ]);
  const pengirim = await prisma.users.findMany({
    where: {
      id: {
        in: [
          ...new Set(
            pengumuman.flatMap((p) => (p.created_by ? [p.created_by] : [])),
          ),
        ],
      },
    },
    select: { id: true, name: true },
  });
  const namaPengirim = new Map(pengirim.map((u) => [u.id.toString(), u.name]));
  return {
    sekarang: new Date().toISOString(),
    mode: (k?.mode === "tahan" ? "tahan" : "otomatis") as ModeTayang,
    running: { teks: k?.running_text ?? "", aktif: k?.running_active ?? false },
    layar: layar.map((l) => ({
      id: l.id,
      nama: l.name,
      terakhir: l.last_seen.toISOString(),
      suara: l.sound,
      penuh: l.fullscreen,
      ukuran: l.size,
      tayang: l.showing,
      dapur: l.kitchen,
    })),
    pengumuman: pengumuman.map((p) => ({
      id: p.id.toString(),
      teks: p.text,
      dibuat: p.created_at.toISOString(),
      oleh: p.created_by
        ? (namaPengirim.get(p.created_by.toString()) ?? null)
        : null,
      dibacakan: p.read_at?.toISOString() ?? null,
    })),
  };
}

/** Next / Prev / Ulangi pengumuman terakhir — dijalankan sekali oleh tiap layar (nomor urut perintah naik). */
export async function kirimPerintah(perintah: Perintah) {
  const oleh = await pengguna();
  if (!["next", "prev", "ulang"].includes(perintah))
    throw new Error("Perintah tidak dikenal.");
  await prisma.kitchen_controls.update({
    where: { id: 1 },
    data: {
      command: perintah,
      command_seq: { increment: 1 },
      updated_by: oleh,
      updated_at: new Date(),
    },
  });
}

/** Otomatis = halaman berganti sendiri; Tahan = tetap di halaman yang sedang tayang sampai diganti dari sini. */
export async function aturMode(mode: ModeTayang) {
  const oleh = await pengguna();
  if (mode !== "otomatis" && mode !== "tahan")
    throw new Error("Mode tidak dikenal.");
  await prisma.kitchen_controls.update({
    where: { id: 1 },
    data: { mode, updated_by: oleh, updated_at: new Date() },
  });
}

const Teks = z
  .string()
  .trim()
  .min(1, "Tulis pengumumannya dulu.")
  .max(300, "Pengumuman maksimal 300 huruf supaya terbaca dari jauh.");

export async function umumkan(teks: string) {
  const oleh = await pengguna();
  const t = Teks.parse(teks);
  await prisma.kitchen_announcements.create({
    data: { text: t, created_by: oleh },
  });
}

export async function aturRunning(teks: string, aktif: boolean) {
  const oleh = await pengguna();
  const t = z
    .string()
    .trim()
    .max(500, "Running text maksimal 500 huruf.")
    .parse(teks);
  if (aktif && !t) throw new Error("Isi running text dulu sebelum dinyalakan.");
  await prisma.kitchen_controls.update({
    where: { id: 1 },
    data: {
      running_text: t || null,
      running_active: aktif,
      updated_by: oleh,
      updated_at: new Date(),
    },
  });
}

export async function namaiLayar(id: string, nama: string) {
  await pengguna();
  const n = z.string().trim().max(100).parse(nama);
  await prisma.kitchen_screens.update({
    where: { id },
    data: { name: n || null },
  });
}
