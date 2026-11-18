import { TeksSyarat } from "@/components/teks-syarat";
import { namaIsiBersih } from "@/lib/hitung/urutan-isi";
import { Fragment } from "react";

import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { jumlahHariAcara, ringkasTanggalAcara } from "@/lib/tanggal";

import { barisTabelDokumen, barisTotalDokumen, type ItemCetak, nilaiComplimentDokumen } from "@/lib/baris-cetak";
import { d, rupiah } from "@/lib/uang";
import { EMAS, GARIS, GARIS_BARIS, GARIS_KOLOM, KREM, NAVY, REDUP, TINTA } from "@/lib/warna-dokumen";

/* ==========================================================================
   DOKUMEN CETAK

   Satu tata letak dipakai penawaran maupun tagihan, karena keduanya memang
   dokumen yang sama bentuknya di mata pelanggan — hanya judul, nomor, dan
   beberapa baris kepala yang berbeda.

   Isinya mengikuti dokumen yang sudah dipakai perusahaan (docs/06): data
   pelanggan, data acara, rincian bernomor Romawi dengan isi menu, ringkasan
   total, S&K, rekening, tanda tangan. Tampilannya (D-186, 16 Nov 2026) tidak
   lagi berkotak-kotak seperti lembar Excel: kop dengan garis emas logo Tiska,
   panel acara krem, tabel bergaris tipis, dan satu pita TOTAL navy — satu
   bahasa visual dengan kwitansi.
   ========================================================================== */

/**
 * Satu baris item. Bentuknya SATU dengan yang dipakai lib/baris-cetak.ts,
 * bukan salinan: dua bentuk yang kembar akan menyimpang begitu salah
 * satunya bertambah kolom, dan tidak ada yang memberi tahu sampai kolomnya
 * hilang dari salah satu dokumen.
 */
export type BarisCetak = ItemCetak;

export type Perusahaan = {
  company_name: string;
  logo_path: string | null;
  /** Sudah berupa tautan siap pakai: tanda tangan ditandatangani di server. */
  signature_url: string | null;
  signature_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_code: string | null;
  swift_code: string | null;
};

export type IsiDokumen = {
  judul: string;
  labelNomor: string;
  nomor: string;
  /**
   * Nomor revisi, 0 atau tidak diisi kalau belum pernah direvisi.
   *
   * Invoice yang sudah dikirim bisa bertambah nilainya karena ada tambahan
   * menu saat acara berlangsung. Nomornya tetap sama persis, jadi tanpa
   * penanda ini dua orang bisa duduk berhadapan memegang kertas yang
   * sama-sama bernama INV-2026-0016 dengan total yang berbeda.
   */
  revisi?: number;
  tanggalRevisi?: Date | null;
  /**
   * Nomor PO dari customer. Kosong berarti barisnya TIDAK digambar.
   *
   * Baris "Referensi PO: -" pada dokumen yang memang tidak punya nomor PO
   * hanya mengundang pertanyaan dari bagian hutang customer.
   */
  referensiPo?: string | null;
  tanggal: Date;
  labelTanggalKedua: string;
  tanggalKedua: Date;

  pelanggan: { nama: string; alamat: string | null };
  /** cc: orang yang ikut di-CC (D-165), tercetak di bawah kontak utama. */
  kontak: { nama: string | null; telepon: string | null; ccNama?: string | null; ccTelepon?: string | null };

  acara: {
    /** Seluruh tanggal acara, sudah terurut. Boleh kosong. */
    tanggal: Date[];
    tamu: number | null;
    planner: string | null;
    jam: string | null;
    venue: string | null;
    /** Jenis pesanan (D-070): retail menampilkan "Alamat Kirim". */
    pesanan?: string | null;
    jenis: string | null;
  };

  baris: BarisCetak[];

  subtotal: string;
  service_charge_percent: string | null;
  service_charge_minimum?: string | null;
  service_charge_amount: string;
  pb1_enabled: boolean;
  pb1_percent: string | null;
  pb1_amount: string;
  /** PPN baris sewa alat (D-039); dokumen lama tidak punya. */
  ppn_percent?: string | null;
  ppn_amount?: string;
  delivery_amount: string;
  biaya_tambahan: { id: string; label: string; amount: string }[];
  grand_total: string;
  /** Invoice: pembayaran yang sudah masuk (D-046) — dicetak bersama sisa tagihan. */
  pembayaran?: { nomor: string; tanggal: Date; jumlah: string }[];

  catatan: string | null;
  syarat: string | null;

  perusahaan: Perusahaan;
};

