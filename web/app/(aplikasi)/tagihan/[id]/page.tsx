import { ISTILAH, JENIS_PESANAN, type JenisPesanan, labelLayanan, labelLokasi, labelPajak, labelPpn } from "@/lib/istilah";
import { keteranganRincian } from "@/lib/baris-cetak";
import { Fragment } from "react";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, Calculator, ChefHat, FileSpreadsheet, PencilLine, Printer, ReceiptText, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Halaman, Pil, Td, Th } from "@/components/halaman";
import { StatusTagihan } from "@/components/lencana-status";
import { KunciDokumen } from "@/components/kunci-dokumen";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { labelSesi } from "@/lib/sesi";
import { jumlahHariAcara, ringkasTanggalAcara } from "@/lib/tanggal";
import { bolehKelolaUang as kelolaUang } from "@/lib/peran";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { namaRekanan, opsiRekanan, orderRekanan } from "@/lib/rekanan";
import { bolehBuka } from "@/lib/navigasi";
import { bacaIzin } from "@/lib/izin";
import { jadwalTermin, type StatusTermin } from "@/lib/hitung/termin";
import { bacaPengaturanBisnis } from "@/lib/pengaturan";

const LABEL_TERMIN: Record<StatusTermin, string> = { lunas: "Lunas", sebagian: "Sebagian", terlambat: "Terlambat", menunggu: "Menunggu" };
import { d, labelStatusInvoice, nilaiKelompok, perluTotalKelompok, romawi, rupiah } from "@/lib/uang";
import { KotakInvoiceLama } from "../../ikut-menu-pesta/loyalti/kotak-invoice-lama";
import { KotakRekanan } from "../../rekanan/kotak-rekanan";

export const metadata: Metadata = { title: "Detail invoice" };
export const dynamic = "force-dynamic";

