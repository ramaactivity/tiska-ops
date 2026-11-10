import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CircleAlert, FileSpreadsheet, Lock, Percent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BarisKontak } from "@/components/baris-kontak";
import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, RingkasanTabel, Td } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { PemberitahuanAkses } from "@/components/pemberitahuan-akses";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { ThUrut } from "@/components/th-urut";
import { Button } from "@/components/ui/button";
import { ambilLaporanMargin, type Ringkasan } from "@/lib/laporan-margin";
import { wajibIzin } from "@/lib/rbac";
import { rupiah } from "@/lib/uang";
import { bacaUrut, urutkan } from "@/lib/urut";

export const metadata: Metadata = { title: "Laporan margin" };
export const dynamic = "force-dynamic";

const persen = (n: { toString(): string }) => `${n.toString().replace(".", ",")}%`;
const KOLOM = ["nomor", "customer", "penjualan", "biaya", "margin", "persen"] as const;

/**
 * Margin per acara (D-066). Angka NYATA (invoice) dan PERKIRAAN (quotation)
 * dipisah ke dua tab — sengaja tidak pernah tampil bertumpuk, supaya tidak
 * terbaca seolah-olah boleh dijumlahkan.
 */
export default async function HalamanLaporanMargin({ searchParams }: PageProps<"/laporan/margin">) {
  await wajibIzin("laporan-margin");

  const { cari, akses, jenis, urut } = await searchParams;
  const kunci = typeof cari === "string" ? cari.trim() : "";
  const tab = jenis === "perkiraan" ? "perkiraan" : "";

  const { nyata, perkiraan, ringkasanNyata, ringkasanPerkiraan } = await ambilLaporanMargin(kunci);
  const { kolom, arah } = bacaUrut<(typeof KOLOM)[number]>(urut, KOLOM, "-nomor");

  const barisNyata = urutkan(
    nyata,
    (b) =>
      ({ nomor: b.tanggal, customer: b.pelanggan, penjualan: Number(b.penjualan), biaya: Number(b.biaya), margin: Number(b.untung), persen: Number(b.marginPersen) })[kolom],
    arah,
  );
  const barisPerkiraan = urutkan(
    perkiraan,
    (b) =>
      ({
        nomor: b.tanggal,
        customer: b.pelanggan,
        penjualan: Number(b.hasil.net_sales),
        biaya: Number(b.hasil.total_cost),
        margin: Number(b.hasil.profit),
        persen: Number(b.hasil.margin_percent),
      })[kolom],
    arah,
  );

  return (
    <Halaman>
      <PemberitahuanAkses ditolak={akses === "ditolak"} />

      <KepalaHalaman
        ikon={Percent}
        judul="Laporan margin"
        keterangan="Margin per acara. Angka nyata dari invoice dan angka perkiraan dari quotation dipisah, tidak pernah dijumlahkan."
        aksi={
          <Button variant="outline" render={<a href={`/laporan/margin/excel${kunci ? `?cari=${encodeURIComponent(kunci)}` : ""}`} />}>
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
        <SaringStatus
          parameter="jenis"
          pilihan={[
            { nilai: "", label: "Nyata · dari invoice", jumlah: nyata.length },
            { nilai: "perkiraan", label: "Perkiraan · dari quotation", jumlah: perkiraan.length },
          ]}
        />
        <div className="w-full sm:w-80">
          <Pencarian placeholder="Cari nomor dokumen atau customer…" />
        </div>
      </div>

      {tab === "" ? (
        <>
          <PanelMargin
            r={ringkasanNyata}
            keterangan="Uang yang sudah benar-benar ditagihkan, dikurangi biaya yang sudah dicatat."
            labelBiaya="Total biaya"
            belumDicatat={
              ringkasanNyata.belumDicatat
                ? `${ringkasanNyata.belumDicatat} invoice belum punya catatan biaya sama sekali, jadi seluruh nilainya terhitung sebagai margin. Angka di atas baru bisa dipercaya setelah biayanya dicatat.`
                : null
            }
          />
          <BingkaiTabel>
            {nyata.length === 0 ? (
              <KeadaanKosong judul={kunci ? "Tidak ada yang cocok" : "Belum ada invoice"} keterangan="Margin dihitung per invoice, jadi buat invoice lebih dulu." />
            ) : (
              <table className="w-full">
                <KepalaTabel dokumen="Invoice" biaya="Biaya" margin="Margin" />
                <tbody>
                  {barisNyata.map((b) => (
                    <tr key={b.id} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                      <Td>
                        <Link href={`/tagihan/${b.id}/margin`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                          {b.nomor}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          {format(b.tanggal, "d MMM yy", { locale: localeId })}
                          {b.final ? " · final" : ""}
                        </span>
                      </Td>
                      <Td>
                        {/* Lebar dibatasi: baris PIC · acara yang panjang tidak boleh mendorong kolom Margin keluar layar (laptop 1230 px). */}
                        <div className="max-w-[18rem]">
                          <span className="font-medium">{b.pelanggan}</span>
                          <BarisKontak pic={b.pic} acara={b.jenisAcara} />
                        </div>
                      </Td>
                      <Td className="hidden text-right font-mono text-muted-foreground xl:table-cell">{rupiah(b.penjualan)}</Td>
                      <Td className="text-right font-mono text-muted-foreground">
                        {b.adaBiaya ? rupiah(b.biaya) : <span className="font-sans text-xs text-perhatian">belum dicatat</span>}
                        {b.adaRealisasi ? (
                          <span className="block font-sans text-xs whitespace-nowrap">
                            Est. {rupiah(b.estimasi)} · Real. {rupiah(b.realisasi)}
                            {!b.selisih.isZero() ? (
                              <span className={b.selisih.gt(0) ? " text-tempo" : " text-lunas"}>
                                {" "}
                                · {b.selisih.gt(0) ? "+" : "−"}
                                {rupiah(b.selisih.abs())}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </Td>
                      <Td className={`uang text-right ${b.rugi ? "text-tempo" : ""}`}>{rupiah(b.untung)}</Td>
                      <Td className={`text-right font-mono ${b.rugi ? "text-tempo" : ""}`}>
                        <span className="inline-flex items-center gap-1">
                          {b.final ? <Lock className="size-3 text-muted-foreground" aria-label="final" /> : null}
                          {persen(b.marginPersen)}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </BingkaiTabel>
          {nyata.length > 0 ? <RingkasanTabel>{nyata.length} invoice · invoice yang dibatalkan tidak dihitung</RingkasanTabel> : null}
        </>
      ) : (
        <>
          <PanelMargin
            r={ringkasanPerkiraan}
            perkiraan
            keterangan="Quotation yang belum jadi invoice, memakai perkiraan biaya yang dicatat di penawarannya. Dipakai menimbang harga sebelum dikirim ke klien."
            labelBiaya="Perkiraan biaya"
            belumDicatat={
              ringkasanPerkiraan.belumDicatat
                ? `${ringkasanPerkiraan.belumDicatat} quotation belum punya perkiraan biaya, jadi seluruh nilainya terhitung sebagai margin.`
                : null
            }
          />
          <BingkaiTabel>
            {perkiraan.length === 0 ? (
              <KeadaanKosong judul={kunci ? "Tidak ada yang cocok" : "Tidak ada quotation terbuka"} keterangan="Quotation yang sudah jadi invoice dihitung di tab Nyata." />
            ) : (
              <table className="w-full">
                <KepalaTabel dokumen="Quotation" biaya="Perkiraan biaya" margin="Perkiraan margin" />
                <tbody>
                  {barisPerkiraan.map((b) => {
                    const rugi = b.hasil.profit_status === "rugi";
                    return (
                      <tr key={b.id} className="border-b border-border-row last:border-0 hover:bg-muted/40">
                        <Td>
                          <Link href={`/penawaran/${b.id}/margin`} className="nomor-dokumen text-primary underline-offset-4 hover:underline">
                            {b.nomor}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{format(b.tanggal, "d MMM yy", { locale: localeId })}</span>
                        </Td>
                        <Td>
                          <div className="max-w-[18rem]">
                            <span className="font-medium">{b.pelanggan}</span>
                            <BarisKontak pic={b.pic} acara={b.jenisAcara} />
                          </div>
                        </Td>
                        <Td className="hidden text-right font-mono text-muted-foreground xl:table-cell">{rupiah(b.hasil.net_sales)}</Td>
                        <Td className="text-right font-mono text-muted-foreground">
                          {b.adaBiaya ? rupiah(b.hasil.total_cost) : <span className="font-sans text-xs text-perhatian">belum dicatat</span>}
                        </Td>
                        <Td className={`uang text-right ${rugi ? "text-tempo" : ""}`}>{rupiah(b.hasil.profit.abs())}</Td>
                        <Td className={`text-right font-mono ${rugi ? "text-tempo" : ""}`}>{persen(b.hasil.margin_percent)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </BingkaiTabel>
          {perkiraan.length > 0 ? <RingkasanTabel>{perkiraan.length} quotation · yang sudah jadi invoice tidak dihitung dua kali</RingkasanTabel> : null}
        </>
      )}
    </Halaman>
  );
}

function PanelMargin({
  r,
  keterangan,
  labelBiaya,
  belumDicatat,
  perkiraan,
}: {
  r: Ringkasan;
  keterangan: string;
  labelBiaya: string;
  belumDicatat: string | null;
  perkiraan?: boolean;
}) {
  const rugi = r.untung.isNegative();
  return (
    <>
      <p className="pb-3 text-[0.9375rem] text-muted-foreground">{keterangan}</p>
      <PapanAngka className="mb-4">
        <KartuAngka label="Penjualan bersih" nilai={rupiah(r.penjualan)} />
        <KartuAngka label={labelBiaya} nilai={rupiah(r.biaya)} />
        <KartuAngka
          label={`${perkiraan ? "Perkiraan " : ""}${rugi ? "rugi" : "margin"}`.replace(/^./, (h) => h.toUpperCase())}
          nilai={rupiah(r.untung.abs())}
          nada={rugi ? "perhatian" : "info"}
          menonjol
        />
        <KartuAngka label="Margin rata-rata" nilai={persen(r.marginPersen)} />
      </PapanAngka>
      {belumDicatat ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{belumDicatat}</span>
        </div>
      ) : null}
    </>
  );
}

function KepalaTabel({ dokumen, biaya, margin }: { dokumen: string; biaya: string; margin: string }) {
  return (
    <thead>
      <tr className="border-b">
        <ThUrut kolom="nomor" className="w-44">
          {dokumen}
        </ThUrut>
        <ThUrut kolom="customer">Customer</ThUrut>
        <ThUrut kolom="penjualan" kanan className="hidden w-40 xl:table-cell">
          Penjualan
        </ThUrut>
        <ThUrut kolom="biaya" kanan className="w-40">
          {biaya}
        </ThUrut>
        <ThUrut kolom="margin" kanan className="w-40">
          {margin}
        </ThUrut>
        <ThUrut kolom="persen" kanan className="w-28">
          Margin %
        </ThUrut>
      </tr>
    </thead>
  );
}
