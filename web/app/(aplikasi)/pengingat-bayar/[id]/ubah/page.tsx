import { BellRing, ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { namaAcara, opsiAcara } from "@/lib/aset";
import { opsiPic } from "@/lib/pengingat-bayar";
import { prisma } from "@/lib/prisma";
import { wajibIzin } from "@/lib/rbac";

import { FormTagihan, type IsiTagihan } from "../../form-tagihan";

export const metadata: Metadata = { title: "Ubah tagihan" };
export const dynamic = "force-dynamic";

export default async function HalamanUbahTagihan({ params }: PageProps<"/pengingat-bayar/[id]/ubah">) {
  await wajibIzin("pengingat-bayar");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const b = await prisma.bills.findUnique({
    where: { id: BigInt(id) },
    include: { users_bills_pic_user_idTousers: { select: { id: true, name: true } }, events: { select: { id: true, name: true, first_date: true, customers: { select: { name: true } } } } },
  });
  if (!b) notFound();
  const [pic, acara] = await Promise.all([opsiPic(), opsiAcara()]);
  const awal: IsiTagihan = {
    id,
    nama: b.name,
    kategori: b.category as IsiTagihan["kategori"],
    nominal: b.amount === null ? "" : String(Math.round(Number(b.amount))),
    ulangi: String(b.repeat_months ?? 0) as IsiTagihan["ulangi"],
    jatuhTempo: b.next_due.toISOString().slice(0, 10),
    ingatkan: b.remind_days,
    kodeBayar: b.pay_code ?? "",
    tujuanBayar: b.pay_to ?? "",
    catatan: b.note ?? "",
    foto: b.photo_paths,
    pic: b.users_bills_pic_user_idTousers ? { id: b.users_bills_pic_user_idTousers.id.toString(), label: b.users_bills_pic_user_idTousers.name } : null,
    acara: b.events ? { id: b.events.id.toString(), label: namaAcara(b.events) } : null,
  };
  return (
    <Halaman>
      <Link href={`/pengingat-bayar/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> {b.name}
      </Link>
      <KepalaHalaman ikon={BellRing} judul="Ubah tagihan" keterangan="Mengubah jatuh tempo di sini menggeser periode yang belum dibayar." />
      <FormTagihan awal={awal} opsiPic={pic} opsiAcara={acara} />
    </Halaman>
  );
}
