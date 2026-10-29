"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { nasiPutih, namaProgram, slugProgram } from "@/lib/hitung/ikut-menu-pesta";
import { pesanProgramDiputus, pesanProgramDiusulkan } from "@/lib/hitung/notifikasi";
import { untungProgramSistem } from "@/lib/ikut-menu-pesta";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { bolehSetujuiProgram } from "@/lib/peran";
import { prisma } from "@/lib/prisma";
import { kirimNanti } from "@/lib/push";
import { pastikanIzin } from "@/lib/rbac";

/* Program Ikut Pesen Menu Pesta (D-115): usulan → cek HPP → disetujui / dikembalikan / ditolak. */

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal belum diisi.");
const SKEMA = z.object({
  idProgram: z.string().regex(/^\d+$/).nullish(),
  idEvent: z.string().regex(/^\d+$/),
  tanggalKirim: tanggal,
  batasTanggal: tanggal,
  batasJam: z.string().regex(/^\d{2}\.\d{2}$/, "Jam batas order belum diisi."),
  minPax: z.number().int().min(1, "Minimal order paling sedikit 1 pax."),
  maksPax: z.number().int().min(1).nullish(),
  area: z.string().trim().min(2, "Area kirim belum diisi.").max(100),
  kontak: z.string().trim().max(150).nullish(),
  catatan: z.string().trim().max(1000).nullish(),
  paket: z
    .array(
      z.object({
        judul: z.string().trim().min(1, "Judul paket belum diisi.").max(60),
        isi: z
          .array(z.object({ idMenu: z.string().regex(/^\d+$/).nullish(), nama: z.string().trim().min(1).max(255), dariAcara: z.boolean() }))
          .min(1, "Tiap paket minimal berisi satu menu."),
      }),
    )
    .min(1, "Susun minimal satu paket.")
    .max(4, "Paling banyak 4 paket."),
});
export type InputProgram = z.input<typeof SKEMA>;

type Hasil = { ok: true; id: string } | { ok: false; pesan: string };

export async function simpanProgram(input: InputProgram): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  const cek = SKEMA.safeParse(input);
  if (!cek.success) return { ok: false, pesan: cek.error.issues[0].message };
  const d = cek.data;
  const putih = d.paket.flatMap((p) => p.isi).find((i) => nasiPutih(i.nama));
  if (putih) return { ok: false, pesan: `"${putih.nama}" tidak dijual di paket retail (nasi putih tidak dimasukkan).` };
  const batas = new Date(`${d.batasTanggal}T${d.batasJam.replace(".", ":")}:00+07:00`);
  if (Number.isNaN(batas.getTime())) return { ok: false, pesan: "Jam batas order tidak dikenali." };
  if (d.batasTanggal > d.tanggalKirim) return { ok: false, pesan: "Batas order harus sebelum tanggal kirim." };
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  if (d.tanggalKirim < hariIni) return { ok: false, pesan: "Tanggal kirim sudah lewat — pilih tanggal mendatang." };
  if (batas.getTime() <= Date.now()) return { ok: false, pesan: "Batas order sudah lewat — pilih waktu mendatang." };

  const event = await prisma.events.findUnique({ where: { id: BigInt(d.idEvent) }, select: { status: true } });
  if (!event) return { ok: false, pesan: "Acara induk tidak ditemukan." };
  if (event.status === "batal") return { ok: false, pesan: "Acara induk sudah dibatalkan." };

  if (d.idProgram) {
    const lama = await prisma.retail_programs.findUnique({ where: { id: BigInt(d.idProgram) }, select: { status: true } });
    if (!lama) return { ok: false, pesan: "Program tidak ditemukan." };
    if (lama.status !== "diusulkan" && lama.status !== "dikembalikan") return { ok: false, pesan: "Program yang sudah diputuskan tidak bisa diubah lagi." };
  }

  const harga = (await bacaPengaturanBisnis()).ikut_menu_pesta.harga_per_pax;
  const data = {
    event_id: BigInt(d.idEvent),
    name: namaProgram(d.tanggalKirim),
    delivery_date: new Date(`${d.tanggalKirim}T00:00:00Z`),
    order_deadline: batas,
    price_per_pax: harga,
    min_pax: d.minPax,
    max_pax: d.maksPax ?? null,
    area: d.area,
    contact: d.kontak || null,
    notes: d.catatan || null,
    status: "diusulkan",
    proposed_at: new Date(),
    decided_by: null,
    decided_at: null,
    updated_at: new Date(),
  };
  const id = await prisma.$transaction(async (tx) => {
    const p = d.idProgram
      ? await tx.retail_programs.update({ where: { id: BigInt(d.idProgram) }, data })
      : await tx.retail_programs.create({ data: { ...data, proposed_by: BigInt(sesi.id) } });
    await tx.retail_program_sets.deleteMany({ where: { program_id: p.id } });
    for (const [i, paket] of d.paket.entries()) {
      await tx.retail_program_sets.create({
        data: {
          program_id: p.id,
          sort: i,
          title: paket.judul,
          retail_program_set_items: {
            create: paket.isi.map((x, j) => ({ sort: j, name: x.nama, menu_id: x.idMenu ? BigInt(x.idMenu) : null, from_event: x.dariAcara })),
          },
        },
      });
    }
    return p.id;
  });

  kirimNanti(["finance", "owner"], pesanProgramDiusulkan(data.name, id.toString()));
  revalidatePath("/ikut-menu-pesta");
  return { ok: true, id: id.toString() };
}

export async function putuskanProgram(idProgram: string, keputusan: "disetujui" | "dikembalikan" | "ditolak", catatan: string): Promise<Hasil> {
  const sesi = await pastikanIzin("ikut-menu-pesta");
  if (!bolehSetujuiProgram(sesi.peran)) return { ok: false, pesan: "Hanya Finance dan owner yang memutuskan program." };
  if (!/^\d+$/.test(idProgram) || !["disetujui", "dikembalikan", "ditolak"].includes(keputusan)) return { ok: false, pesan: "Permintaan tidak sah." };
  const alasan = catatan.trim();
  if (keputusan !== "disetujui" && alasan.length < 5) return { ok: false, pesan: "Tulis alasannya (minimal 5 huruf) supaya pengusul tahu apa yang harus diubah." };

  const id = BigInt(idProgram);
  const p = await prisma.retail_programs.findUnique({ where: { id }, select: { status: true, name: true, proposed_by: true, delivery_date: true, slug: true } });
  if (!p) return { ok: false, pesan: "Program tidak ditemukan." };
  if (p.status !== "diusulkan") return { ok: false, pesan: "Program ini sudah diputuskan." };

  const untung = keputusan === "disetujui" ? await untungProgramSistem(id) : null;
  await prisma.retail_programs.update({
    where: { id },
    data: {
      status: keputusan,
      decided_by: BigInt(sesi.id),
      decided_at: new Date(),
      decision_note: alasan || null,
      approved_margin_pct: untung?.terendahPct ?? null,
      // Link form pesan online (Tahap E, D-119) — tetap sama walau program diubah, supaya flyer yang sudah tersebar tidak mati.
      ...(keputusan === "disetujui" && !p.slug ? { slug: slugProgram(p.delivery_date.toISOString().slice(0, 10), randomUUID().slice(0, 4)) } : {}),
      updated_at: new Date(),
    },
  });
  if (p.proposed_by && p.proposed_by !== BigInt(sesi.id)) kirimNanti([p.proposed_by], pesanProgramDiputus(p.name, idProgram, keputusan));
  revalidatePath("/ikut-menu-pesta");
  return { ok: true, id: idProgram };
}