export default async function HalamanDetailTagihan({ params }: PageProps<"/tagihan/[id]">) {
  const sesi = await wajibIzin("tagihan");

  const { id } = await params;

  const t = await prisma.invoices.findFirst({
    where: { id: BigInt(id), ...hanyaMiliknya(sesi) },
    include: {
      customers: true,
      quotations: { select: { id: true, quotation_number: true, partner_id: true } },
      partner_fees: { select: { id: true } },
      _count: { select: { retail_orders: true } },
      // Siapa yang membatalkan, untuk catatan pembatalannya.
      users_invoices_cancelled_byTousers: { select: { name: true } },
      payment_details: {
        orderBy: { id: "desc" },
        include: {
          payments: {
            select: {
              id: true,
              payment_number: true,
              payment_date: true,
              payment_method: true,
            },
          },
        },
      },
      invoice_charges: { orderBy: { id: "asc" } },
      invoice_event_dates: { orderBy: { event_date: "asc" } },
      invoice_items: {
        where: { parent_id: null },
        orderBy: { id: "asc" },
        include: {
          other_invoice_items: {
            orderBy: { id: "asc" },
            select: { id: true, item_name: true, unit: true, day: true, qty: true, pax: true, price: true, subtotal: true },
          },
        },
      },
    },
  });

  if (!t) notFound();
  // Rekanan & Partner Fee order ini (D-132) — hanya untuk yang boleh membuka menu Rekanan.
  const izin = await bacaIzin();
  const lihatRekanan = bolehBuka(sesi.peran, "rekanan", izin);
  // Invoice lama → stempel loyalti Ikut Menu Pesta (Rama 10 Nov 2026); invoice pesanan Ikut Menu Pesta sudah otomatis.
  const kotakLoyalti = bolehBuka(sesi.peran, "ikut-menu-pesta", izin) && !t._count.retail_orders && (t.status !== "cancelled" || t.loyalty_pax !== null);
  const [nmRekanan, pilihRekanan, feeIni] = lihatRekanan
    ? await Promise.all([namaRekanan([t.partner_id, t.quotations?.partner_id, t.customers.partner_id]), opsiRekanan(), orderRekanan({ idCustomer: t.customer_id }).then((o) => o.find((x) => x.idInvoice === id) ?? null)])
    : [new Map<string, string>(), [], null];
  const opsiDari = (x: bigint | null | undefined) => (x && nmRekanan.has(x.toString()) ? { id: x.toString(), label: nmRekanan.get(x.toString())! } : null);

  const sisa = d(t.grand_total).minus(d(t.paid_amount));
  const persenBayar = Number(t.grand_total) > 0 ? Math.min(100, Math.round((Number(t.paid_amount) / Number(t.grand_total)) * 100)) : 0;

  // Jadwal termin acuan (D-046) — hanya pesanan di atas booking fee.
  const termin = jadwalTermin({
    total: t.grand_total.toString(),
    dibayar: t.paid_amount.toString(),
    tanggalAcara: t.invoice_event_dates[0]?.event_date ?? t.event_date,
    aturan: (await bacaPengaturanBisnis()).termin,
  });
  const bolehKelolaUang = kelolaUang(sesi.peran);
  const belumLunas = ["unpaid", "partial", "overdue"].includes(t.status);

  const hariAcara = jumlahHariAcara(t.invoice_event_dates.map((b) => b.event_date));

  const acara = [
    ["Jenis acara", t.event_type],
    // Diringkas dengan fungsi yang sama persis dengan yang dipakai dokumen
    // cetaknya, supaya layar dan cetakan tidak pernah menyebut hari berbeda.
    ["Tanggal acara", ringkasTanggalAcara(t.invoice_event_dates.map((b) => b.event_date))],
    ["Jumlah hari", hariAcara > 0 ? `${hariAcara} hari` : null],
    ["Jam", t.event_time],
    ["Jumlah tamu", t.guest_count ? `${t.guest_count} orang` : null],
    ["Jenis pesanan", t.order_type ? JENIS_PESANAN[t.order_type as JenisPesanan] : null],
    [labelLokasi(t.order_type), t.venue],
    ["F&B planner", t.fnb_planner],
  ].filter(([, nilai]) => Boolean(nilai)) as [string, string][];

  return (
    <Halaman>
      <div className="pb-5">
        <Link
          href="/tagihan"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Semua invoice
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <ReceiptText className="size-7 shrink-0 text-primary-strong" strokeWidth={1.75} aria-hidden="true" />
            <h1 className="font-mono text-2xl font-bold tracking-tight text-primary-strong sm:text-[1.75rem]">{t.invoice_number}</h1>
            <StatusTagihan status={t.status} />
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {format(t.invoice_date, "d MMMM yyyy", { locale: localeId })} · jatuh tempo{" "}
            {format(t.due_date, "d MMMM yyyy", { locale: localeId })}
            {t.quotations ? (
              <>
                {" · dari "}
                <Link href={`/penawaran/${t.quotations.id}`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                  {t.quotations.quotation_number}
                </Link>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/tagihan/${t.id}/cetak`} target="_blank" rel="noopener" />}
          >
            <Printer className="size-4" />
            Cetak
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/tagihan/${t.id}/excel`} />}
          >
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`/tagihan/${t.id}/dapur`} target="_blank" rel="noopener" />}
          >
            <ChefHat className="size-4" />
            Dapur
          </Button>
          {t.status !== "cancelled" ? (
            <Button variant="outline" size="sm" render={<Link href={`/tagihan/${t.id}/ubah`} />}>
              <PencilLine className="size-4" />
              Ubah
            </Button>
          ) : null}
          {bolehKelolaUang ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/tagihan/${t.id}/margin`} />}
            >
              <Calculator className="size-4" />
              Biaya &amp; margin
            </Button>
          ) : null}
          {bolehKelolaUang && belumLunas ? (
            <Button size="sm" render={<Link href={`/pembayaran/baru?tagihan=${t.id}`} />}>
              <Wallet className="size-4" />
              Catat pembayaran
            </Button>
          ) : null}
        </div>
      </header>

      {/* Ringkasan uang — bagian yang paling sering dicari orang di halaman ini */}
      <section className="mb-6 overflow-hidden rounded-[14px] border bg-card">
        <div className="grid grid-cols-1 divide-border sm:grid-cols-3 sm:divide-x">
          <AngkaBesar label="Nilai invoice" nilai={rupiah(t.grand_total)} />
          <AngkaBesar label="Sudah dibayar" nilai={rupiah(t.paid_amount)} keterangan={`${persenBayar}% terbayar`} />
          <AngkaBesar
            label="Sisa"
            nilai={rupiah(sisa)}
            menonjol
            peringatan={t.status === "overdue" && sisa.gt(0)}
            keterangan={labelStatusInvoice(t.status, t.paid_amount.toString())}
          />
        </div>
        {/* Progres pembayaran (D-161): sekali lirik tahu seberapa jauh tagihan ini. Satu warna, tanpa animasi. */}
        {t.status !== "cancelled" ? (
          <div className="h-1.5 bg-muted" role="progressbar" aria-label="Pembayaran" aria-valuenow={persenBayar} aria-valuemin={0} aria-valuemax={100}>
            <div className={`h-full ${persenBayar >= 100 ? "bg-lunas" : "bg-primary"}`} style={{ width: `${persenBayar}%` }} />
          </div>
        ) : null}
      </section>

      {/* Dokumen yang sudah dipegang customer bukan lagi yang terbaru, dan
          nomornya sama persis. Tanpa keterangan ini tidak ada cara
          membedakan keduanya selain membandingkan angkanya satu per satu. */}
      {t.revision > 0 ? (
        <KunciDokumen>
          Invoice ini sudah <b>direvisi {t.revision} kali</b>
          {t.revised_at
            ? `, terakhir ${format(t.revised_at, "d MMMM yyyy", { locale: localeId })}`
            : ""}
          . Dokumen yang sudah dipegang customer bukan lagi yang terbaru — cetak ulang
          sebelum menagihkan sisanya.
        </KunciDokumen>
      ) : null}

      {Number(t.paid_amount) > 0 && t.status !== "cancelled" ? (
        <KunciDokumen>
          Invoice ini sudah menerima payment, jadi rinciannya masih boleh diubah hanya
          selama nilainya <b>tidak turun di bawah {rupiah(t.paid_amount)}</b> yang sudah
          masuk. Kalau nilainya memang harus turun, kurangi dulu payment-nya.
        </KunciDokumen>
      ) : null}

      {t.status === "cancelled" ? (
        <KunciDokumen>
          {/* Alasannya ditampilkan di sini, bukan hanya tersimpan — yang bertanya
              "kenapa ini dibatalkan" membuka halaman ini, bukan database. */}
          <b>Invoice ini dibatalkan</b>
          {t.cancelled_at ? ` pada ${format(t.cancelled_at, "d MMMM yyyy", { locale: localeId })}` : ""}
          {t.users_invoices_cancelled_byTousers ? ` oleh ${t.users_invoices_cancelled_byTousers.name}` : ""}
          {t.cancel_reason ? (
            <>
              {" — "}
              {t.cancel_reason}
            </>
          ) : (
            ". Alasannya tidak tercatat; pembatalan ini terjadi sebelum alasannya diwajibkan."
          )}
        </KunciDokumen>
      ) : null}


      {/* Tata letak (D-161): siapa & acara di atas, tabel menu SELEBAR PENUH (deskripsi tidak terpotong per kata),
          lalu urusan uang & pihak lain di bawah. Dulu tabel berbagi lebar dengan kolom kanan. */}
      <div className="mb-6 grid items-start gap-6 md:grid-cols-2">
          {/* Gaya kwitansi (D-161): label kecil di kiri, isi di kanan, garis putus-putus. */}
          <Kotak judul="Customer">
            <DaftarIsi
              baris={[
                ["Nama", <span key="n" className="font-medium">{t.customers.name}</span>],
                ["Kode", <span key="k" className="nomor-dokumen">{t.customers.customer_code}</span>],
                ["Kontak", [t.contact_person, t.contact_phone].filter(Boolean).join(" · ") || null],
                ["Alamat", t.customers.address],
              ]}
            />
          </Kotak>
          {acara.length > 0 ? (
            <Kotak judul={t.order_type === "retail" ? "Pengiriman" : "Detail acara"}>
              <DaftarIsi baris={acara} />
            </Kotak>
          ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-[14px] border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {/* Kolom & istilah sama dengan dokumen cetak & form (D-157). */}
                    <Th className="w-12">No</Th>
                    <Th>Deskripsi</Th>
                    <Th className="w-14 text-right">Day</Th>
                    <Th className="w-16 text-right">Qty</Th>
                    <Th className="w-16 text-right">Pax</Th>
                    <Th className="w-20">Vol.</Th>
                    <Th className="w-32 text-right">Harga Satuan</Th>
                    <Th className="w-36 text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {t.invoice_items.map((b, i) => {
                    // Sub-item berharga mendapat barisnya sendiri, bernomor
                    // V.1, V.2 — sama seperti di dokumen cetak. Yang tak
                    // berharga tetap menumpang sebagai rincian isi paket.
                    const berharga = b.other_invoice_items.filter((a) => Number(a.subtotal) > 0);
                    const rincian = b.other_invoice_items.filter((a) => Number(a.subtotal) <= 0);
                    // Judul adalah baris yang tidak menagih apa pun —
                    // ditentukan oleh angkanya sendiri, bukan oleh anaknya.
                    // Aturan yang sama persis dengan dokumen cetaknya.
                    const judulKelompok = Number(b.qty) * Number(b.price) <= 0;

                    // Dinilai dengan aturan yang sama persis dengan dokumen
                    // cetaknya — dua tempat yang menghitung sendiri-sendiri
                    // akan menyimpang tanpa ada yang menegur.
                    const kelompok = {
                      subtotal: b.subtotal,
                      anak: b.other_invoice_items.map((a) => ({ subtotal: a.subtotal })),
                    };

                    return (
                      <Fragment key={b.id.toString()}>
                    <tr className="border-b last:border-0 [&>td]:align-top">
                      <Td className="nomor-dokumen text-muted-foreground">{romawi(i + 1)}</Td>
                      <Td>
                        <span className="font-medium">{b.item_name}</span>
                        {b.is_compliment ? (
                          <span className="ml-2 text-xs text-muted-foreground">(compliment)</span>
                        ) : null}
                        {b.session_date || b.session_label || b.session_time ? (
                          <div className="text-xs font-medium text-muted-foreground">
                            {labelSesi({ tanggal: b.session_date, jenis: b.session_label, jam: b.session_time })}
                          </div>
                        ) : null}
                        {b.charge_ppn ? (
                          <span className="ml-2 text-xs text-muted-foreground">(sewa alat · PPN)</span>
                        ) : !b.charge_service ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (tanpa layanan)
                          </span>
                        ) : null}
                        {rincian.length > 0 ? (
                          <ul className="mt-2 flex flex-col gap-1 border-l-2 border-border pl-3 text-[0.8125rem] text-muted-foreground">
                            {rincian.map((a) => {
                              // Keterangan jumlah dirangkai dengan aturan yang sama dengan dokumen cetaknya (D-106).
                              const ket = keteranganRincian(
                                Number(a.qty) > 0 ? Number(a.qty).toLocaleString("id-ID") : "",
                                a.unit ?? "",
                                a.pax && a.pax > 0 ? Number(a.pax).toLocaleString("id-ID") : "",
                              );
                              return (
                                <li key={a.id.toString()}>
                                  {a.item_name}
                                  {ket ? <span className="ml-1">({ket})</span> : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : Number(b.day).toLocaleString("id-ID")}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : Number(b.qty).toLocaleString("id-ID")}
                      </Td>
                      <Td className="angka text-right tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : (b.pax && b.pax > 0 ? b.pax : 1).toLocaleString("id-ID")}
                      </Td>
                      <Td className="text-muted-foreground">{judulKelompok ? "" : (b.unit ?? "")}</Td>
                      <Td className="angka text-right whitespace-nowrap tabular-nums text-muted-foreground">
                        {judulKelompok ? "" : rupiah(b.price)}
                      </Td>
                      <Td className="angka text-right font-medium whitespace-nowrap tabular-nums">
                        {judulKelompok ? (
                          ""
                        ) : b.is_compliment ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          rupiah(b.subtotal)
                        )}
                      </Td>
                    </tr>

                        {berharga.map((a, j) => (
                          <tr key={a.id.toString()} className="border-b last:border-0 [&>td]:align-top">
                            <Td className="nomor-dokumen text-muted-foreground">
                              {`${romawi(i + 1)}.${j + 1}`}
                            </Td>
                            <Td className="pl-7">{a.item_name}</Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {Number(a.day).toLocaleString("id-ID")}
                            </Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {Number(a.qty).toLocaleString("id-ID")}
                            </Td>
                            <Td className="angka text-right tabular-nums text-muted-foreground">
                              {(a.pax && a.pax > 0 ? a.pax : 1).toLocaleString("id-ID")}
                            </Td>
                            <Td className="text-muted-foreground">{a.unit ?? ""}</Td>
                            <Td className="angka text-right whitespace-nowrap tabular-nums text-muted-foreground">
                              {rupiah(a.price)}
                            </Td>
                            <Td className="angka text-right font-medium whitespace-nowrap tabular-nums">
                              {b.is_compliment ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                rupiah(a.subtotal)
                              )}
                            </Td>
                          </tr>
                        ))}
                        {perluTotalKelompok(kelompok) ? (
                          <tr className="border-b bg-muted/30 last:border-0">
                            <Td>{""}</Td>
                            <Td className="font-medium" colSpan={6}>
                              Total {romawi(i + 1)}
                            </Td>
                            <Td className="angka text-right font-semibold tabular-nums">
                              {rupiah(nilaiKelompok(kelompok))}
                            </Td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <dl className="flex flex-col gap-1.5 border-t bg-muted/20 px-4 py-4 text-sm">
              <BarisTotal label="Subtotal" nilai={rupiah(t.subtotal)} />
              {Number(t.service_charge_amount) > 0 ? (
                <BarisTotal
                  label={labelLayanan(t.service_charge_percent?.toString(), t.service_charge_minimum?.toString())}
                  nilai={rupiah(t.service_charge_amount)}
                />
              ) : null}
              {t.pb1_enabled && Number(t.pb1_amount) > 0 ? (
                <BarisTotal label={labelPajak(t.pb1_percent?.toString())} nilai={rupiah(t.pb1_amount)} />
              ) : null}
              {/* Delivery dan biaya tambahan ditaruh SESUDAH kedua pungutan,
                  urutan yang sama dengan dokumen cetaknya — supaya angka di
                  layar bisa dicocokkan baris demi baris dengan yang dikirim. */}
              {Number(t.ppn_amount) > 0 ? (
                <BarisTotal label={labelPpn(t.ppn_percent?.toString())} nilai={rupiah(t.ppn_amount)} />
              ) : null}
              {Number(t.delivery_amount) > 0 ? (
                <BarisTotal label={ISTILAH.delivery} nilai={rupiah(t.delivery_amount)} />
              ) : null}
              {t.invoice_charges.map((b) => (
                <BarisTotal key={b.id.toString()} label={b.label} nilai={rupiah(b.amount)} />
              ))}
              <div className="mt-1.5 flex items-baseline justify-between border-t pt-2.5">
                <dt className="font-medium">Total invoice</dt>
                <dd className="angka text-base font-semibold tabular-nums">
                  {rupiah(t.grand_total)}
                </dd>
              </div>
            </dl>
          </div>

          {t.show_payment_terms && t.payment_terms ? (
            <Kotak judul="Syarat pembayaran" className="mt-6">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {t.payment_terms}
              </p>
            </Kotak>
          ) : null}

          {t.notes ? (
            <Kotak judul="Catatan" className="mt-6">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{t.notes}</p>
            </Kotak>
          ) : null}
        </section>

        <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {termin.length > 1 && t.status !== "cancelled" ? (
            <Kotak judul="Termin pembayaran">
              <ul className="flex flex-col gap-2.5">
                {termin.map((x) => (
                  <li key={x.label} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-sm">
                      {x.label}
                      <span className="block text-xs text-muted-foreground">
                        {x.jatuhTempo ? `paling lambat ${format(x.jatuhTempo, "d MMM yyyy", { locale: localeId })}` : "saat pemesanan"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="angka text-sm font-medium tabular-nums">{rupiah(x.nominal)}</span>
                      <Pil nada={x.status === "lunas" ? "baik" : x.status === "terlambat" ? "perhatian" : "netral"}>
                        {LABEL_TERMIN[x.status]}
                      </Pil>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-xs text-muted-foreground">Acuan dari Angka Bisnis; kesepakatan dengan customer bisa berbeda.</p>
            </Kotak>
          ) : null}
          <Kotak judul="Riwayat payment">
            {t.payment_details.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada payment masuk.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {t.payment_details.map((p) => (
                  <li key={p.id.toString()} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <Link
                        href={`/pembayaran/${p.payments.id}`}
                        className="nomor-dokumen text-primary underline-offset-4 hover:underline"
                      >
                        {p.payments.payment_number}
                      </Link>
                      <span className="block text-xs text-muted-foreground">
                        {format(p.payments.payment_date, "d MMM yyyy", { locale: localeId })}
                      </span>
                    </span>
                    <span className="angka shrink-0 text-sm font-medium tabular-nums">
                      {rupiah(p.amount_applied)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Kotak>
          {lihatRekanan ? (
            <KotakRekanan
              jenis="invoice"
              idDokumen={id}
              nilai={opsiDari(t.partner_id)}
              warisan={opsiDari(t.quotations?.partner_id)}
              usulan={opsiDari(t.customers.partner_id)}
              opsi={pilihRekanan}
              terkunci={Boolean(t.partner_fees)}
              keterangan={feeIni ? `Partner Fee ${String(feeIni.fee.pct).replace(".", ",")}% × nilai makanan = ${rupiah(feeIni.fee.jumlah)} · ${feeIni.status === "dibayar" ? "sudah dibayar" : feeIni.status === "siap" ? "siap dibayar" : "dibayar setelah klien lunas"}` : null}
            />
          ) : null}
          {kotakLoyalti ? <KotakInvoiceLama idInvoice={id} pax={t.loyalty_pax} saran={Math.max(4, t.guest_count ?? 4)} lunas={t.status === "paid"} /> : null}
        </div>
      </div>
    </Halaman>
  );
}

function AngkaBesar({
  label,
  nilai,
  keterangan,
  menonjol,
  peringatan,
}: {
  label: string;
  nilai: string;
  keterangan?: string;
  menonjol?: boolean;
  peringatan?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <p className="eyebrow">{label}</p>
      <p
        className={`angka mt-1.5 font-semibold tracking-[-0.025em] tabular-nums ${
          menonjol ? "text-[1.375rem]" : "text-lg"
        } ${peringatan ? "text-tempo" : ""}`}
      >
        {nilai}
      </p>
      {keterangan ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>
      ) : null}
    </div>
  );
}

function BarisTotal({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="angka tabular-nums">{nilai}</dd>
    </div>
  );
}

function Kotak({
  judul,
  children,
  className,
}: {
  judul: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[14px] border bg-card px-5 py-4 ${className ?? ""}`}>
      <h2 className="eyebrow pb-2">{judul}</h2>
      {children}
    </section>
  );
}

/** Daftar label–isi bergaya kwitansi: label kecil abu di kiri, isi di kanan, dipisah garis putus-putus. */
function DaftarIsi({ baris }: { baris: [string, React.ReactNode][] }) {
  return (
    <dl className="flex flex-col divide-y divide-dashed divide-border text-sm">
      {baris
        .filter(([, nilai]) => nilai !== null && nilai !== undefined && nilai !== "")
        .map(([label, nilai]) => (
          <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap">{nilai}</dd>
          </div>
        ))}
    </dl>
  );
}