/* --------------------------------------------------------------------------
   WARNA & CETAK HITAM PUTIH

   Palet di lib/warna-dokumen (sama dengan kwitansi). SETIAP WARNA HANYA
   PENEKANAN, TIDAK PERNAH SATU-SATUNYA PENANDA: dicetak hitam putih, navy
   menjadi hitam dan krem hampir putih. Judul kelompok tetap dikenali dari
   kolom angkanya yang kosong, baris TOTAL dari hurufnya yang tebal dan
   namanya — bukan dari warnanya. Latar bertahan saat dicetak berkat
   print-color-adjust di app/globals.css.
   -------------------------------------------------------------------------- */

/**
 * Gambar hanya ditampilkan kalau alamatnya berupa tautan penuh.
 *
 * Berkas lama Laravel tersimpan sebagai jalur relatif di disk server itu,
 * yang tidak bisa dijangkau dari sini. Unggahan baru lewat halaman
 * Pengaturan menyimpan tautan penuh, dan itu yang akan tampil.
 */
function tautanGambar(jalur: string | null): string | null {
  if (!jalur) return null;
  return jalur.startsWith("http") ? jalur : null;
}

export function DokumenCetak({ isi }: { isi: IsiDokumen }) {
  const logo = tautanGambar(isi.perusahaan.logo_path);
  const ttd = isi.perusahaan.signature_url;
  // Diringkas sekali di sini, dipakai dua kali di bawah: tanggalnya dan
  // jumlah harinya harus berasal dari daftar yang sama persis.
  const tanggalAcara = ringkasTanggalAcara(isi.acara.tanggal);
  const hariAcara = jumlahHariAcara(isi.acara.tanggal);

  const adaAcara = Boolean(tanggalAcara || isi.acara.venue || isi.acara.tamu || isi.acara.jenis);

  // Sesi (D-041) sebagai JUDUL KELOMPOK di tabel (16 Nov 2026): satu hari bisa punya beberapa sesi di jam berbeda
  // (Coffee Break 09.00, Lunch 12.00, …). Keterangan kecil di bawah tiap menu mudah terlewat; baris judul selebar
  // tabel tiap kali sesinya berganti membuat jelas menu mana milik sesi mana.
  const barisTabel = barisTabelDokumen(isi.baris);
  const nilaiKomp = nilaiComplimentDokumen(isi.baris);
  const daftarSesi = [...new Set(barisTabel.flatMap((b) => (b.jenis === "item" && !b.menjorok && b.sesi ? [b.sesi] : [])))];
  const pakaiJudulSesi = daftarSesi.length > 0;
  /** Per baris: judul sesi yang dibuka baris itu (sesi baru, atau keluar dari sesi), atau null. */
  const judulSesi = barisTabel.map((b, i) => {
    if (!pakaiJudulSesi || b.jenis !== "item" || b.menjorok) return null;
    const lalu = barisTabel.slice(0, i).findLast((x) => x.jenis === "item" && !x.menjorok);
    const sesiLalu = lalu && lalu.jenis === "item" ? lalu.sesi : null;
    if (b.sesi === sesiLalu) return null;
    if (!b.sesi) return "Di luar sesi";
    return daftarSesi.length > 1 ? `Sesi ${daftarSesi.indexOf(b.sesi) + 1} · ${b.sesi}` : b.sesi;
  });
  const tanggalPanjang = (t: Date) => format(t, "d MMMM yyyy", { locale: localeId });

  return (
    <div className="text-[10.5px] leading-[1.45]" style={{ color: TINTA, fontVariantNumeric: "tabular-nums" }}>
      {/* ---------- Kop: logo resmi | jenis dokumen & nomor ---------- */}
      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className="pb-[3.5mm] align-bottom">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={isi.perusahaan.company_name} className="h-[15mm] w-auto" />
              ) : null}
              <div className={`${logo ? "mt-1.5" : ""} text-[11px] font-semibold tracking-[0.04em]`} style={{ color: NAVY }}>
                {isi.perusahaan.company_name}
              </div>
            </td>
            <td className="pb-[3.5mm] text-right align-bottom">
              <div className="text-[30px] leading-none font-bold tracking-[-0.01em]" style={{ color: NAVY }}>
                {isi.judul}
              </div>
              <div className="mt-2 text-[10.5px]" style={{ color: REDUP }}>
                {isi.labelNomor}:{" "}
                <b className="text-[11.5px]" style={{ color: TINTA }}>
                  {isi.nomor}
                </b>
                {isi.revisi && isi.revisi > 0 ? (
                  <span className="ml-1.5 rounded-full px-2 py-[1px] text-[9.5px] font-semibold" style={{ backgroundColor: KREM, color: TINTA }}>
                    Revisi {isi.revisi}
                    {isi.tanggalRevisi ? " · " + format(isi.tanggalRevisi, "dd/MM/yyyy") : ""}
                  </span>
                ) : null}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="h-[1.5px]" style={{ backgroundColor: EMAS }} />

      {/* ---------- Pelanggan · kontak · tanggal dokumen ---------- */}
      <table className="mt-[4mm] w-full border-collapse">
        <tbody>
          <tr className="align-top">
            <td className="w-[44%] pr-[5mm]">
              <Label>Account Name</Label>
              <div className="text-[12.5px] leading-snug font-bold" style={{ color: TINTA }}>
                {isi.pelanggan.nama}
              </div>
              <Label atas>Alamat</Label>
              <div>{isi.pelanggan.alamat || "-"}</div>
            </td>
            <td className="w-[28%] border-l px-[5mm]" style={{ borderColor: GARIS }}>
              <Label>UP - Kepada</Label>
              <div className="font-semibold">{isi.kontak.nama || "-"}</div>
              {isi.kontak.ccNama ? <div>Cc: {isi.kontak.ccNama}</div> : null}
              <Label atas>Phone</Label>
              <div>{isi.kontak.telepon || "-"}</div>
              {isi.kontak.ccTelepon ? <div>Cc: {isi.kontak.ccTelepon}</div> : null}
            </td>
            <td className="w-[28%] border-l pl-[5mm]" style={{ borderColor: GARIS }}>
              <Label>Tanggal</Label>
              <div className="font-semibold">{tanggalPanjang(isi.tanggal)}</div>
              <Label atas>{isi.labelTanggalKedua}</Label>
              <div className="font-semibold">{tanggalPanjang(isi.tanggalKedua)}</div>
              {isi.referensiPo ? (
                <div>
                  <Label atas>Referensi PO</Label>
                  <div className="font-semibold">{isi.referensiPo}</div>
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ---------- Acara ---------- */}
      {adaAcara ? (
        <div className="mt-[4.5mm] rounded-[2.5mm] px-[5mm] py-[3.5mm]" style={{ backgroundColor: KREM }}>
          {isi.acara.jenis ? (
            <div className="mb-2 text-[14px] leading-snug font-bold" style={{ color: NAVY }}>
              {isi.acara.jenis}
            </div>
          ) : null}
          <table className="w-full border-collapse">
            <tbody>
              <tr className="align-top">
                <td className="w-[44%] pr-[4mm]">
                  <Label>Tanggal Acara</Label>
                  <div className="font-semibold">
                    {tanggalAcara ?? "-"}
                    {hariAcara > 1 ? <span style={{ color: REDUP }}> · {hariAcara} hari</span> : null}
                  </div>
                </td>
                <td className="w-[18%] pr-[4mm]">
                  <Label>Jumlah Hari</Label>
                  <div className="font-semibold">{hariAcara > 0 ? hariAcara : "-"}</div>
                </td>
                <td className="w-[18%] pr-[4mm]">
                  <Label>Jumlah Tamu</Label>
                  <div className="font-semibold">{isi.acara.tamu ?? "-"}</div>
                </td>
                <td className="w-[20%]">
                  <Label>Jam</Label>
                  <div className="font-semibold">{isi.acara.jam || "-"}</div>
                </td>
              </tr>
              <tr className="align-top">
                <td className="pt-2 pr-[4mm]" colSpan={3}>
                  <Label>{isi.acara.pesanan === "retail" ? "Alamat Kirim" : "Lokasi"}</Label>
                  <div className="font-semibold">{isi.acara.venue || "-"}</div>
                </td>
                <td className="pt-2">
                  <Label>F&amp;B Planner</Label>
                  <div className="font-semibold">{isi.acara.planner || "-"}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      {/* ---------- Rincian ---------- */}
      {/* Garis tabel (Rama, 16 Nov): horizontal jelas antar baris, vertikal setengah tebal & lebih muda, bingkai luar. */}
      {/* Lebar dikurangi 2px & digeser 1px: dengan border-collapse setengah garis tepi jatuh DI LUAR kotak tabel,
          dan saat dicetak Chrome memotong di tepi area cetak — bingkai kanan hilang, tabel terlihat "bolong"
          (Rama, 16 Nov). Setengah piksel tidak cukup karena pembulatan piksel di tepi kanan. */}
      <table
        className="mt-[5mm] border-collapse"
        style={{ border: `1px solid ${GARIS_BARIS}`, width: "calc(100% - 2px)", marginLeft: "1px" }}
      >
        <thead>
          <tr style={{ backgroundColor: KREM, borderBottom: `1.5px solid ${NAVY}` }}>
            <Th lebar="6%">No</Th>
            <Th>Deskripsi</Th>
            <Th lebar="6%" tengah>
              Day
            </Th>
            <Th lebar="6%" tengah>
              Qty
            </Th>
            <Th lebar="6%" tengah>
              Pax
            </Th>
            <Th lebar="9%">Vol.</Th>
            <Th lebar="14%" kanan>
              Harga Satuan
            </Th>
            <Th lebar="15%" kanan>
              Total
            </Th>
          </tr>
        </thead>
        <tbody>
          {/* Susunan barisnya ada di lib/baris-cetak.ts, dipakai bersama
              dengan unduhan Excel dokumen ini. Yang di sini hanya
              menggambarnya. */}
          {barisTabel.map((b, i) => {
            const judul = judulSesi[i];
            const baris =
            b.jenis === "totalKelompok" ? (
              <tr key={b.kunci} className="break-inside-avoid font-bold" style={{ borderTop: `1px solid ${GARIS_BARIS}` }}>
                <td className="px-2 py-1.5 text-right text-[10px] font-semibold" colSpan={7} style={{ color: REDUP, backgroundColor: "#fbf9f4" }}>
                  {b.label}
                </td>
                <td className="px-2 py-1.5 text-right" style={{ borderLeft: `0.5px solid ${GARIS_KOLOM}`, backgroundColor: "#fbf9f4" }}>
                  {b.nilai}
                </td>
              </tr>
            ) : (
              <tr
                key={b.kunci}
                className="break-inside-avoid"
                // Judul kelompok (mis. STARTER, MAIN COURSE di dalam buffet) polos: dikenali dari kolom angkanya
                // yang kosong. Latar krem di sini dulu membuat blok berat setinggi isi menunya.
                style={{ borderTop: `1px solid ${GARIS_BARIS}` }}
              >
                <Td>
                  <span className="font-semibold" style={{ color: REDUP }}>
                    {b.nomor}
                  </span>
                </Td>
                <Td>
                  {b.menjorok ? (
                    <span className="ml-3">{b.nama}</span>
                  ) : (
                    <span className="text-[11px] font-bold" style={{ color: NAVY }}>
                      {b.nama}
                    </span>
                  )}
                  {b.sesi && !pakaiJudulSesi ? (
                    <div className="mt-0.5 text-[9.5px] font-medium" style={{ color: REDUP }}>
                      {b.sesi}
                    </div>
                  ) : null}
                  {b.rincian.length > 0 ? (
                    <div className="mt-1">
                      {/* Jumlah dan pax-nya ikut digambar sebagai keterangan —
                          isi paket tidak berharga dan tidak punya total
                          (D-106). Isinya hitam (dibaca baris demi baris), nomornya redup. */}
                      {b.rincian.map((r, k) => (
                        // Indentasi gantung (D-163): baris kedua sejajar huruf pertama, bukan nomornya.
                        // Kunci = urutan + nama: isi bernama kembar ("Kerupuk" di Lunch & Dinner) boleh muncul dua kali.
                        <div key={`${k}-${r.nama}`} className="ml-2.5 flex gap-1.5 text-[10px] leading-[1.5]">
                          <span className="w-3.5 shrink-0 text-right" style={{ color: REDUP }}>
                            {k + 1}.
                          </span>
                          <span>
                            {namaIsiBersih(r.nama)}
                            {r.keterangan ? (
                              <span className="ml-1" style={{ color: REDUP }}>
                                ({r.keterangan})
                              </span>
                            ) : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Td>
                <Td tengah>{b.hari}</Td>
                <Td tengah>{b.qty}</Td>
                <Td tengah>{b.pax}</Td>
                <Td>{b.satuan}</Td>
                <Td kanan>{b.harga}</Td>
                <Td kanan>
                  <span className="font-semibold">{b.nilai}</span>
                </Td>
              </tr>
            );
            return judul ? (
              <Fragment key={`sesi-${b.kunci}`}>
                {/* break-after-avoid: judul sesi tidak tertinggal sendirian di dasar halaman. */}
                <tr className="break-after-avoid break-inside-avoid" style={{ borderTop: `1.5px solid ${NAVY}`, backgroundColor: KREM }}>
                  <td colSpan={8} className="px-2 py-1.5 text-[10.5px] font-bold" style={{ color: NAVY }}>
                    {judul}
                  </td>
                </tr>
                {baris}
              </Fragment>
            ) : (
              baris
            );
          })}
        </tbody>
      </table>

      {/* ---------- Ringkasan total (kanan) ---------- */}
      <div className="mt-[1mm] flex break-inside-avoid justify-end">
        <div className="w-[96mm]">
        {/* border-separate + jarak 0: dengan border-collapse, sel berlatar navy menyisakan garis putih tipis di tengah pita. */}
        <table className="mt-[2.5mm] w-full border-separate border-spacing-0">
          <tbody>
            {barisTotalDokumen(isi).map((b) => (
              <TrTotal key={b.kunci} label={b.label} nilai={b.nilai} akhir={b.akhir} />
            ))}
            {isi.pembayaran?.length ? (
              <>
                {isi.pembayaran.map((p) => (
                  <tr key={p.nomor}>
                    <td className="px-3 pt-2 pb-0.5" style={{ color: REDUP }}>
                      Pembayaran diterima {format(p.tanggal, "d MMM yyyy", { locale: localeId })}
                    </td>
                    <td className="px-3 pt-2 pb-0.5 text-right">− {rupiah(p.jumlah)}</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td colSpan={2} className="pt-1">
                    <div className="flex items-baseline justify-between rounded-[1.5mm] px-3 py-1.5" style={{ backgroundColor: KREM }}>
                      <span className="text-[11px]">SISA TAGIHAN</span>
                      <span className="text-[12px]">{rupiah(isi.pembayaran.reduce((s, p) => s.minus(d(p.jumlah)), d(isi.grand_total)))}</span>
                    </div>
                  </td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
        {/* Compliment (D-197): keterangan di luar daftar penjumlahan, supaya Sub Total + pungutan = TOTAL tetap bisa dicocokkan. */}
        {nilaiKomp.gt(0) ? (
          <p className="mt-[1.5mm] px-3 text-right text-[10px] leading-snug" style={{ color: REDUP }}>
            Termasuk compliment senilai <b className="font-semibold" style={{ color: TINTA }}>{rupiah(nilaiKomp)}</b> — tidak ditagihkan.
          </p>
        ) : null}
        </div>
      </div>

      {isi.catatan ? (
        <div className="mt-[4mm] break-inside-avoid">
          <JudulBagian>Catatan</JudulBagian>
          <p className="whitespace-pre-line">{isi.catatan}</p>
        </div>
      ) : null}

      {isi.syarat ? (
        <div className="mt-[5mm]">
          <JudulBagian>Syarat &amp; Ketentuan / Termin Pembayaran</JudulBagian>
          <div className="text-[10px] leading-[1.5]">
            <TeksSyarat teks={isi.syarat} />
          </div>
        </div>
      ) : null}

      {/* Keterangan pembayaran — satu-satunya bagian yang harus dibaca dan
          disalin dengan tepat oleh penerimanya. Bank, nomor, dan nama
          pemiliknya disorot MERAH (permintaan pemilik), dan setiap barisnya
          tetap terbaca utuh tanpa warna, untuk yang mencetak hitam putih. */}
      {isi.perusahaan.bank_name ? (
        <div
          className="mt-[5mm] break-inside-avoid rounded-[2.5mm] border px-[5mm] py-[3mm] text-center text-[10.5px] leading-[1.6] font-semibold"
          style={{ borderColor: GARIS, backgroundColor: "#fbf9f4" }}
        >
          <div>
            Pembayaran via transfer ke Rekening BARU: <span className="font-bold text-[#b42318]">{isi.perusahaan.bank_name}</span>
          </div>

          {isi.perusahaan.bank_account_number ? (
            <div>
              Account number: <span className="text-[12px] font-bold tracking-[0.02em] text-[#b42318]">{isi.perusahaan.bank_account_number}</span>
              {isi.perusahaan.bank_account_holder ? (
                <>
                  {" "}
                  atas nama pemilik rekening: <span className="font-bold text-[#b42318]">{isi.perusahaan.bank_account_holder}</span>
                </>
              ) : null}
            </div>
          ) : null}

          {isi.perusahaan.bank_code || isi.perusahaan.swift_code ? (
            <div className="font-medium" style={{ color: REDUP }}>
              {isi.perusahaan.bank_code ? <>Bank Code: {isi.perusahaan.bank_code}</> : null}
              {isi.perusahaan.bank_code && isi.perusahaan.swift_code ? "; " : null}
              {isi.perusahaan.swift_code ? <>Swift Code: {isi.perusahaan.swift_code}</> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------- Tanda tangan ---------- */}
      <table className="mt-[8mm] w-full break-inside-avoid border-collapse">
        <tbody>
          <tr className="align-top">
            <td className="w-1/2 pr-[10mm]">
              <div style={{ color: REDUP }}>Hormat Kami,</div>
              {ttd ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ttd} alt="" className="my-1 h-[17mm] w-auto mix-blend-multiply" />
              ) : (
                <div className="h-[19mm]" />
              )}
              <div className="w-[62mm] border-t pt-1.5" style={{ borderColor: TINTA }}>
                <div className="text-[11px] font-bold">{isi.perusahaan.signature_name || isi.perusahaan.company_name}</div>
                <div style={{ color: REDUP }}>{isi.perusahaan.company_name}</div>
              </div>
            </td>
            <td className="w-1/2 pl-[10mm]">
              <div style={{ color: REDUP }}>Persetujuan Klien,</div>
              <div className="h-[19mm]" />
              <div className="w-[62mm] border-t pt-1.5" style={{ borderColor: TINTA }}>
                <div className="text-[11px] font-bold">{isi.pelanggan.nama}</div>
                <div style={{ color: REDUP }}>Nama, tanda tangan &amp; stempel</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------------- */

/** Label kecil di atas isian (tanpa huruf kapital semua, tanpa titik dua). */
function Label({ children, atas }: { children: React.ReactNode; atas?: boolean }) {
  return (
    <div className={`text-[9.5px] font-medium ${atas ? "mt-2" : ""}`} style={{ color: REDUP }}>
      {children}
    </div>
  );
}

function JudulBagian({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 border-b pb-1 text-[11px] font-bold" style={{ color: NAVY, borderColor: GARIS }}>
      {children}
    </div>
  );
}

function Th({
  children,
  lebar,
  kanan,
  tengah,
}: {
  children: React.ReactNode;
  lebar?: string;
  kanan?: boolean;
  tengah?: boolean;
}) {
  return (
    <th
      className={`px-2 py-1.5 align-bottom text-[9.5px] font-semibold ${kanan ? "text-right" : tengah ? "text-center" : "text-left"}`}
      style={{ width: lebar, color: NAVY, borderLeft: `0.5px solid ${GARIS_KOLOM}` }}
    >
      {children}
    </th>
  );
}

function Td({ children, kanan, tengah }: { children?: React.ReactNode; kanan?: boolean; tengah?: boolean }) {
  return (
    <td
      className={`px-2 py-[2mm] align-top ${kanan ? "text-right" : tengah ? "text-center" : "text-left"}`}
      style={{ borderLeft: `0.5px solid ${GARIS_KOLOM}` }}
    >
      {children}
    </td>
  );
}

/**
 * Satu baris pada ringkasan total.
 *
 * `akhir` menandai baris TOTAL — pita navy berhuruf putih, besar dan tebal.
 * Dicetak hitam putih ia menjadi pita gelap; hurufnya tetap tebal dan
 * bernama TOTAL, jadi tetap dikenali tanpa warnanya.
 */
function TrTotal({ label, nilai, akhir }: { label: string; nilai: string; akhir?: boolean }) {
  if (akhir) {
    // Satu sel utuh: dua sel berlatar navy berdampingan menyisakan garis putih tipis di tengah pita.
    return (
      <tr className="break-inside-avoid font-bold">
        <td colSpan={2} className="pt-1">
          <div className="flex items-baseline justify-between rounded-[1.5mm] px-3 py-2 text-white" style={{ backgroundColor: NAVY }}>
            <span className="text-[11px] tracking-[0.06em]">{label}</span>
            <span className="text-[14px]">{nilai}</span>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr className="break-inside-avoid">
      <td className="px-3 py-[1.2mm]" style={{ color: REDUP, borderBottom: `0.5px solid ${GARIS}` }}>
        {label}
      </td>
      <td className="px-3 py-[1.2mm] text-right font-semibold" style={{ borderBottom: `0.5px solid ${GARIS}` }}>
        {nilai}
      </td>
    </tr>
  );
}
