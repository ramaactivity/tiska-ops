import type { Metadata } from "next";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { notFound } from "next/navigation";

import { KwitansiMeterai } from "@/app/(aplikasi)/pembayaran/[id]/kwitansi-meterai";
import { KwitansiBlanko } from "@/components/kwitansi-blanko";
import { KwitansiCetak } from "@/components/kwitansi-cetak";
import { SlotPanelCetak } from "@/components/panel-cetak";
import { PengaturKwitansi } from "@/components/pengatur-kwitansi";
import { type IsiKwitansi, isiKwitansi } from "@/lib/kwitansi";
import { penandatanganAktif } from "@/lib/penandatangan";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";
import { prisma } from "@/lib/prisma";
import { namaBerkasCetak } from "@/lib/nomor-tiska";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/pembayaran/[id]/kwitansi">): Promise<Metadata> {
  await wajibIzin("pembayaran");
  const isi = await isiKwitansi((await params).id);
  return { title: { absolute: isi ? namaBerkasCetak(isi.nomor) : "Kwitansi" } };
}

/**
 * Ukuran kertas per pilihan. Tepi 0 di semua pilihan: lembarnya sudah punya ruang tepi sendiri, dan tepi 0 juga
 * membuang tanggal/URL bawaan browser. Menimpa @page A4 di globals.css hanya di halaman ini.
 */
const HALAMAN = {
  a5: { page: "A5 landscape", tinggi: "148mm" },
  blanko: { page: "A5 landscape", tinggi: "148mm" },
  a4: { page: "A4 portrait", tinggi: "297mm" },
} as const;

/** Tanda tangan basah: gambar tanda tangan tidak dicetak, nama tetap. */
const tanpaGambarTtd = (x: IsiKwitansi): IsiKwitansi => ({ ...x, penandatangan: { ...x.penandatangan, tautan: null } });

export default async function CetakKwitansi({ params, searchParams }: PageProps<"/pembayaran/[id]/kwitansi">) {
  await wajibIzin("pembayaran");
  const { id } = await params;
  const sp = await searchParams;
  const kertas = sp.kertas === "blanko" || sp.kertas === "a4" ? sp.kertas : "a5";
  const ttd = sp.ttd === "basah" ? "basah" : "digital";
  const idBawah = typeof sp.bawah === "string" && /^\d+$/.test(sp.bawah) ? sp.bawah : id;
  const isiAsli = await isiKwitansi(id);
  if (!isiAsli) notFound();
  const isi = ttd === "basah" ? tanpaGambarTtd(isiAsli) : isiAsli;
  // A4 isi 2: bagian bawah bawaannya kwitansi yang sama; bisa diganti kwitansi lain.
  const [bawahAsli, daftar] =
    kertas === "a4"
      ? await Promise.all([
          idBawah === id ? isiAsli : isiKwitansi(idBawah),
          prisma.payments.findMany({
            orderBy: { payment_date: "desc" },
            take: 300,
            select: { id: true, payment_number: true, receipt_number: true, total_amount: true, pph23_amount: true, customers: { select: { name: true } } },
          }),
        ])
      : [null, []];
  const bawah = bawahAsli && ttd === "basah" ? tanpaGambarTtd(bawahAsli) : bawahAsli;
  const pilihanBawah = daftar.map((p) => ({
    id: p.id.toString(),
    label: `${p.receipt_number ?? p.payment_number} · ${p.customers.name}`,
    sub: rupiah(Number(p.total_amount) + Number(p.pph23_amount)),
  }));
  const opsiBawah = pilihanBawah.find((p) => p.id === (bawah ? idBawah : id)) ?? { id, label: isi.nomor };
  const h = HALAMAN[kertas];
  // Meterai (D-130) di panel kanan — unggah PDF ber-e-meterai / tandai meterai tempel tanpa pindah halaman.
  const [m, bisnis, ttdAktif] = await Promise.all([
    prisma.payments.findUnique({ where: { id: BigInt(id) }, select: { receipt_stamp_mode: true, receipt_stamped_at: true, signatory_id: true } }),
    bacaPengaturanBisnis(),
    penandatanganAktif(),
  ]);
  const opsiTtd = ttdAktif.map((t) => ({ id: t.id, nama: t.nama, adaGambar: Boolean(t.jalurTtd) }));
  // Yang tersimpan di payment; payment lama (kosong) ikut invoice → dicocokkan dari nama yang tercetak.
  const idTtd = m?.signatory_id?.toString() ?? opsiTtd.find((t) => t.nama === isiAsli.penandatangan.nama)?.id ?? null;
  // Cap digital: pilihan di panel (?cap=1/0) menang; tanpa pilihan, cap hanya untuk penandatangan yang gambar
  // tanda tangannya belum memuat logo TISKA (signature_has_stamp) — supaya logonya tidak dobel.
  const capUntuk = (x: IsiKwitansi) => (sp.cap === "1" ? true : sp.cap === "0" ? false : !x.penandatangan.adaCap);
  const cap = capUntuk(isiAsli);
  // Kotak bantu letak e-meterai (layar saja) selama kwitansi wajib meterai belum diberi.
  const areaMeterai = isiAsli.perlu_materai && !m?.receipt_stamp_mode;
  return (
    <>
      {/* Meterai paling atas: tombol unggahnya yang dicari setelah mencetak. */}
      <SlotPanelCetak>
        <KwitansiMeterai
          diHalamanCetak
          id={id}
          perlu={isiAsli.perlu_materai}
          batas={rupiah(bisnis.materai.batas)}
          jumlah={rupiah(isiAsli.jumlah)}
          cara={m?.receipt_stamp_mode ?? null}
          tanggal={m?.receipt_stamped_at ? format(m.receipt_stamped_at, "d MMMM yyyy", { locale: localeId }) : null}
        />
      </SlotPanelCetak>
      <PengaturKwitansi idPembayaran={id} penandatangan={opsiTtd} idPenandatangan={idTtd} kertas={kertas} ttd={ttd} cap={cap} capDiTtd={isiAsli.penandatangan.adaCap} bawah={opsiBawah} pilihanBawah={pilihanBawah} />
      <style>{`
        :root { --tinggi-isi-cetak: ${h.tinggi}; }
        .lembar-cetak { padding: 0; overflow-x: auto; }
        @media print { @page { size: ${h.page}; margin: 0; } }
      `}</style>
      {kertas === "blanko" ? (
        <KwitansiBlanko isi={isiAsli} ttdDigital={ttd === "digital"} cap={cap} areaMeterai={areaMeterai} />
      ) : kertas === "a4" ? (
        <>
          {/* Kertas A4 masuk berdiri: ujung yang tidak tercetak (±14,5 mm) jatuh di bawah kwitansi kedua.
              Garis putus-putus = garis potong; di dalam tinggi lembar supaya tetap pas satu A4. */}
          <KwitansiCetak isi={isi} cap={cap} areaMeterai={areaMeterai} rapat tinggi="h-[148.5mm]" tepi="px-[13mm] pt-[10mm] pb-[8mm]" />
          {bawah ? <KwitansiCetak isi={bawah} cap={capUntuk(bawah)} rapat tinggi="h-[148.5mm]" tepi="border-t border-dashed border-[#b9bccb] px-[13mm] pt-[8mm] pb-[17mm]" /> : null}
        </>
      ) : (
        <KwitansiCetak isi={isi} cap={cap} areaMeterai={areaMeterai} />
      )}
    </>
  );
}
