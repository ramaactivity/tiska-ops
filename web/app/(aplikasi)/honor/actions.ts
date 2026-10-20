"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pastikanFotoBelanja } from "@/lib/bukti-berkas";
import { feeUsulan, PEKERJAAN_DW, rapikanJam, statusKerja } from "@/lib/hitung/honor";
import { PERAN_TUGAS } from "@/lib/hitung/penugasan";
import { bolehAbsenKloter } from "@/lib/honor-akses";
import { bolehKelolaUang } from "@/lib/peran";
import { pesanAbsenMasuk } from "@/lib/hitung/notifikasi";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { pastikanIzin } from "@/lib/rbac";

/* ==========================================================================
   HONOR TIM & DW (Fase 3.9a, D-091)

   Captain (HP) mencatat hadir + jam datang–pulang + DW → Kirim ke Finance.
   Finance mengunci fee (usulan dari tarif) → menandai sudah dibayar + bukti.
   Angka fee tidak pernah dikirim ke layar captain.
   ========================================================================== */

const id = z.string().regex(/^\d+$/);

function segarkan(kloterId?: bigint) {
  revalidatePath("/honor");
  revalidatePath("/beranda");
  if (kloterId) revalidatePath(`/beranda/absen/${kloterId}`);
}

async function pastikanKapten(kloterId: bigint) {
  const izin = await bolehAbsenKloter(kloterId);
  if (!izin) throw new Error("Hanya captain kloter ini yang mencatat absen.");
  return izin;
}

async function anggotaTerbuka(idAnggota: string) {
  const a = await prisma.event_assignments.findUnique({ where: { id: BigInt(id.parse(idAnggota)) }, select: { id: true, kloter_id: true, honor_status: true, user_id: true, role: true } });
  if (!a) throw new Error("Anggota tidak ditemukan.");
  await pastikanKapten(a.kloter_id);
  if (a.honor_status) throw new Error("Absen kloter ini sudah dikirim ke Finance.");
  return a;
}

export async function catatAbsen(idAnggota: string, isian: { hadir: boolean | null; datang: string; pulang: string }): Promise<void> {
  const a = await anggotaTerbuka(idAnggota);
  const datang = isian.datang.trim() ? rapikanJam(isian.datang) : null;
  const pulang = isian.pulang.trim() ? rapikanJam(isian.pulang) : null;
  if (isian.datang.trim() && !datang) throw new Error("Jam datang tidak terbaca, contoh 07.30.");
  if (isian.pulang.trim() && !pulang) throw new Error("Jam pulang tidak terbaca, contoh 15.00.");
  await prisma.event_assignments.update({
    where: { id: a.id },
    data: { attended: isian.hadir, arrive_time: isian.hadir === false ? null : datang, leave_time: isian.hadir === false ? null : pulang },
  });
  segarkan(a.kloter_id);
}

const skemaDw = z.object({
  nama: z.string().trim().min(2, "Nama DW minimal 2 huruf.").max(100),
  hp: z.string().trim().max(50),
  pekerjaan: z.enum(PEKERJAAN_DW),
});

/** DW tanpa akun: nama, HP, pekerjaan (waiter/clear-up/kitchen…). */
export async function tambahDw(idKloter: string, isian: z.input<typeof skemaDw>): Promise<void> {
  const k = BigInt(id.parse(idKloter));
  await pastikanKapten(k);
  const f = skemaDw.parse(isian);
  const terkirim = await prisma.event_assignments.count({ where: { kloter_id: k, honor_status: { not: null } } });
  if (terkirim) throw new Error("Absen kloter ini sudah dikirim ke Finance.");
  const urut = await prisma.event_assignments.count({ where: { kloter_id: k } });
  await prisma.event_assignments.create({
    data: { kloter_id: k, person_name: f.nama, contact_phone: f.hp || null, role: "dw", task_note: f.pekerjaan, attended: true, sort: urut },
  });
  segarkan(k);
}

export async function hapusDw(idAnggota: string): Promise<void> {
  const a = await anggotaTerbuka(idAnggota);
  if (a.user_id || a.role !== "dw") throw new Error("Hanya DW tambahan captain yang bisa dihapus di sini.");
  await prisma.event_assignments.delete({ where: { id: a.id } });
  segarkan(a.kloter_id);
}

