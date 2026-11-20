"use client";

import { Eye } from "lucide-react";
import { useState } from "react";

import { DokumenCetak, type IsiDokumen, type Perusahaan } from "@/components/dokumen-cetak";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { BarisTanggalForm } from "@/lib/bentuk-form";
import { labelSesi } from "@/lib/sesi";
import { subtotalBaris, uraikanRupiah, type HasilTotal } from "@/lib/uang";

/* ==========================================================================
   PRATINJAU DOKUMEN SEBELUM DISIMPAN (D-080)

   Dulu tampilan cetak baru bisa dilihat sesudah quotation/invoice disimpan —
   salah ketik baru ketahuan di akhir, lalu harus bolak-balik ubah-simpan-cetak
   (keluhan Rama). Pratinjau ini menggambar DokumenCetak yang SAMA dengan
   halaman cetak, dari isian form yang sedang diketik, dengan total dari
   hitungTotalDokumen yang sama dengan ringkasan form.
   ========================================================================== */

/** Kop perusahaan + tanda tangan per penandatangan ("" = bawaan), disiapkan server. */
export type KopPratinjau = {
  judul: "Quotation" | "Invoice";
  /** Nomor dokumen yang sedang diubah; null = dokumen baru (nomor dibuat saat disimpan). */
  nomor: string | null;
  perusahaan: Omit<Perusahaan, "signature_url" | "signature_name">;
  ttd: Record<string, { nama: string | null; tautan: string | null }>;
};

/** Bagian isian form yang dibutuhkan pratinjau (sebagian dari IsiAwal di form-dokumen). */
export type IsianPratinjau = {
  customer_id: string;
  contact_person: string;
  contact_phone: string;
  contact_cc_name?: string;
  contact_cc_phone?: string;
  tanggal: string;
  tanggal_akhir: string;
  event_dates: BarisTanggalForm[];
  event_type: string;
  event_time: string;
  guest_count: string;
  fnb_planner: string;
  venue: string;
  order_type?: string;
  notes: string;
  service_charge_percent: string;
  service_charge_minimum: string;
  service_charge_flat?: string;
  service_charge_label?: string;
  pb1_enabled: boolean;
  pb1_percent: string;
  ppn_percent?: string;
  signatory_id: string;
  po_reference: string;
  show_payment_terms: boolean;
  payment_terms: string;
  biaya_tambahan: { kunci: string; label: string; amount: string }[];
  items: {
    kunci: string;
    item_name: string;
    unit: string;
    day: string;
    qty: string;
    pax: string;
    price: string;
    is_compliment: boolean;
    catatan?: string;
    jenis?: "alat";
    sesi_tanggal?: string;
    sesi_jenis?: string;
    sesi_jam?: string;
    children: { kunci: string; item_name: string; unit: string; day: string; qty: string; pax: string; price: string; catatan?: string }[];
  }[];
};

