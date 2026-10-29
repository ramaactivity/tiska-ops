"use server";

import { z } from "zod";

import { rapikanHp } from "@/lib/hitung/ikut-menu-pesta";
import type { PesanPush } from "@/lib/hitung/notifikasi";
import { catatPesanan } from "@/lib/ikut-menu-pesta";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";

/* Form pesan online Ikut Menu Pesta (Tahap E, D-119) — TANPA login: semua isian dianggap tidak tepercaya. */

const SKEMA = z.object({
  nama: z.string().trim().min(2, "Nama penerima belum diisi.").max(150),
  hp: z
    .string()
    .trim()
    .max(30)
    .refine((h) => /^08\d{7,12}$/.test(rapikanHp(h)), "Nomor WhatsApp belum benar (contoh 0812xxxxxxx)."),
  alamat: z.string().trim().min(10, "Alamat kirim belum lengkap.").max(500),
  maps: z.string().trim().max(500).nullish(),
  jam: z.string().trim().max(20).nullish(),
  catatan: z.string().trim().max(500).nullish(),
  bayar: z.enum(["transfer", "cod"]),
  luarArea: z.boolean(),
  paket: z.array(z.object({ idSet: z.string().regex(/^\d+$/), pax: z.number().int().min(0).max(300) })).min(1).max(10),
  /** Jebakan robot: kolom tersembunyi yang selalu kosong bila diisi manusia. */
  situs: z.string().max(0).optional(),
});
export type InputPesanOnline = z.input<typeof SKEMA>;

const MAKS_PER_NOMOR_PER_JAM = 3;
const MAKS_SEMUA_PER_10_MENIT = 30;

export async function pesanOnline(slug: string, input: InputPesanOnline): Promise<{ ok: true; token: string } | { ok: false; pesan: string }> {
  const cek = SKEMA.safeParse(input);
  if (!cek.success) return { ok: false, pesan: cek.error.issues[0].message };
  const d = cek.data;

  const p = await prisma.retail_programs.findUnique({ where: { slug }, select: { id: true, name: true, status: true, order_deadline: true } });
  if (!p || p.status !== "disetujui") return { ok: false, pesan: "Program ini sudah tidak menerima pesanan." };
  if (Date.now() > p.order_deadline.getTime()) return { ok: false, pesan: "Batas order sudah lewat. Silakan hubungi admin lewat WhatsApp." };

  // Anti-spam: per nomor & total semua form — pesanan lewat admin tidak dibatasi.
  const [{ nomor, semua }] = await prisma.$queryRawUnsafe<{ nomor: number; semua: number }[]>(
    `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 hour'
              AND regexp_replace(regexp_replace(phone, '\\D', '', 'g'), '^62', '0') = $1)::int AS nomor,
            count(*) FILTER (WHERE created_at > now() - interval '10 minutes')::int AS semua
       FROM retail_orders WHERE source = 'online'`,
    rapikanHp(d.hp),
  );
  if (nomor >= MAKS_PER_NOMOR_PER_JAM) return { ok: false, pesan: "Nomor ini sudah mengirim beberapa pesanan barusan. Untuk tambahan, silakan chat admin." };
  if (semua >= MAKS_SEMUA_PER_10_MENIT) return { ok: false, pesan: "Form sedang ramai. Coba lagi beberapa menit lagi, atau chat admin." };

  const r = await catatPesanan({ ...d, idProgram: p.id.toString(), asal: "online", ongkir: 0 }, null);
  if (!r.ok) return r;

  const pesan: PesanPush = {
    judul: d.luarArea ? "Pesanan online (luar area) perlu dikonfirmasi" : "Pesanan online baru perlu dikonfirmasi",
    isi: `${d.nama} — ${p.name}`,
    url: `/ikut-menu-pesta/${p.id}`,
    tag: `online-${r.id}`,
  };
  kirimNanti(["admin", "sales"], pesan);
  if (d.luarArea) kirimNanti(["owner"], { ...pesan, judul: "Pesanan luar Bogor perlu persetujuan", tag: `area-${r.id}` });
  return { ok: true, token: r.token };
}
