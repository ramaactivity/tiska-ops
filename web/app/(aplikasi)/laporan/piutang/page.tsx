import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, FileSpreadsheet, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BingkaiTabel, Halaman, KeadaanKosong, KepalaHalaman, RingkasanTabel, StripRingkasan, Td, Th } from "@/components/halaman";
import { KartuAngka, PapanAngka } from "@/components/kartu-angka";
import { Pencarian } from "@/components/pencarian";
import { SaringStatus } from "@/components/saring-status";
import { Button } from "@/components/ui/button";
import { kelompokTagih, LABEL_TAGIH, URUTAN_TAGIH } from "@/lib/hitung/penagihan";
import { bacaIzin } from "@/lib/izin";
import { ambilPenagihan, ambilPiutang, type CustomerTagih, KELOMPOK, riwayatPenagihan } from "@/lib/laporan-piutang";
import { bolehBuka } from "@/lib/navigasi";
import { hanyaMiliknya, wajibIzin } from "@/lib/rbac";
import { ringkasTanggalAcaraPendek } from "@/lib/tanggal";
import { d, rupiah } from "@/lib/uang";
import { cn } from "@/lib/utils";

import { type DataPanel, PanelTagih } from "./panel-tagih";

export const metadata: Metadata = { title: "Kartu piutang" };
export const dynamic = "force-dynamic";

const JENIS: Record<string, string> = { wa: "Pengingat WA", telepon: "Ditelepon", janji_bayar: "Janji bayar", catatan: "Catatan" };
const tglPendek = (t: string) => format(new Date(`${t}T00:00:00Z`), "d MMM", { locale: localeId });