const tgl = (t: string) => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T00:00:00Z`) : null);
const teks = (v: unknown) => (uraikanRupiah(v) ?? 0).toString();
const paks = (v: string) => {
  const n = uraikanRupiah(v);
  return n && n.gt(0) ? n.toNumber() : null;
};

/** Isi dokumen dari isian form — bentuknya sama dengan lib/isi-dokumen.ts milik halaman cetak. */
export function isiPratinjau(
  f: IsianPratinjau,
  total: HasilTotal,
  kop: KopPratinjau,
  pelanggan: { id: string; nama: string; alamat?: string | null }[],
): IsiDokumen {
  const p = pelanggan.find((x) => x.id === f.customer_id);
  const ttd = kop.ttd[f.signatory_id] ?? kop.ttd[""] ?? { nama: null, tautan: null };
  const hariIni = new Date();
  const invoice = kop.judul === "Invoice";
  return {
    judul: kop.judul,
    labelNomor: invoice ? "No. Invoice" : "No. Quotation",
    nomor: kop.nomor ?? "(dibuat saat disimpan)",
    referensiPo: invoice ? f.po_reference.trim() || null : null,
    tanggal: tgl(f.tanggal) ?? hariIni,
    labelTanggalKedua: invoice ? "Jatuh Tempo" : "Berlaku s/d",
    tanggalKedua: tgl(f.tanggal_akhir) ?? hariIni,
    pelanggan: { nama: p?.nama ?? "(customer belum dipilih)", alamat: p?.alamat ?? null },
    kontak: {
      nama: f.contact_person.trim() || null,
      telepon: f.contact_phone.trim() || null,
      ccNama: f.contact_cc_name?.trim() || null,
      ccTelepon: f.contact_cc_phone?.trim() || null,
    },
    acara: {
      tanggal: [...new Set(f.event_dates.map((b) => b.tanggal))].map(tgl).filter((t): t is Date => t !== null).sort((a, b) => a.getTime() - b.getTime()),
      tamu: paks(f.guest_count),
      planner: f.fnb_planner.trim() || null,
      jam: f.event_time.trim() || null,
      venue: f.venue.trim() || null,
      jenis: f.event_type.trim() || null,
      pesanan: f.order_type || null,
    },
    baris: f.items
      .filter((b) => b.item_name.trim() !== "")
      .map((b) => {
        const nilai = (x: { day: string; qty: string; pax: string; price: string }) =>
          subtotalBaris({ day: teks(x.day || "1"), qty: teks(x.qty), pax: paks(x.pax), price: teks(x.price), is_compliment: b.is_compliment }).toString();
        return {
          id: b.kunci,
          item_name: b.item_name,
          unit: b.unit || null,
          day: teks(b.day || "1"),
          qty: teks(b.qty),
          pax: paks(b.pax),
          price: teks(b.price),
          subtotal: nilai(b),
          is_compliment: b.is_compliment,
          catatan: b.catatan?.trim() || null,
          jenis: b.jenis === "alat" ? ("alat" as const) : ("menu" as const),
          sesi: labelSesi({ tanggal: b.sesi_tanggal || null, jenis: b.sesi_jenis || null, jam: b.sesi_jam || null }),
          // Anak tanpa hari sendiri mengikuti hari induknya (sama dengan form & simpan).
          anak: b.children
            .filter((a) => a.item_name.trim() !== "")
            .map((a) => {
              const hari = a.day || b.day || "1";
              return {
                id: a.kunci,
                item_name: a.item_name,
                unit: a.unit || null,
                day: teks(hari),
                qty: teks(a.qty),
                pax: paks(a.pax),
                price: teks(a.price),
                subtotal: nilai({ ...a, day: hari }),
                catatan: a.catatan?.trim() || null,
              };
            }),
        };
      }),
    subtotal: total.subtotal.toString(),
    service_charge_percent: f.service_charge_percent || null,
    service_charge_minimum: f.service_charge_minimum ? teks(f.service_charge_minimum) : null,
    service_charge_label: f.service_charge_flat?.trim() ? f.service_charge_label?.trim() || null : null,
    service_charge_amount: total.service_charge_amount.toString(),
    pb1_enabled: f.pb1_enabled,
    pb1_percent: f.pb1_percent || "10",
    pb1_amount: total.pb1_amount.toString(),
    ppn_percent: total.ppn_amount.gt(0) ? f.ppn_percent || null : null,
    ppn_amount: total.ppn_amount.toString(),
    delivery_amount: total.delivery_amount.toString(),
    biaya_tambahan: f.biaya_tambahan
      .filter((b) => b.label.trim() !== "" || (uraikanRupiah(b.amount) ?? 0).toString() !== "0")
      .map((b) => ({ id: b.kunci, label: b.label, amount: teks(b.amount) })),
    grand_total: total.grand_total.toString(),
    catatan: f.notes.trim() || null,
    syarat: f.show_payment_terms ? f.payment_terms : null,
    perusahaan: { ...kop.perusahaan, signature_url: ttd.tautan, signature_name: ttd.nama },
  };
}

/** Tombol "Pratinjau" + dokumen layar penuh. Isian form tidak berubah; tutup lalu lanjut mengetik. */
export function TombolPratinjau({ isi, className, ringkas = false }: { isi: () => IsiDokumen; className?: string; ringkas?: boolean }) {
  const [buka, setBuka] = useState(false);
  // Lembar A4 (210 mm ≈ 794 px) diperkecil supaya utuh selebar layar HP, bukan digeser ke samping.
  const [skala, setSkala] = useState(1);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => {
          setSkala(Math.min(1, (window.innerWidth - 32) / 794));
          setBuka(true);
        }}
      >
        <Eye className="size-4" />
        {/* ringkas: di HP cukup ikon (label tetap dibacakan), di layar lebar dengan teks. */}
        <span className={ringkas ? "sr-only sm:not-sr-only" : undefined}>Pratinjau</span>
      </Button>
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent lembarHp={false} className="top-0 left-0 flex h-dvh max-h-none w-screen sm:max-h-none max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-muted p-0 sm:max-w-none">
          <div className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3 pr-14">
            <div className="min-w-0 flex-1">
              <DialogTitle>Pratinjau dokumen</DialogTitle>
              <DialogDescription className="hidden sm:block">Belum tersimpan — begini tampilannya saat dicetak. Tutup untuk lanjut mengisi.</DialogDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => setBuka(false)}>
              Kembali ke form
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {buka ? (
              <article className="mx-auto w-[210mm] max-w-none rounded-lg border bg-white p-[12mm] text-black shadow-sm" style={{ zoom: skala }}>
                <DokumenCetak isi={isi()} nilaiCompliment />
              </article>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
