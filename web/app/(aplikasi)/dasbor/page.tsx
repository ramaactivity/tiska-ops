import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, LayoutDashboard, Plus, ReceiptText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Halaman, KepalaHalaman } from "@/components/halaman";
import { KartuAngka } from "@/components/kartu-angka";
import { BilahProgres, BlokTanggal } from "@/components/progres-pesanan";
import { SaringStatus } from "@/components/saring-status";
import { eventMiliknya } from "@/lib/event-akses";
import { CARA_LAYANAN } from "@/lib/hitung/event";
import { progresEvent } from "@/lib/hitung/progres-event";
import { dataProgres, PILIH_PROGRES } from "@/lib/progres-event";
import { Button } from "@/components/ui/button";
import { kelompokTagih } from "@/lib/hitung/penagihan";
import { ambilPenagihan } from "@/lib/laporan-piutang";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { StatusPenawaran, StatusTagihan } from "@/components/lencana-status";
import { type BarisPengakuan, cocokSaringPengakuan, pengakuanDokumen } from "@/lib/pengakuan";
import { ringkasTanggalAcara, tanggalAcaraDokumen } from "@/lib/tanggal";
import { prisma } from "@/lib/prisma";
import { BannerUlangTahun } from "@/app/(aplikasi)/ulang-tahun/banner-ulang-tahun";
import { bacaIzin } from "@/lib/izin";
import { bolehBuka, halamanAwal } from "@/lib/navigasi";
import { bolehKelolaUang } from "@/lib/peran";
import { hanyaMiliknya, wajibSesi } from "@/lib/rbac";

import { BannerHargaNota } from "../bahan/harga-dari-nota";
import { BannerOpname } from "../stok/banner-opname";
import { tandaiJatuhTempo } from "../tagihan/actions";
import { d, rupiah } from "@/lib/uang";

export const metadata: Metadata = { title: "Dashboard" };

// Angka piutang harus selalu menunjukkan keadaan sekarang, bukan hasil
// simpanan beberapa menit lalu.
export const dynamic = "force-dynamic";

