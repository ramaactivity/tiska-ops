"use server";

import { revalidatePath } from "next/cache";

import { kloterBast } from "@/lib/bast";
import { simpanBukti } from "@/lib/bukti-berkas";
import { pesanStatusKirim } from "@/lib/hitung/notifikasi";
import { nomorTiskaBerikutnya, simpanDenganKodeUnik } from "@/lib/nomor";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { wajibSesi } from "@/lib/rbac";
import { LABEL_STATUS_KIRIM, statusBerikutnya, waktuLapor, type StatusKirim } from "@/lib/tim";

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
  const t = await prisma.kloter_tracking.create({
    data: { kloter_id: id, status, by_user: BigInt(sesi.id), at: waktuLapor(bukti.jam), photo_path: jalur, ...lokasi },
    select: { at: true, event_kloters: { select: { no: true, events: { select: { id: true, name: true, created_by: true, quotations: { select: { created_by: true } } } } } } },
  });
  // Kabar ke admin + sales pemegang event (D-100), bukan ke yang menekan.
  const e = t.event_kloters.events;
  const sales = await prisma.users.findMany({
    where: { is_active: true, role: "sales", id: { in: [e.quotations.created_by, e.created_by].filter((x): x is bigint => x !== null) } },
    select: { id: true },
  });
  const admin = await prisma.users.findMany({ where: { is_active: true, role: "admin" }, select: { id: true } });
  kirimNanti(
    [...admin, ...sales].map((u) => u.id).filter((u) => u !== BigInt(sesi.id)),
    pesanStatusKirim({
      label: LABEL_STATUS_KIRIM[status as StatusKirim],
      jam: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(t.at),
      oleh: sesi.nama,
      event: e.name,
      kloter: t.event_kloters.no,
      idEvent: e.id.toString(),
      idKloter: id.toString(),
      foto: Boolean(jalur),
    }),
  );
  revalidatePath("/beranda");
}

/* ---------- BAST: tanda tangan penerima di HP tim (D-103) ---------- */

/**
 * Satu BAST per kloter; kiriman ulang dari antrian HP dianggap beres.
 * Barang yang diserahkan disalin saat itu (isi DO kloter, tanpa harga).
 */
export async function simpanBast(
  idKloter: string,
  isian: { penerima: string; kondisi: string; catatan: string; ttd: Blob | null; foto: Blob | null; jam?: number },
): Promise<void> {
  const { sesi, id } = await anggotaKloter(idKloter);
  const data = await kloterBast(id);
  if (!data) throw new Error("Kloter tidak ditemukan.");
  if (data.k.basts) return;
  const penerima = isian.penerima.trim().slice(0, 120);
  if (penerima.length < 2) throw new Error("Tulis nama penerima.");
  if (isian.kondisi !== "baik" && isian.kondisi !== "catatan") throw new Error("Pilih kondisi barang.");
  const catatan = isian.catatan.trim().slice(0, 500);
  if (isian.kondisi === "catatan" && catatan.length < 3) throw new Error("Tulis catatannya (mis. 2 box kurang).");
  if (!isian.ttd?.size || isian.ttd.size > 1_000_000 || isian.ttd.type !== "image/png") throw new Error("Tanda tangan penerima wajib.");
  if (isian.foto && (isian.foto.size > 4_000_000 || !isian.foto.type.startsWith("image/"))) throw new Error("Foto tidak sah.");
  const cap = Date.now();
  const ttd = `kloter/${id}/bast-ttd-${cap}.png`;
  await simpanBukti(ttd, isian.ttd);
  const foto = isian.foto?.size ? `kloter/${id}/bast-foto-${cap}.jpg` : null;
  if (foto) await simpanBukti(foto, isian.foto!);
  await simpanDenganKodeUnik(
    () => nomorTiskaBerikutnya("basts", "bast_number", "BAST"),
    (nomor) =>
      prisma.basts.create({
        data: {
          bast_number: nomor,
          event_id: data.k.event_id,
          kloter_id: id,
          receiver_name: penerima,
          condition: isian.kondisi,
          note: catatan || null,
          items: data.barang,
          signature_path: ttd,
          photo_path: foto,
          signed_at: waktuLapor(isian.jam),
          created_by: BigInt(sesi.id),
        },
      }),
  ).catch(async (e) => {
    // Dua HP tim yang sama mengirim bersamaan: kloter_id unik → yang kedua sudah beres.
    if (await prisma.basts.count({ where: { kloter_id: id } })) return;
    throw e;
  });
  revalidatePath("/beranda");
  revalidatePath(`/event/${data.k.event_id}`);
}