/** Semua anggota harus sudah ditandai hadir/tidak; fee usulan dari tarif disimpan (bisa dikoreksi Finance). */
export async function kirimAbsenKeFinance(idKloter: string): Promise<void> {
  const k = BigInt(id.parse(idKloter));
  const { sesiId } = await pastikanKapten(k);
  const [anggota, tarif] = await Promise.all([
    prisma.event_assignments.findMany({ where: { kloter_id: k }, include: { users: { select: { employment_type: true } } } }),
    prisma.honor_rates.findMany(),
  ]);
  if (!anggota.length) throw new Error("Kloter ini belum punya anggota.");
  const belum = anggota.filter((a) => a.attended === null);
  if (belum.length) throw new Error(`Tandai hadir/tidak dulu: ${belum.map((a) => a.person_name ?? "anggota").slice(0, 4).join(", ")}${belum.length > 4 ? "…" : ""}`);
  if (anggota.some((a) => a.honor_status)) throw new Error("Absen kloter ini sudah dikirim.");
  await prisma.$transaction(
    anggota.map((a) =>
      prisma.event_assignments.update({
        where: { id: a.id },
        data: {
          honor_status: "diajukan",
          submitted_by: BigInt(sesiId),
          submitted_at: new Date(),
          fee: a.fee ?? feeUsulan(tarif, a.role, statusKerja(Boolean(a.user_id), a.users?.employment_type ?? null), a.attended),
        },
      }),
    ),
  );
  const kl = await prisma.event_kloters.findUnique({ where: { id: k }, select: { no: true, events: { select: { name: true } } } });
  if (kl) kirimNanti(["finance"], pesanAbsenMasuk(kl.events.name, kl.no));
  segarkan(k);
}

/* ---------- Finance ---------- */

async function pastikanFinance() {
  const sesi = await pastikanIzin("honor");
  if (!bolehKelolaUang(sesi.peran)) throw new Error("Hanya Finance atau owner yang mengurus honor.");
  return sesi;
}

const peranTugas = z.enum(Object.keys(PERAN_TUGAS) as [string, ...string[]]);

export async function simpanTarif(baris: { peran: string; status: "tetap" | "freelance"; jumlah: number | null }[]): Promise<void> {
  const sesi = await pastikanFinance();
  const f = z.array(z.object({ peran: peranTugas, status: z.enum(["tetap", "freelance"]), jumlah: z.number().min(0).max(100_000_000).nullable() })).max(40).parse(baris);
  await prisma.$transaction(
    f.map((b) =>
      b.jumlah === null
        ? prisma.honor_rates.deleteMany({ where: { role: b.peran, employment: b.status } })
        : prisma.honor_rates.upsert({
            where: { role_employment: { role: b.peran, employment: b.status } },
            create: { role: b.peran, employment: b.status, amount: b.jumlah, updated_by: BigInt(sesi.id) },
            update: { amount: b.jumlah, updated_by: BigInt(sesi.id), updated_at: new Date() },
          }),
    ),
  );
  segarkan();
}

export async function aturStatusKerja(idUser: string, status: "tetap" | "freelance"): Promise<void> {
  await pastikanFinance();
  await prisma.users.update({ where: { id: BigInt(id.parse(idUser)) }, data: { employment_type: z.enum(["tetap", "freelance"]).parse(status) } });
  segarkan();
}

/** Kunci fee satu kloter (angka akhir). Semua anggota wajib punya fee (0 boleh). */
export async function kunciHonor(idKloter: string, fee: { id: string; fee: number; catatan: string }[]): Promise<void> {
  const sesi = await pastikanFinance();
  const k = BigInt(id.parse(idKloter));
  const f = z.array(z.object({ id, fee: z.number().min(0).max(100_000_000), catatan: z.string().trim().max(255) })).parse(fee);
  const anggota = await prisma.event_assignments.findMany({ where: { kloter_id: k, honor_status: "diajukan" }, select: { id: true } });
  if (!anggota.length) throw new Error("Tidak ada absen yang menunggu di kloter ini.");
  const peta = new Map(f.map((x) => [x.id, x]));
  if (anggota.some((a) => !peta.has(a.id.toString()))) throw new Error("Isi fee semua anggota (0 bila tidak dibayar).");
  await prisma.$transaction(
    anggota.map((a) => {
      const x = peta.get(a.id.toString())!;
      return prisma.event_assignments.update({
        where: { id: a.id },
        data: { fee: x.fee, fee_note: x.catatan || null, honor_status: "dikunci", locked_by: BigInt(sesi.id), locked_at: new Date() },
      });
    }),
  );
  segarkan(k);
}

/** Kembalikan ke captain (salah absen) — sebelum dikunci. */
export async function kembalikanAbsen(idKloter: string): Promise<void> {
  await pastikanFinance();
  const k = BigInt(id.parse(idKloter));
  const { count } = await prisma.event_assignments.updateMany({ where: { kloter_id: k, honor_status: "diajukan" }, data: { honor_status: null, submitted_at: null, submitted_by: null } });
  if (!count) throw new Error("Tidak ada absen yang menunggu di kloter ini.");
  segarkan(k);
}

export async function tandaiDibayar(ids: string[], tanggal: string, bukti: string | null): Promise<void> {
  const sesi = await pastikanFinance();
  const daftar = z.array(id).min(1).max(200).parse(ids).map((x) => BigInt(x));
  const t = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(tanggal);
  if (bukti) await pastikanFotoBelanja([bukti]);
  const { count } = await prisma.event_assignments.updateMany({
    where: { id: { in: daftar }, honor_status: "dikunci" },
    data: { honor_status: "dibayar", paid_by: BigInt(sesi.id), paid_at: new Date(`${t}T00:00:00Z`), proof_path: bukti },
  });
  if (!count) throw new Error("Tidak ada honor yang bisa ditandai dibayar.");
  segarkan();
}