export default async function HalamanDasbor({ searchParams }: PageProps<"/dasbor">) {
  const sesi = await wajibSesi();
  const { akses, dok } = await searchParams;
  const ditolak = akses === "ditolak";

  // Halaman ini dulu hanya menuntut sesi, bukan izin. Peran yang menu
  // Dashboard-nya disembunyikan tetap bisa membukanya dengan mengetik
  // alamatnya — dan itu bukan halaman yang sepele: di sinilah piutang dan
  // omzet SELURUH perusahaan ditampilkan.
  const izin = await bacaIzin();
  if (!bolehBuka(sesi.peran, "dasbor", izin)) {
    const tujuan = halamanAwal(sesi.peran, izin);
    // Tidak dilempar kalau halaman awalnya memang dasbor sendiri — itu
    // terjadi ketika tidak ada satu pun halaman yang terbuka untuknya, dan
    // melemparnya ke sini lagi hanya akan berputar tanpa henti.
    if (tujuan !== "/dasbor") redirect(`${tujuan}?akses=ditolak`);
  }

  const sekarang = new Date();
  const awalHariIni = new Date(sekarang);
  awalHariIni.setHours(0, 0, 0, 0);


  // Status "jatuh tempo" hanya berpindah ketika ada yang menyentuhnya —
  // sampai sekarang itu terjadi saat daftar Invoice dibuka. Dashboard adalah
  // halaman PERTAMA yang dilihat orang setelah masuk, jadi tanpa ini, invoice
  // yang lewat tempo semalam masih terhitung nol sampai ada yang kebetulan
  // membuka daftar Invoice. Angka nol yang salah pada kartu "Jatuh tempo"
  // adalah angka yang membuat orang berhenti menagih.
  await tandaiJatuhTempo();

  // Sales hanya melihat angkanya sendiri. Disaring DI KUERI, bukan setelah
  // datanya terambil: kartu-kartu di bawah adalah penjumlahan, dan
  // penjumlahan yang terlanjur menghitung semuanya tidak bisa disembunyikan
  // lagi oleh penyaringan di tampilan.
  const milik = hanyaMiliknya(sesi);

  const [semuaTagihan, penawaranMenunggu, penawaranTerbaru, tagihanTerbaru] =
    await Promise.all([
      // Diambil barisnya, BUKAN dijumlahkan di database. Penjualan diakui
      // ketika acaranya sudah terjadi, dan itu keputusan per dokumen yang
      // tidak bisa dinyatakan sebagai satu penjumlahan SQL.
      prisma.invoices.findMany({
        where: { ...milik, status: { not: "cancelled" } },
        select: {
          grand_total: true,
          paid_amount: true,
          due_date: true,
          // Kolom lamanya ikut diambil: empat belas dari lima belas invoice
          // menyimpan tanggal acaranya HANYA di situ. Lihat catatan di
          // tanggalAcaraDokumen().
          event_date: true,
          event_days: true,
          invoice_event_dates: { select: { event_date: true } },
        },
      }),
      prisma.quotations.count({ where: { ...milik, status: { in: ["draft", "sent"] } } }),
      prisma.quotations.findMany({
        where: milik,
        take: 5,
        orderBy: { id: "desc" },
        select: {
          id: true,
          quotation_number: true,
          quotation_date: true,
          event_date: true,
          event_days: true,
          quotation_event_dates: { select: { event_date: true } },
          grand_total: true,
          status: true,
          customers: { select: { name: true } },
        },
      }),
      prisma.invoices.findMany({
        where: milik,
        take: 5,
        orderBy: { id: "desc" },
        select: {
          id: true,
          invoice_number: true,
          invoice_date: true,
          event_date: true,
          event_days: true,
          invoice_event_dates: { select: { event_date: true } },
          grand_total: true,
          status: true,
          customers: { select: { name: true } },
        },
      }),
    ]);

  const pengakuan = semuaTagihan.map((t) => {
    const tanggalAcara = tanggalAcaraDokumen(t.invoice_event_dates, t.event_date, t.event_days);

    return {
      dueDate: t.due_date,
      hasil: pengakuanDokumen({ grand_total: t.grand_total, paid_amount: t.paid_amount, tanggalAcara }, sekarang),
      acaraTerakhir: tanggalAcara.reduce<Date | null>((a, b) => (a === null || b > a ? b : a), null),
    } satisfies BarisPengakuan;
  });

  // Dihitung dengan penyaring yang SAMA PERSIS dengan yang dipakai daftar
  // invoice saat kartunya diklik. Angka di kartu dan banyaknya baris di
  // daftar itu tidak boleh berbeda. Lihat lib/pengakuan.ts.
  const cocok = (saring: Parameters<typeof cocokSaringPengakuan>[0]) =>
    pengakuan.filter((x) => cocokSaringPengakuan(saring, x, sekarang));

  const totalPiutang = pengakuan.reduce((j, x) => j.plus(x.hasil.piutang), d(0));
  const totalUangMuka = pengakuan.reduce((j, x) => j.plus(x.hasil.uangMuka), d(0));
  const totalDiMuka = pengakuan.reduce((j, x) => j.plus(x.hasil.diterimaDiMuka), d(0));
  const totalProyeksi = pengakuan.reduce((j, x) => j.plus(x.hasil.proyeksi), d(0));

  const jumlahUangMuka = cocok("uang-muka").length;
  const jumlahDiMuka = cocok("diterima-di-muka").length;
  const jumlahProyeksi = cocok("proyeksi").length;

  const jumlahBelumLunas = cocok("piutang").length;

  // "Bulan ini" kini berarti ACARANYA terjadi bulan ini, bukan invoicenya
  // terbit bulan ini. Itulah bulan penjualannya benar-benar diakui.
  const diakuiBulanIni = cocok("diakui-bulan-ini");
  const nilaiBulanIni = diakuiBulanIni.reduce((j, x) => j.plus(x.hasil.diakui), d(0));

  // Jatuh tempo dihitung dari due_date, bukan dari kolom status: kolom status
  // adalah salinan yang perlu disegarkan, tanggalnya adalah sumbernya.
  const jatuhTempo = cocok("jatuh-tempo").length;

  // Prioritas tagih (D-066): logika & data yang sama dengan Kartu Piutang.
  const lihatPiutang = bolehBuka(sesi.peran, "laporan-piutang", izin);
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(sekarang);
  const isoWib = (t: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(t);
  const prioritas = lihatPiutang
    ? (await ambilPenagihan(milik)).customer
        .map((c) => ({
          c,
          ...kelompokTagih({ tempo: c.invoice.map((i) => i.tempo), kontakTerakhir: c.kontakTerakhir ? isoWib(c.kontakTerakhir.kapan) : null, janji: c.janjiAktif }, hariIni),
        }))
        .filter((x) => x.kelompok === "tagih")
        .sort((a, b) => b.terlambat - a.terlambat)
        .slice(0, 5)
    : [];

  // Pesanan 7 hari ke depan (D-177): diambil dari pusat Pesanan & Event, progres dengan rumus yang sama.
  const lihatPesanan = bolehBuka(sesi.peran, "event", izin);
  const hariIniTgl = new Date(`${hariIni}T00:00:00Z`);
  const pesananDekat = lihatPesanan
    ? await prisma.events.findMany({
        where: {
          ...eventMiliknya(sesi),
          status: { notIn: ["selesai", "batal"] },
          first_date: { gte: hariIniTgl, lt: new Date(hariIniTgl.getTime() + 7 * 86_400_000) },
        },
        orderBy: [{ first_date: "asc" }, { id: "asc" }],
        take: 8,
        select: { ...PILIH_PROGRES, id: true, name: true, customers: { select: { name: true } }, users_events_pic_user_idTousers: { select: { name: true } } },
      })
    : [];
  const uangPesanan = bolehBuka(sesi.peran, "tagihan", izin);
  const tabDok = dok === "invoice" ? "invoice" : "";

  return (
    <Halaman>
      <KepalaHalaman
        ikon={LayoutDashboard}
        judul="Dashboard"
        keterangan={`Ringkasan uang, tagihan, dan pekerjaan hari ini. ${format(sekarang, "EEEE, d MMMM yyyy", { locale: localeId })}.`}
        aksi={
          <>
            <Button variant="outline" render={<Link href="/tagihan" />}>
              <ReceiptText className="size-4" />
              Lihat invoice
            </Button>
            <Button render={<Link href="/penawaran/baru" />}>
              <Plus className="size-4" />
              Buat quotation
            </Button>
          </>
        }
      />

      <PemberitahuanAkses ditolak={ditolak} />
      {/* Pengingat opname bulanan untuk owner & Finance (D-088). */}
      {bolehKelolaUang(sesi.peran) ? <BannerOpname /> : null}
      {/* Harga bahan berubah besar dari nota (D-094) — peringatan, bukan rem. */}
      {bolehKelolaUang(sesi.peran) ? <BannerHargaNota /> : null}
      {/* Ulang tahun tim (D-109) — untuk yang boleh membuka menu Ulang Tahun. */}
      {bolehBuka(sesi.peran, "ulang-tahun", izin) ? <BannerUlangTahun /> : null}

      {/* Satu papan: penjualan bulan ini sebagai angka utama, empat angka uang
          lain di sampingnya. Tiap kartu menaut ke daftar invoice yang tersaring
          dengan aturan yang sama (lib/pengakuan.ts). */}
      <section className="grid gap-3 rounded-[22px] bg-[image:var(--hero)] p-3 lg:grid-cols-4">
        <Link
          href="/tagihan?pengakuan=diakui-bulan-ini"
          className="group flex flex-col justify-between gap-4 kartu px-6 py-5 transition-[box-shadow,transform] duration-200 ease-out hover:shadow-[0_4px_16px_-8px_rgba(31,42,92,0.25)] active:scale-[0.995] lg:col-span-2 lg:row-span-2"
        >
          <div>
            <p className="label-kecil group-hover:underline">Penjualan diakui · {format(sekarang, "MMMM yyyy", { locale: localeId })}</p>
            <p className="uang mt-3 text-[1.75rem] leading-tight sm:text-[2.75rem]">{rupiah(nilaiBulanIni)}</p>
            <p className="mt-1.5 text-[0.9375rem] text-muted-foreground">
              dari {diakuiBulanIni.length} acara yang sudah terjadi bulan ini
            </p>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border-row pt-3 text-sm text-muted-foreground">
            <span>Proyeksi ke depan</span>
            <b className="font-mono font-semibold text-foreground">{rupiah(totalProyeksi)}</b>
            <span>· {jumlahProyeksi} dokumen · {penawaranMenunggu} quotation menunggu</span>
          </div>
        </Link>
        <KartuAngka
          href="/tagihan?pengakuan=piutang"
          label="Piutang berjalan"
          nilai={rupiah(totalPiutang)}
          keterangan={`${jumlahBelumLunas} invoice, acaranya sudah terjadi`}
        />
        <KartuAngka
          href="/tagihan?pengakuan=jatuh-tempo"
          label="Jatuh tempo"
          nilai={String(jatuhTempo)}
          keterangan={jatuhTempo > 0 ? "invoice perlu ditagih" : "tidak ada yang terlambat"}
          nada={jatuhTempo > 0 ? "perhatian" : "netral"}
        />
        <KartuAngka
          href="/tagihan?pengakuan=uang-muka"
          label="Uang muka"
          nilai={rupiah(totalUangMuka)}
          keterangan={`${jumlahUangMuka} invoice dipanjar, belum lunas`}
        />
        <KartuAngka
          href="/tagihan?pengakuan=diterima-di-muka"
          label="Diterima di muka"
          nilai={rupiah(totalDiMuka)}
          keterangan={`${jumlahDiMuka} invoice lunas, acaranya belum terjadi`}
          nada="info"
        />
      </section>

      {lihatPesanan || prioritas.length ? (
        <div className={`mt-8 grid items-start gap-6 lg:gap-8 ${lihatPesanan && prioritas.length ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : ""}`}>
          {lihatPesanan ? (
            <section className="kartu p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="eyebrow">Pesanan 7 hari ke depan</h2>
                <Link href="/event" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Semua pesanan <ArrowRight className="size-4" />
                </Link>
              </div>
              {pesananDekat.length ? (
                <ul className="mt-4 flex flex-col gap-1">
                  {pesananDekat.map((e) => (
                    <li key={e.id.toString()}>
                      <Link
                        href={`/event/${e.id}`}
                        className="group -mx-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 transition-[background-color,transform] duration-200 ease-out hover:bg-muted/60 active:scale-[0.99]"
                      >
                        <BlokTanggal tanggal={e.first_date} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-primary-strong">{e.customers.name}</p>
                          <p className="truncate pb-2 text-sm text-muted-foreground">
                            {[e.name === "Event" ? null : e.name, CARA_LAYANAN[e.service_mode as keyof typeof CARA_LAYANAN], e.users_events_pic_user_idTousers?.name].filter(Boolean).join(" · ")}
                          </p>
                          <BilahProgres progres={progresEvent(dataProgres(e), hariIni, uangPesanan)} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pt-4 text-sm text-muted-foreground">Tidak ada pesanan dalam 7 hari ke depan.</p>
              )}
            </section>
          ) : null}

          {prioritas.length ? (
            <section className="kartu p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="eyebrow">Prioritas tagih</h2>
                <Link href="/laporan/piutang" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  Kartu Piutang <ArrowRight className="size-4" />
                </Link>
              </div>
              <p className="pt-1 pb-3 text-sm text-muted-foreground">Paling lama terlambat di atas.</p>
              <ul className="flex flex-col gap-1">
                {prioritas.map(({ c, terlambat }) => {
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/laporan/piutang?c=${c.id}`}
                        className="group -mx-3 flex items-center gap-3 rounded-2xl px-3 py-3 transition-[background-color,transform] duration-200 ease-out hover:bg-muted/60 active:scale-[0.99]"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-semibold text-primary-strong">
                          {c.nama
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((x) => x[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{c.nama}</span>
                          <span className="block truncate text-sm text-muted-foreground">{c.invoice.length} invoice</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="uang text-[0.9375rem]">{rupiah(c.sisa)}</span>
                          <span className="rounded-full bg-perhatian-halus px-2 py-0.5 font-mono text-xs font-semibold text-perhatian">{terlambat} hari</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <section className="mt-8 kartu p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h2 className="eyebrow">Dokumen terbaru</h2>
          <SaringStatus
            parameter="dok"
            pilihan={[
              { nilai: "", label: "Quotation" },
              { nilai: "invoice", label: "Invoice" },
            ]}
          />
        </div>
        {tabDok === "" ? (
          penawaranTerbaru.length === 0 ? (
            <Kosong pesan="Belum ada quotation." />
          ) : (
            <ul className="flex flex-col gap-1">
              {penawaranTerbaru.map((p) => (
                <Baris
                  key={p.id.toString()}
                  href={`/penawaran/${p.id}`}
                  nomor={p.quotation_number}
                  nama={p.customers.name}
                  tanggal={p.quotation_date}
                  acara={ringkasTanggalAcara(tanggalAcaraDokumen(p.quotation_event_dates, p.event_date, p.event_days))}
                  nilai={p.grand_total}
                  lencana={<StatusPenawaran status={p.status} />}
                />
              ))}
            </ul>
          )
        ) : tagihanTerbaru.length === 0 ? (
          <Kosong pesan="Belum ada invoice." />
        ) : (
          <ul className="flex flex-col gap-1">
            {tagihanTerbaru.map((t) => (
              <Baris
                key={t.id.toString()}
                href={`/tagihan/${t.id}`}
                nomor={t.invoice_number}
                nama={t.customers.name}
                tanggal={t.invoice_date}
                acara={ringkasTanggalAcara(tanggalAcaraDokumen(t.invoice_event_dates, t.event_date, t.event_days))}
                nilai={t.grand_total}
                lencana={<StatusTagihan status={t.status} />}
              />
            ))}
          </ul>
        )}
        <Link href={tabDok === "" ? "/penawaran" : "/tagihan"} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {tabDok === "" ? "Semua quotation" : "Semua invoice"} <ArrowRight className="size-4" />
        </Link>
      </section>
    </Halaman>
  );
}

function Baris({
  href,
  nomor,
  nama,
  tanggal,
  acara,
  nilai,
  lencana,
}: {
  href: string;
  nomor: string;
  nama: string;
  tanggal: Date;
  /** Ringkasan tanggal acaranya, atau null kalau dokumennya tanpa acara. */
  acara: string | null;
  nilai: unknown;
  lencana: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-3 transition-[background-color,transform] duration-200 ease-out hover:bg-muted/60 active:scale-[0.99]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{nama}</span>
          <span className="nomor-dokumen mt-0.5 block truncate text-primary">
            {nomor} · {format(tanggal, "d MMM yyyy", { locale: localeId })}
          </span>
          {/* Tanggal ACARA, bukan tanggal dokumennya. Seluruh kartu di atas
              digolongkan menurut tanggal acara, dan daftar yang hanya
              menyebut tanggal dokumen membuat orang mengira kartunya salah —
              itu yang ditanyakan pemiliknya tentang invoice yang tanggalnya
              2 Oktober tetapi acaranya 3 Oktober. */}
          {acara ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              Acara {acara}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="uang text-[0.9375rem]">
            {rupiah(nilai as never)}
          </span>
          {lencana}
        </span>
      </Link>
    </li>
  );
}

function Kosong({ pesan }: { pesan: string }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{pesan}</p>;
}
