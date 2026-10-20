"use server";

import { revalidatePath } from "next/cache";

import { simpanBukti } from "@/lib/bukti-berkas";
import { prisma } from "@/lib/prisma";
import { wajibSesi } from "@/lib/rbac";
import { statusBerikutnya, waktuLapor } from "@/lib/tim";

/**
 * "Siap 👍" (D-052): pemilik tugas mengonfirmasi tugasnya; captain kloter
 * yang sama boleh mengonfirmasi atas nama anggota (jaring pengaman 08-TIM §3.6).
 */
export async function konfirmasiTugas(idTugas: string, jam?: number): Promise<void> {
  const sesi = await wajibSesi();
  if (!/^\d+$/.test(idTugas)) throw new Error("Tugas tidak dikenal.");
  const t = await prisma.event_assignments.findUnique({ where: { id: BigInt(idTugas) }, select: { id: true, user_id: true, kloter_id: true, confirmed_at: true } });
  if (!t) throw new Error("Tugas tidak ditemukan.");
  const milikSendiri = t.user_id === BigInt(sesi.id);
  const captain =
    !milikSendiri &&
    (await prisma.event_assignments.count({ where: { kloter_id: t.kloter_id, user_id: BigInt(sesi.id), role: "captain" } })) > 0;
  if (!milikSendiri && !captain) throw new Error("Hanya pemilik tugas atau captain kloternya.");
  if (t.confirmed_at) return; // dikirim ulang dari antrian HP (D-099)
  await prisma.event_assignments.update({ where: { id: t.id }, data: { confirmed_at: waktuLapor(jam) } });
  revalidatePath("/beranda");
}

/* ---------- Status kirim & bukti foto (D-054) ---------- */

async function anggotaKloter(idKloter: string) {
  const sesi = await wajibSesi();
  if (!/^\d+$/.test(idKloter)) throw new Error("Kloter tidak dikenal.");
  const ada = await prisma.event_assignments.count({ where: { kloter_id: BigInt(idKloter), user_id: BigInt(sesi.id) } });
  if (!ada) throw new Error("Kamu tidak bertugas di kloter ini.");
  return { sesi, id: BigInt(idKloter) };
}

/**
 * Status kirim dari antrian HP (D-099): bisa terkirim terlambat (tanpa sinyal)
 * atau dua kali (balasan hilang) — yang sudah tercatat dianggap beres, jamnya
 * jam tombol ditekan. Foto diunggah server ke bucket tertutup.
 */
export async function catatStatusKloter(
  idKloter: string,
  status: string,
  bukti: { foto: Blob | null; lat: number | null; lng: number | null; jam?: number },
): Promise<void> {
  const { sesi, id } = await anggotaKloter(idKloter);
  const sudah = (await prisma.kloter_tracking.findMany({ where: { kloter_id: id }, select: { status: true } })).map((t) => t.status);
  if (sudah.includes(status)) return;
  if (statusBerikutnya(sudah) !== status) throw new Error("Urutannya: Berangkat → Sudah sampai → Selesai.");
  let jalur: string | null = null;
  if (status === "tiba") {
    if (!bukti.foto?.size) throw new Error("Foto bukti wajib untuk 'Sudah sampai'.");
    if (bukti.foto.size > 4_000_000 || !bukti.foto.type.startsWith("image/")) throw new Error("Foto tidak sah.");
    jalur = `kloter/${id}/tiba-${Date.now()}.jpg`;
    await simpanBukti(jalur, bukti.foto);
  }
  const lokasi =
    bukti.lat !== null && bukti.lng !== null && Math.abs(bukti.lat) <= 90 && Math.abs(bukti.lng) <= 180
      ? { lat: bukti.lat.toFixed(6), lng: bukti.lng.toFixed(6) }
      : {};
  await prisma.kloter_tracking.create({
    data: { kloter_id: id, status, by_user: BigInt(sesi.id), at: waktuLapor(bukti.jam), photo_path: jalur, ...lokasi },
  });
  revalidatePath("/beranda");
}