export default async function HalamanPiutang({ searchParams }: PageProps<"/laporan/piutang">) {
  const sesi = await wajibIzin("laporan-piutang");
  const sp = await searchParams;
  const kunci = typeof sp.cari === "string" ? sp.cari.trim() : "";
  const tab = sp.tab === "invoice" ? "invoice" : "";
  const milik = hanyaMiliknya(sesi);

  const { hasil, customer } = await ambilPenagihan(milik);
  const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const iso = (t: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(t);

  const dinilai = customer.map((c) => ({
    c,
    ...kelompokTagih({ tempo: c.invoice.map((i) => i.tempo), kontakTerakhir: c.kontakTerakhir ? iso(c.kontakTerakhir.kapan) : null, janji: c.janjiAktif }, hariIni),
  }));
  const jumlah = (k: string) => dinilai.filter((x) => x.kelompok === k);
  const total = (xs: typeof dinilai) => xs.reduce((s, x) => s.plus(x.c.sisa), d(0));
  const tagih = jumlah("tagih");
  const cocok = kunci ? dinilai.filter((x) => x.c.nama.toLowerCase().includes(kunci.toLowerCase())) : dinilai;

  const urut = URUTAN_TAGIH.flatMap((k) =>
    cocok
      .filter((x) => x.kelompok === k)
      .sort((a, b) => b.terlambat - a.terlambat || a.menujuTempo - b.menujuTempo || b.c.sisa.cmp(a.c.sisa)),
  );
  const idDipilih = typeof sp.c === "string" ? sp.c : "";
  const dipilih = urut.find((x) => x.c.id === idDipilih) ?? urut[0];

  let panel: DataPanel | null = null;
  if (tab === "" && dipilih) {
    const [riwayat, izin] = await Promise.all([riwayatPenagihan(dipilih.c.id), bacaIzin()]);
    const c = dipilih.c;
    panel = {
      id: c.id,
      nama: c.nama,
      kode: c.kode,
      pic: c.pic,
      hp: c.hp,
      sisa: c.sisa.toFixed(0),
      terlambatNilai: c.terlambatNilai.toFixed(0),
      invoice: [...c.invoice].sort((a, b) => b.terlambat - a.terlambat),
      riwayat: riwayat.map((r) => ({
        id: r.id.toString(),
        teks: `${JENIS[r.kind] ?? r.kind}${r.promise_date ? ` ${tglPendek(r.promise_date.toISOString().slice(0, 10))}` : ""}${r.users?.name ? ` oleh ${r.users.name.split(" ")[0]}` : ""}`,
        kapan: format(r.created_at, "d MMM, HH.mm", { locale: localeId }),
      })),
      bolehCatatBayar: bolehBuka(sesi.peran, "pembayaran", izin),
    };
  }

  const tautan = (id: string) => {
    const q = new URLSearchParams();
    if (kunci) q.set("cari", kunci);
    q.set("c", id);
    return `/laporan/piutang?${q.toString()}`;
  };

  return (
    <Halaman>
      <KepalaHalaman
        ikon={Wallet}
        judul="Kartu piutang"
        jumlah={customer.length}
        keterangan="Siapa yang perlu ditagih hari ini, dan langkah berikutnya untuk masing-masing customer."
        aksi={
          <Button variant="outline" size="sm" render={<a href={`/laporan/piutang/excel${kunci ? `?cari=${encodeURIComponent(kunci)}` : ""}`} />}>
            <FileSpreadsheet className="size-4" />
            Excel
          </Button>
        }
      />

      <PapanAngka className="mb-4">
        <KartuAngka
          label="Tagih sekarang"
          nilai={rupiah(total(tagih))}
          keterangan={`${tagih.length} customer lewat jatuh tempo`}
          nada={tagih.length ? "perhatian" : "netral"}
          menonjol
        />
        <KartuAngka label="Menunggu jawaban" nilai={rupiah(total(jumlah("menunggu")))} keterangan={`${jumlah("menunggu").length} customer sudah dihubungi`} />
        <KartuAngka label="Segera jatuh tempo" nilai={rupiah(total(jumlah("segera")))} keterangan={`${jumlah("segera").length} customer dalam 7 hari`} />
        <KartuAngka label="Total piutang" nilai={rupiah(hasil.totalSemua)} keterangan={`${hasil.daftar.length} invoice · ${customer.length} customer`} />
      </PapanAngka>

      {hasil.belumTerjadi.jumlahInvoice > 0 ? (
        <div className="mb-4">
          {/* Invoice yang acaranya belum terjadi bukan piutang — tetapi tetap disebut supaya tidak terlihat hilang. */}
          <StripRingkasan
            judul={`${hasil.belumTerjadi.jumlahInvoice} invoice acaranya belum terjadi`}
            isi={[
              ["Proyeksi", rupiah(hasil.belumTerjadi.proyeksi)],
              ["Uang muka masuk", rupiah(hasil.belumTerjadi.uangMuka)],
              ["Lunas di muka", rupiah(hasil.belumTerjadi.diterimaDiMuka)],
            ]}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <SaringStatus
          parameter="tab"
          pilihan={[
            { nilai: "", label: "Perlu ditagih", jumlah: tagih.length },
            { nilai: "invoice", label: "Semua invoice", jumlah: hasil.daftar.length },
          ]}
        />
        <div className="w-full sm:w-72">
          <Pencarian placeholder="Cari nama customer…" />
        </div>
      </div>

      {tab === "invoice" ? (
        <TabelSemua kunci={kunci} milik={milik} />
      ) : !customer.length ? (
        <BingkaiTabel>
          <KeadaanKosong judul="Tidak ada piutang" keterangan="Semua invoice yang acaranya sudah lewat sudah lunas. Tidak ada yang perlu ditagih." />
        </BingkaiTabel>
      ) : !urut.length ? (
        <BingkaiTabel>
          <KeadaanKosong judul="Tidak ada yang cocok" keterangan={`Tidak ada customer bernama "${kunci}" yang punya piutang.`} />
        </BingkaiTabel>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className={cn("flex flex-col gap-5", idDipilih && "hidden lg:flex")}>
            {URUTAN_TAGIH.map((k) => {
              const isi = urut.filter((x) => x.kelompok === k);
              if (!isi.length) return null;
              return (
                <section key={k}>
                  <div className="flex items-baseline justify-between gap-3 pb-2">
                    <h2 className={cn("text-[0.9375rem] font-semibold", k === "tagih" ? "text-perhatian" : "text-primary-strong")}>
                      {LABEL_TAGIH[k].judul} <span className="font-mono text-muted-foreground">· {isi.length}</span>
                    </h2>
                    <p className="hidden text-sm text-muted-foreground sm:block">{LABEL_TAGIH[k].ket}</p>
                  </div>
                  <ul className="overflow-hidden kartu">
                    {isi.map((x) => (
                      <li key={x.c.id} className="border-b border-border-row last:border-0">
                        <Link
                          href={tautan(x.c.id)}
                          scroll={false}
                          aria-current={dipilih?.c.id === x.c.id ? "true" : undefined}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40",
                            dipilih?.c.id === x.c.id && "lg:bg-accent/60 lg:shadow-[inset_3px_0_0_var(--primary)]",
                          )}
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-sm font-semibold text-primary-strong">
                            {inisial(x.c.nama)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{x.c.nama}</span>
                            <span className="block truncate text-sm text-muted-foreground">{keadaan(x.c, x.terlambat, x.menujuTempo)}</span>
                          </span>
                          <span className="text-right">
                            <span className="uang block">{rupiah(x.c.sisa)}</span>
                            <span className="block text-xs text-muted-foreground">{x.c.invoice.length} invoice</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          {panel ? (
            <aside className={cn("kartu p-5 lg:sticky lg:top-4", !idDipilih && "hidden lg:block")}>
              {idDipilih ? (
                <Link href={kunci ? `/laporan/piutang?cari=${encodeURIComponent(kunci)}` : "/laporan/piutang"} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-primary lg:hidden">
                  <ArrowLeft className="size-4" />
                  Kembali ke daftar
                </Link>
              ) : null}
              <PanelTagih key={panel.id} d={panel} />
            </aside>
          ) : null}
        </div>
      )}
    </Halaman>
  );
}

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

/** Satu kalimat "kenapa dia di kelompok ini". */
function keadaan(c: CustomerTagih, terlambat: number, menujuTempo: number) {
  const bagian: string[] = [];
  if (terlambat > 0) bagian.push(`lewat ${terlambat} hari`);
  else if (Number.isFinite(menujuTempo)) bagian.push(menujuTempo === 0 ? "jatuh tempo hari ini" : `jatuh tempo ${menujuTempo} hari lagi`);
  if (c.janjiAktif) bagian.push(`janji bayar ${tglPendek(c.janjiAktif)}`);
  else if (c.kontakTerakhir) bagian.push(`${(JENIS[c.kontakTerakhir.jenis] ?? "dihubungi").toLowerCase()} ${format(c.kontakTerakhir.kapan, "d MMM", { locale: localeId })}`);
  return bagian.join(" · ");
}

/** Tab "Semua invoice": satu baris satu invoice, dikelompokkan umur (tampilan lama, tetap untuk audit). */
async function TabelSemua({ kunci, milik }: { kunci: string; milik: ReturnType<typeof hanyaMiliknya> }) {
  const { daftar, jumlahPelanggan, umur, totalSemua, lunas } = await ambilPiutang(kunci, milik);
  return (
    <>
      <div className="mb-4">
        <StripRingkasan judul="Umur piutang" isi={KELOMPOK.map((k) => [k.label, rupiah(umur[k.kunci])])} />
      </div>
      <BingkaiTabel>
        {daftar.length === 0 ? (
          <KeadaanKosong
            judul={kunci ? "Tidak ada yang cocok" : "Tidak ada piutang"}
            keterangan={
              lunas.length
                ? `Sudah lunas: ${lunas.map((p) => p.nama).join(", ")}. Buka customer-nya untuk melihat riwayat pembayaran.`
                : kunci
                  ? `Tidak ada customer bernama "${kunci}" yang punya invoice.`
                  : "Semua invoice sudah lunas."
            }
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <Th>Customer</Th>
                <Th className="hidden w-40 sm:table-cell">No. invoice</Th>
                <Th className="hidden w-32 md:table-cell">Tanggal</Th>
                <Th className="hidden w-32 md:table-cell">Jatuh tempo</Th>
                <Th className="w-32 text-right">Terlambat</Th>
                <Th className="w-40 text-right">Sisa piutang</Th>
              </tr>
            </thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.idTagihan} className="border-b border-border-row last:border-0 hover:bg-muted/25">
                  <Td>
                    <Link href={`/pelanggan/${p.idPelanggan}`} className="font-medium hover:underline">
                      {p.nama}
                    </Link>
                    <span className="block text-sm text-muted-foreground">
                      {p.kode}
                      {p.pic ? ` · ${p.pic}` : ""}
                    </span>
                  </Td>
                  <Td className="hidden sm:table-cell">
                    <Link href={`/tagihan/${p.idTagihan}`} className="nomor-dokumen text-primary hover:underline">
                      {p.nomor}
                    </Link>
                    {/* Tanggal acara menempel di nomor invoice, bukan kolom ketiga (sudah ada Tanggal & Jatuh tempo). */}
                    {ringkasTanggalAcaraPendek(p.tanggalAcara) ? (
                      <span className="block text-xs whitespace-nowrap text-muted-foreground">{ringkasTanggalAcaraPendek(p.tanggalAcara)}</span>
                    ) : null}
                  </Td>
                  <Td className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{format(p.tanggal, "d MMM yyyy", { locale: localeId })}</Td>
                  <Td className="hidden text-muted-foreground md:table-cell">{format(p.tempo, "d MMM yyyy", { locale: localeId })}</Td>
                  <Td className="text-right font-mono">
                    {p.hariTerlambat > 0 ? <span className={p.hariTerlambat > 60 ? "font-medium text-tempo" : ""}>{p.hariTerlambat} hari</span> : <span className="text-muted-foreground">—</span>}
                  </Td>
                  <Td className="uang text-right">{rupiah(p.sisa)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </BingkaiTabel>
      {daftar.length ? (
        <RingkasanTabel>
          {daftar.length} invoice dari {jumlahPelanggan} customer · total piutang {rupiah(totalSemua)}
        </RingkasanTabel>
      ) : null}
    </>
  );
}
