"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Calculator,
  Check,
  CircleAlert,
  CircleCheck,
  Copy,
  CornerDownRight,
  LoaderCircle,
  MoreHorizontal,
  PartyPopper,
  Redo2,
  Plus,
  Trash2,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { PilihCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type BarisTanggalForm, tanggalKosong } from "@/lib/bentuk-form";
import { labelPelanggan } from "@/lib/kontak";
import { jumlahHariAcara } from "@/lib/tanggal";
import { usulanPembulatan } from "@/lib/hitung/quotation";
import { ISTILAH, JENIS_PESANAN, labelPpn } from "@/lib/istilah";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";
import { JENIS_SESI, tanggalSesiPendek } from "@/lib/sesi";
import { type BagianSyarat, type JenisPesanan, rakitSyarat, tebakJenisPesanan } from "@/lib/syarat";
import { d, hitungTotalDokumen, rupiah, subtotalBaris, uraikanRupiah } from "@/lib/uang";

import type { KeadaanDokumen } from "@/lib/dokumen";
import { ChipCepat, InputSaran } from "@/components/input-saran";
import { PilihTanggal } from "@/components/pilih-tanggal";
import { BIAYA_UMUM, JENIS_ACARA_UMUM, rapikanRupiah, SATUAN_UMUM, type SaranDokumen } from "@/lib/saran-dokumen";
import { bacaPilihan, kategoriKurang, susunIsi, togglePilihan, type SlotPaket } from "@/lib/slot-paket";
import { cn } from "@/lib/utils";
import { PilihRentangJam } from "@/components/pilih-jam";
import { isiPratinjau, TombolPratinjau, type KopPratinjau } from "@/components/pratinjau-dokumen";

export type PilihanPelanggan = {
  id: string;
  nama: string;
  kode: string;
  contact_person: string | null;
  phone: string | null;
  /** Untuk pratinjau dokumen (D-080). */
  alamat?: string | null;
};

export type PilihanPenandatangan = { id: string; nama: string };

export type PilihanProduk = {
  id: string;
  nama: string;
  unit: string;
  harga: string;
};

/** Paket siap pakai untuk "Tambah dari paket" (isi = nama menu, tanpa biaya). */
export type PilihanPaket = {
  id: string;
  kode: string;
  nama: string;
  lini: string | null;
  harga: string;
  satuan: string;
  /** Penyajian buffet/stall → masuk dasar layanan perlengkapan; box tidak. */
  kenaLayanan: boolean;
  isi: { id: string; nama: string }[];
  /** Paket pilihan per kategori (D-082): buffet, coffee break, wedding. */
  slot: SlotPaket[];
};

/** Menu untuk "Tukar" isi paket (kategori sama, D-040). Tanpa HPP. */
export type PilihanMenu = { id: string; nama: string; kategori: string | null };

/** Tombol zona: mengisi persen & minimum layanan dan saran Delivery Fee (dari Angka Bisnis). */
export type AturanZona = { kunci: string; label: string; pct: number; min: number; delivery: number | null };

export type IsiAwal = {
  id?: string;
  /** Lead asal (D-047) — quotation baru ditautkan ke lead setelah disimpan. */
  lead_id?: string;
  customer_id: string;
  contact_person: string;
  contact_phone: string;
  tanggal: string;
  tanggal_akhir: string;
  event_dates: BarisTanggalForm[];
  event_type: string;
  event_time: string;
  guest_count: string;
  fnb_planner: string;
  venue: string;
  /** Jenis pesanan (D-070): "" = belum dipilih (dokumen lama). */
  order_type?: "" | "event" | "retail";
  notes: string;
  service_charge_percent: string;
  /** Minimum layanan perlengkapan (Rp). Kosong = tanpa minimum. */
  service_charge_minimum: string;
  delivery_amount: string;
  biaya_tambahan: BarisTambahanForm[];
  pb1_enabled: boolean;
  pb1_percent: string;
  /** Persen PPN baris sewa alat (Angka Bisnis / dokumen tersimpan). */
  ppn_percent?: string;
  signatory_id: string;
  /** Nomor PO customer. Hanya dipakai invoice. */
  po_reference: string;
  show_payment_terms: boolean;
  payment_terms: string;
  items: BarisForm[];
};

export type BarisForm = {
  kunci: string;
  product_id: string;
  /** Paket asal baris (dari "Tambah dari paket") — dasar HPP & penanda untung (D-038). */
  package_id?: string;
  /** Berapa hari baris ini disajikan. Kosong berarti satu. */
  day: string;
  item_name: string;
  unit: string;
  qty: string;
  /**
   * Berapa orang yang dilayani baris ini. Kosong berarti tidak diisi, dan
   * lembar dapur menghitungnya sendiri dari hari dikali jumlah.
   *
   * TIDAK PERNAH ikut menghitung uang — lihat lib/dokumen.ts.
   */
  pax: string;
  price: string;
  is_compliment: boolean;
  charge_service: boolean;
  charge_pb1: boolean;
  /** Sewa alat: kena PPN, bukan PBJT/layanan (D-039). */
  charge_ppn?: boolean;
  /** Sesi per hari (D-041): "2026-10-20", "Lunch", "11.00–13.00". */
  sesi_tanggal?: string;
  sesi_jenis?: string;
  sesi_jam?: string;
  children: {
    kunci: string;
    item_name: string;
    /** Kosong berarti mengikuti hari induknya. */
    day: string;
    unit: string;
    qty: string;
    pax: string;
    price: string;
    /** Menu yang disajikan & menu asli paket bila ditukar (D-040). */
    menu_id?: string;
    swapped_from_menu_id?: string;
  }[];
};

/**
 * Satu baris biaya tambahan bernama, di luar service charge dan PB1 —
 * "Tim Servis utk Menu Buffet (1 orang)", "Tambahan Set-up & Layanan 1 Titik
 * VIP Buffet", dan seterusnya.
 */
export type BarisTambahanForm = {
  kunci: string;
  label: string;
  amount: string;
};

export function tambahanKosong(): BarisTambahanForm {
  return { kunci: crypto.randomUUID(), label: "", amount: "" };
}

export function barisKosong(): BarisForm {
  return {
    kunci: crypto.randomUUID(),
    product_id: "",
    item_name: "",
    unit: "",
    day: "1",
    qty: "1",
    pax: "",
    price: "",
    is_compliment: false,
    charge_service: true,
    charge_pb1: true,
    children: [],
  };
}

const keadaanAwal: KeadaanDokumen = {};

/**
 * Kata-kata yang berbeda antara penawaran dan tagihan. Selain ini, kedua
 * formulir memang benar-benar sama — struktur item, service charge, PB1,
 * dan syarat pembayarannya identik.
 */
export type IstilahDokumen = {
  /** "penawaran" atau "tagihan" — dipakai di dalam kalimat. */
  kata: string;
  labelTanggal: string;
  labelTanggalAkhir: string;
  tombolSimpan: string;
  batalHref: string;
};

export function FormDokumen({
  isiAwal,
  pelanggan,
  produk,
  penandatangan,
  aksi,
  istilah,
  medanTambahan,
  pakaiReferensiPo = false,
  paket = [],
  menu = [],
  syarat = [],
  aturanZona = [],
  saran = SARAN_KOSONG,
  kop,
}: {
  isiAwal: IsiAwal;
  pelanggan: PilihanPelanggan[];
  produk: PilihanProduk[];
  penandatangan: PilihanPenandatangan[];
  aksi: (
    sebelumnya: KeadaanDokumen,
    data: FormData,
  ) => Promise<KeadaanDokumen>;
  istilah: IstilahDokumen;
  /** Nilai tersembunyi yang ikut terkirim, misalnya asal penawaran. */
  medanTambahan?: Record<string, string>;
  /**
   * Memunculkan isian referensi PO.
   *
   * Disebut terang-terangan oleh halamannya, bukan ditebak dari istilah
   * dokumennya: menebaknya dari kata "invoice" akan diam-diam salah begitu
   * istilahnya berubah, dan kolomnya memang hanya ada di tabel invoices.
   */
  pakaiReferensiPo?: boolean;
  paket?: PilihanPaket[];
  /** Menu untuk tombol "Tukar" isi paket (kategori sama). */
  menu?: PilihanMenu[];
  /** Bagian S&K untuk tombol "Isi S&K standar" (D-043). */
  syarat?: BagianSyarat[];
  aturanZona?: AturanZona[];
  /** Saran isian (D-069) dari data yang pernah dipakai. */
  saran?: SaranDokumen;
  /** Kop & tanda tangan untuk tombol Pratinjau (D-080). Tanpa ini tombolnya tidak tampil. */
  kop?: KopPratinjau;
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(aksi, keadaanAwal);

  // Formulir tidak pernah dibuka dalam keadaan tanpa baris sama sekali —
  // baris kosong pertama disiapkan di sini supaya halaman baru langsung
  // bisa diketik tanpa menekan "Tambah baris" lebih dulu.
  const [f, setF] = useState<IsiAwal>(() => ({
    ...isiAwal,
    // Dokumen lama tanpa jenis pesanan (D-070): ditebak dari barisnya — ada baris
    // kena layanan = event, selain itu retail. Dokumen baru wajib dipilih.
    order_type: isiAwal.order_type || (isiAwal.items.length ? (isiAwal.items.some((b) => b.charge_service) ? "event" : "retail") : ""),
    items: isiAwal.items.length > 0 ? isiAwal.items : [barisKosong()],
  }));
  const jenis = f.order_type ?? "";
  const retail = jenis === "retail";

  /* ---------- Urungkan / ulangi untuk Menu & harga (D-070) ----------
     Riwayat daftar baris. Ketikan beruntun (<1,2 dtk) digabung jadi satu
     langkah; aksi (hapus, tukar, tambah, pindah) selalu langkah sendiri. */
  const [riwayat, setRiwayat] = useState<{ lalu: BarisForm[][]; depan: BarisForm[][]; waktu: number }>({ lalu: [], depan: [], waktu: 0 });
  function catat(gabung = false) {
    const kini = waktuSekarang();
    setRiwayat((r) => (gabung && kini - r.waktu < 1200 ? { ...r, waktu: kini } : { lalu: [...r.lalu.slice(-59), f.items], depan: [], waktu: gabung ? kini : 0 }));
  }
  function urungkan() {
    const sebelum = riwayat.lalu[riwayat.lalu.length - 1];
    if (!sebelum) return;
    setRiwayat({ lalu: riwayat.lalu.slice(0, -1), depan: [f.items, ...riwayat.depan], waktu: 0 });
    setF((lama) => ({ ...lama, items: sebelum }));
  }
  function ulangi() {
    const sesudah = riwayat.depan[0];
    if (!sesudah) return;
    setRiwayat({ lalu: [...riwayat.lalu, f.items], depan: riwayat.depan.slice(1), waktu: 0 });
    setF((lama) => ({ ...lama, items: sesudah }));
  }
  // Toast & pintasan keyboard memanggil versi terbaru (bukan salinan saat toast dibuat).
  const urungkanRef = useRef(urungkan);
  const ulangiRef = useRef(ulangi);
  useEffect(() => {
    urungkanRef.current = urungkan;
    ulangiRef.current = ulangi;
  });
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!(e.metaKey || e.ctrlKey) || (k !== "z" && k !== "y")) return;
      const el = document.activeElement as HTMLElement | null;
      // Di dalam kotak isian, ⌘Z bawaan browser mengurungkan ketikan.
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) ulangiRef.current();
      else urungkanRef.current();
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);
  const beritahu = (teks: string) => toast(teks, { action: { label: "Batalkan", onClick: () => urungkanRef.current() } });
  function pilihJenis(j: "event" | "retail") {
    const adaLayanan = f.items.some((b) => b.charge_service) || Boolean(f.service_charge_percent.trim());
    if (j === "retail") catat();
    setF((lama) => ({
      ...lama,
      order_type: j,
      // Retail = dibuat & dikirim, tanpa set-up → layanan perlengkapan tidak berlaku.
      ...(j === "retail" ? { service_charge_percent: "", service_charge_minimum: "", items: lama.items.map((b) => ({ ...b, charge_service: false })) } : {}),
    }));
    if (j === "retail" && adaLayanan) toast.info("Layanan perlengkapan dimatikan: pesanan retail tanpa set-up buffet/stall.");
  }

  function ubah<K extends keyof IsiAwal>(kunci: K, nilai: IsiAwal[K]) {
    setF((lama) => ({ ...lama, [kunci]: nilai }));
  }

  /** aksi: undefined = ketikan (digabung), "" = aksi tanpa notifikasi, teks = aksi + notifikasi "Batalkan". */
  function ubahBaris(index: number, perubahan: Partial<BarisForm>, aksi?: string) {
    catat(aksi === undefined);
    setF((lama) => ({
      ...lama,
      items: lama.items.map((b, i) => (i === index ? { ...b, ...perubahan } : b)),
    }));
    if (aksi) beritahu(aksi);
  }

  function ubahTanggal(index: number, tanggal: string) {
    setF((lama) => ({
      ...lama,
      event_dates: lama.event_dates.map((b, i) => (i === index ? { ...b, tanggal } : b)),
    }));
  }

  function ubahTambahan(index: number, perubahan: Partial<BarisTambahanForm>) {
    setF((lama) => ({
      ...lama,
      biaya_tambahan: lama.biaya_tambahan.map((b, i) =>
        i === index ? { ...b, ...perubahan } : b,
      ),
    }));
  }

  function pilihProduk(index: number, idProduk: string) {
    const p = produk.find((x) => x.id === idProduk);
    ubahBaris(index, {
      product_id: idProduk,
      ...(p
        ? {
            item_name: p.nama,
            unit: p.unit,
            price: Number(p.harga).toLocaleString("id-ID"),
          }
        : {}),
    });
  }

  // Total dihitung ulang setiap ketikan memakai rumus yang sama persis dengan
  // yang dipakai server. Angka ini hanya untuk dilihat — yang disimpan tetap
  // hasil hitungan server.
  const opsiPelanggan = useMemo(
    () => pelanggan.map((p) => ({ id: p.id, label: labelPelanggan({ nama: p.nama, kode: p.kode, pic: p.contact_person }) })),
    [pelanggan],
  );

  function pilihPelanggan(idBaru: string) {
    const dipilih = pelanggan.find((x) => x.id === idBaru);

    setF((lama) => {
      const sebelumnya = pelanggan.find((x) => x.id === lama.customer_id);

      /* Mengganti customer harus ikut mengganti kontaknya —
         sebelumnya tidak, karena kolomnya hanya diisi kalau masih
         kosong, sehingga kontak customer PERTAMA menempel terus.
         Tetapi ketikan sendiri juga tidak boleh hilang: sebuah
         acara bisa saja ditangani orang lain, bukan PIC yang
         tercatat di data customer.
         Pembedanya: isian yang masih sama persis dengan bawaan
         customer sebelumnya berarti belum disentuh siapa pun. */
      const ikut = (
        sekarang: string,
        bawaanLama: string | null | undefined,
        bawaanBaru: string | null | undefined,
      ) =>
        sekarang === "" || sekarang === (bawaanLama ?? "")
          ? (bawaanBaru ?? "")
          : sekarang;

      return {
        ...lama,
        customer_id: idBaru,
        contact_person: ikut(
          lama.contact_person,
          sebelumnya?.contact_person,
          dipilih?.contact_person,
        ),
        contact_phone: ikut(
          lama.contact_phone,
          sebelumnya?.phone,
          dipilih?.phone,
        ),
      };
    });
  }

  // Jenis pesanan untuk S&K: tebakan dari rincian, bisa ditimpa sales.
  const [pilihSyarat, setPilihSyarat] = useState<Partial<JenisPesanan>>({});
  const tebakan = tebakJenisPesanan(f.items);
  const jenisSyarat: JenisPesanan = {
    buffetStall: pilihSyarat.buffetStall ?? tebakan.buffetStall,
    box: pilihSyarat.box ?? tebakan.box,
    setMenu: pilihSyarat.setMenu ?? false,
  };

  // Tanggal acara yang sah & urut, untuk pilihan hari di sesi baris.
  const tanggalAcaraIsi = useMemo(
    () => [...new Set(f.event_dates.map((b) => b.tanggal).filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)))].sort(),
    [f.event_dates],
  );

  const total = useMemo(
    () =>
      hitungTotalDokumen({
        items: f.items.map((b) => ({
          day: uraikanRupiah(b.day) ?? 1,
          qty: uraikanRupiah(b.qty) ?? 0,
          pax: uraikanRupiah(b.pax) ?? null,
          price: uraikanRupiah(b.price) ?? 0,
          is_compliment: b.is_compliment,
          charge_service: b.charge_service,
          charge_pb1: b.charge_pb1,
          charge_ppn: b.charge_ppn ?? false,
          children: b.children.map((a) => ({
            day: uraikanRupiah(a.day) ?? uraikanRupiah(b.day) ?? 1,
            qty: uraikanRupiah(a.qty) ?? 0,
            pax: uraikanRupiah(a.pax) ?? null,
            price: uraikanRupiah(a.price) ?? 0,
          })),
        })),
        service_charge_percent: f.service_charge_percent || null,
        service_charge_minimum: uraikanRupiah(f.service_charge_minimum) ?? null,
        pb1_enabled: f.pb1_enabled,
        pb1_percent: f.pb1_percent || 10,
        ppn_percent: f.items.some((b) => b.charge_ppn) ? f.ppn_percent || null : null,
        delivery_amount: uraikanRupiah(f.delivery_amount) ?? 0,
        biaya_tambahan: f.biaya_tambahan.map((b) => ({
          label: b.label,
          amount: uraikanRupiah(b.amount) ?? 0,
        })),
      }),
    [
      f.items,
      f.service_charge_percent,
      f.service_charge_minimum,
      f.pb1_enabled,
      f.pb1_percent,
      f.ppn_percent,
      f.delivery_amount,
      f.biaya_tambahan,
    ],
  );

  const isiDokumen = () => isiPratinjau(f, total, kop!, pelanggan);

  // Rincian di ringkasan kanan — label resmi lib/istilah, hanya yang ada nilainya.
  const rincianTotal: [string, string][] = [
    ["Subtotal", rupiah(total.subtotal)],
    ...(total.service_charge_amount.gt(0) ? [["Layanan", rupiah(total.service_charge_amount)] as [string, string]] : []),
    ...(total.pb1_amount.gt(0) ? [[ISTILAH.pajak, rupiah(total.pb1_amount)] as [string, string]] : []),
    ...(total.ppn_amount.gt(0) ? [["PPN sewa alat", rupiah(total.ppn_amount)] as [string, string]] : []),
    ...(total.delivery_amount.gt(0) ? [[ISTILAH.delivery, rupiah(total.delivery_amount)] as [string, string]] : []),
    ...(!total.biaya_tambahan_amount.isZero() ? [["Biaya tambahan", rupiah(total.biaya_tambahan_amount)] as [string, string]] : []),
  ];

  /* ---------- Satu halaman, enam bagian (D-068, D-069) ----------
     Navigasi bagian menempel di atas: klik untuk meloncat, bagian yang sedang
     dibaca menyala, ✓ untuk bagian yang sudah terisi. */
  const [aktif, setAktif] = useState(0);
  const selesai = [
    Boolean(f.customer_id && f.tanggal && f.tanggal_akhir),
    Boolean(f.order_type) && f.event_dates.some((b) => b.tanggal.trim() !== ""),
    total.subtotal.gt(0) && f.items.some((b) => b.item_name.trim() !== ""),
    Boolean(f.service_charge_percent.trim() || f.delivery_amount.trim()),
    f.biaya_tambahan.length > 0,
    Boolean(f.payment_terms.trim() || f.notes.trim()),
  ];
  const lompat = (n: number) => document.getElementById(`bagian-${n}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const amati = new IntersectionObserver(
      (masuk) => {
        const terlihat = masuk.filter((m) => m.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (terlihat) setAktif(Number(terlihat.target.id.replace("bagian-", "")));
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    TAHAP.forEach((_, n) => {
      const el = document.getElementById(`bagian-${n}`);
      if (el) amati.observe(el);
    });
    return () => amati.disconnect();
  }, []);
  // Galat dari server → gulir ke bagian tempat isiannya berada.
  useEffect(() => {
    const kunci = Object.keys(keadaan.galat ?? {}).find((k) => k in LANGKAH_GALAT);
    if (kunci !== undefined) document.getElementById(`bagian-${LANGKAH_GALAT[kunci]}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [keadaan]);
  /** "YYYY-MM-DD" + n hari. */
  const tambahHari = (t: string, n: number) => {
    const d0 = Date.parse(`${t}T00:00:00Z`);
    return Number.isNaN(d0) ? t : new Date(d0 + n * 86_400_000).toISOString().slice(0, 10);
  };
  const saranJenis = saran.jenisAcara.length ? saran.jenisAcara : JENIS_ACARA_UMUM;

  /** Satu paket menjadi satu baris berharga + isi menunya sebagai sub-item tanpa harga. */
  function tambahPaket(idPaket: string) {
    const p = paket.find((x) => x.id === idPaket);
    if (!p) return;
    const baris: BarisForm = {
      ...barisKosong(),
      package_id: p.id,
      item_name: `[${p.kode}] ${p.nama}`,
      unit: p.satuan,
      price: Number(p.harga).toLocaleString("id-ID"),
      charge_service: p.kenaLayanan && f.order_type !== "retail",
      // Paket pilihan (D-082): isi dimulai dari kategori "termasuk"; sisanya dipilih di baris.
      children: p.slot.length
        ? susunIsi([], p.slot, new Map(), (nama) => ({ kunci: crypto.randomUUID(), item_name: nama, day: "", unit: "", qty: "", pax: "", price: "" }))
        : p.isi.map((m) => ({ kunci: crypto.randomUUID(), item_name: m.nama, menu_id: m.id, day: "", unit: "", qty: "", pax: "", price: "" })),
    };
    catat();
    setF((lama) => {
      // Baris kosong pertama yang belum disentuh diganti, bukan ditumpuk.
      const kosong = (b: BarisForm) => !b.item_name.trim() && !b.price.trim() && b.children.length === 0;
      // Baris baru di paling atas — langsung terlihat tanpa menggulir ke bawah.
      const items = lama.items.length === 1 && kosong(lama.items[0]) ? [baris] : [baris, ...lama.items];
      return { ...lama, items };
    });
    // Langsung minta jumlah porsi — tanpa itu nilainya tetap harga satu porsi.
    // Dicari lewat nomor baris (stabil), bukan kunci acak (beda di server & browser).
    setTimeout(() => document.querySelector<HTMLInputElement>(`[aria-label="Jumlah pax baris 1"]`)?.focus(), 60);
  }

  function pakaiZona(z: AturanZona) {
    setF((lama) => ({
      ...lama,
      // Retail (D-070) tanpa layanan perlengkapan — lokasi hanya menentukan Delivery Fee.
      service_charge_percent: lama.order_type === "retail" ? "" : String(z.pct).replace(".", ","),
      service_charge_minimum: lama.order_type === "retail" ? "" : z.min.toLocaleString("id-ID"),
      // Ada baris buffet/stall → Delivery Fee tidak dikenakan (02-ATURAN-BISNIS §3).
      delivery_amount: z.delivery === null ? lama.delivery_amount : total.dasar_service_charge.gt(0) ? "0" : z.delivery.toLocaleString("id-ID"),
    }));
  }

  function usulkanPembulatan() {
    setF((lama) => {
      const lain = lama.biaya_tambahan.filter((b) => b.label.trim().toLowerCase() !== "pembulatan");
      const yangLama = lama.biaya_tambahan.find((b) => b.label.trim().toLowerCase() === "pembulatan");
      const tanpaPembulatan = total.grand_total.minus(uraikanRupiah(yangLama?.amount ?? "") ?? 0);
      const usulan = usulanPembulatan(tanpaPembulatan);
      if (usulan.isZero()) return { ...lama, biaya_tambahan: lain };
      return {
        ...lama,
        biaya_tambahan: [...lain, { ...(yangLama ?? tambahanKosong()), label: "Pembulatan", amount: usulan.toNumber().toLocaleString("id-ID") }],
      };
    });
  }

  // Dihitung dengan aturan yang sama persis dengan yang dipakai server,
  // supaya angka di layar tidak pernah berbeda dari yang tersimpan.
  const jumlahHari = useMemo(
    () =>
      jumlahHariAcara(
        f.event_dates
          .map((b) => (b.tanggal ? new Date(b.tanggal) : null))
          .filter((x): x is Date => x !== null && !Number.isNaN(x.getTime())),
      ),
    [f.event_dates],
  );

  const muatan = JSON.stringify({
    id: f.id ?? null,
    customer_id: f.customer_id,
    contact_person: f.contact_person,
    contact_phone: f.contact_phone,
    tanggal: f.tanggal,
    tanggal_akhir: f.tanggal_akhir,
    event_dates: f.event_dates.map((b) => b.tanggal).filter((s) => s !== ""),
    event_type: f.event_type,
    event_time: f.event_time,
    guest_count: f.guest_count || null,
    fnb_planner: f.fnb_planner,
    venue: f.venue,
    order_type: f.order_type ?? "",
    notes: f.notes,
    service_charge_percent: f.service_charge_percent || null,
    service_charge_minimum: f.service_charge_minimum || null,
    delivery_amount: f.delivery_amount || null,
    biaya_tambahan: f.biaya_tambahan.map((b) => ({
      label: b.label,
      amount: b.amount,
    })),
    pb1_enabled: f.pb1_enabled,
    pb1_percent: f.pb1_percent || null,
    ppn_percent: f.ppn_percent || null,
    signatory_id: f.signatory_id || null,
    lead_id: f.lead_id || null,
    po_reference: f.po_reference || null,
    show_payment_terms: f.show_payment_terms,
    payment_terms: f.payment_terms,
    items: f.items.map((b) => ({
      product_id: b.product_id || null,
      package_id: b.package_id || null,
      day: b.day,
      item_name: b.item_name,
      unit: b.unit || null,
      qty: b.qty,
      pax: b.pax,
      price: b.price,
      is_compliment: b.is_compliment,
      charge_service: b.charge_service,
      charge_pb1: b.charge_pb1,
      charge_ppn: b.charge_ppn ?? false,
      sesi_tanggal: b.sesi_tanggal || null,
      sesi_jenis: b.sesi_jenis || null,
      sesi_jam: b.sesi_jam || null,
      children: b.children.map((a) => ({
        item_name: a.item_name,
        unit: a.unit || null,
        day: a.day,
        qty: a.qty,
        pax: a.pax,
        price: a.price,
        menu_id: a.menu_id || null,
        swapped_from_menu_id: a.swapped_from_menu_id || null,
      })),
    })),
  });

  return (
    // Form seksi (D-063): bagian-bagian di kiri, ringkasan total menempel di kanan (lg+);
    // di layar sempit ringkasan menjadi bilah di bawah.
    <form action={kirim} className="grid items-start gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:pb-0">
      <input type="hidden" name="muatan" value={muatan} />
      {Object.entries(medanTambahan ?? {}).map(([nama, nilai]) => (
        <input key={nama} type="hidden" name={nama} value={nilai} />
      ))}

      <div className="flex min-w-0 flex-col gap-3.5">

      {keadaan.pesan ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          {keadaan.pesan}
        </p>
      ) : null}

      <Penunjuk langkah={aktif} selesai={selesai} onPilih={lompat} judulKedua={retail ? "Pengiriman" : jenis ? "Acara" : "Jenis pesanan"} />

      <div id="bagian-0" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Langkah 1: customer & tanggal ---------- */}
      <BagianForm nomor={1} judul="Customer" keterangan={`Untuk siapa ${istilah.kata} ini, dan sampai kapan berlaku.`}>
        <Bidang label="Customer" nama="customer_id" galat={keadaan.galat?.customer_id} wajib>
          <PilihCari
            id="customer_id"
            nilai={opsiPelanggan.find((o) => o.id === f.customer_id)}
            pilihan={opsiPelanggan}
            onPilih={(o) => pilihPelanggan(o.id)}
            placeholder="Ketik nama atau kode customer…"
          />
        </Bidang>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Nama kontak" nama="contact_person">
            <Input
              id="contact_person"
              value={f.contact_person}
              onChange={(e) => ubah("contact_person", e.target.value)}
              placeholder="mis. Ibu Sari"
            />
          </Bidang>
          <Bidang label="Telepon" nama="contact_phone">
            <Input
              id="contact_phone"
              value={f.contact_phone}
              onChange={(e) => ubah("contact_phone", e.target.value)}
              placeholder="0812…"
            />
          </Bidang>
          {/* Customer korporat membayar berdasarkan nomor PO mereka sendiri:
              invoice tanpa nomor itu tertahan di bagian hutang mereka, dan
              yang menagih baru mengetahuinya berminggu-minggu kemudian.

              Invoice yang dibuat dari quotation sudah membawa nomor
              quotationnya sebagai referensi awal; itu tinggal diganti
              begitu nomor PO yang sebenarnya datang. */}
          {pakaiReferensiPo ? (
            <Bidang label="Referensi PO" nama="po_reference">
              <Input
                id="po_reference"
                value={f.po_reference}
                onChange={(e) => ubah("po_reference", e.target.value)}
                placeholder="Nomor PO dari customer"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Ikut tercetak di invoice. Dikosongkan, barisnya tidak muncul sama sekali.
              </p>
            </Bidang>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label={istilah.labelTanggal} nama="tanggal" wajib>
            <PilihTanggal id="tanggal" value={f.tanggal} onChange={(t) => ubah("tanggal", t)} bisaHapus={false} />
          </Bidang>
          <Bidang
            label={istilah.labelTanggalAkhir}
            nama="tanggal_akhir"
            galat={keadaan.galat?.tanggal_akhir}
            wajib
          >
            <PilihTanggal
              id="tanggal_akhir"
              value={f.tanggal_akhir}
              onChange={(t) => ubah("tanggal_akhir", t)}
              bisaHapus={false}
              aria-invalid={Boolean(keadaan.galat?.tanggal_akhir)}
            />
            <ChipCepat
              label="Masa berlaku cepat"
              pilihan={["+7 hari", "+14 hari", "+30 hari"]}
              value={[7, 14, 30].map((n) => (tambahHari(f.tanggal, n) === f.tanggal_akhir ? `+${n} hari` : "")).find(Boolean) ?? ""}
              onPilih={(v) => ubah("tanggal_akhir", tambahHari(f.tanggal, Number(v.replace(/\D/g, ""))))}
            />
          </Bidang>
        </div>
      </BagianForm>
      </div>

      <div id="bagian-1" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Jenis pesanan → acara / pengiriman (D-070) ---------- */}
      <BagianForm
        nomor={2}
        judul={jenis === "retail" ? "Pengiriman" : jenis === "event" ? "Detail acara" : "Jenis pesanan"}
        keterangan={
          jenis === "retail"
            ? "Pesanan dibuat dan dikirim ke alamat customer, tanpa set-up. Ikut tercetak di kepala dokumen."
            : jenis === "event"
              ? "Disajikan di venue dengan set-up buffet/stall dan tim servis. Ikut tercetak di kepala dokumen; boleh dikosongkan bila belum pasti."
              : "Pilih dulu jenis pesanannya. Isian di bawahnya menyesuaikan."
        }
      >
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Jenis pesanan">
          {(
            [
              ["event", JENIS_PESANAN.event, "Set-up buffet/stall, tim servis, disajikan di venue.", PartyPopper],
              ["retail", JENIS_PESANAN.retail, "Nasi/snack box, tumpeng, dll. Dibuat lalu dikirim ke alamat.", Truck],
            ] as const
          ).map(([k, judul, ket, Ikon]) => {
            const dipilih = jenis === k;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={dipilih}
                onClick={() => pilihJenis(k)}
                className={cn(
                  "flex items-start gap-3 rounded-[12px] border p-4 text-left transition-colors",
                  dipilih ? "border-primary bg-accent ring-2 ring-primary/20" : "bg-card hover:border-primary/40",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", dipilih ? "bg-primary text-primary-foreground" : "bg-secondary text-primary-strong")}>
                  <Ikon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-primary-strong">{judul}</span>
                  <span className="block text-sm text-muted-foreground">{ket}</span>
                </span>
                <span className={cn("ml-auto mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2", dipilih ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                  {dipilih ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {jenis ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
          <Bidang
            label={retail ? "Tanggal kirim" : "Tanggal acara"}
            nama="event_dates"
            galat={keadaan.galat?.event_dates}
          >
            <div className="flex flex-col gap-2">
              {f.event_dates.map((baris, i) => (
                <div key={baris.kunci} className="flex items-center gap-2">
                  <PilihTanggal
                    id={i === 0 ? "event_dates" : undefined}
                    value={baris.tanggal}
                    onChange={(t) => ubahTanggal(i, t)}
                    bisaHapus={false}
                    aria-label={`${retail ? "Tanggal kirim" : "Tanggal acara"} ke-${i + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      ubah("event_dates", f.event_dates.filter((_, y) => y !== i))
                    }
                    aria-label={`Hapus tanggal acara ke-${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => ubah("event_dates", [...f.event_dates, tanggalKosong()])}
              >
                <Plus className="size-4" />
                Tambah tanggal
              </Button>
            </div>
          </Bidang>

          {/* Jumlah hari DIHITUNG, tidak diketik. Diketik terpisah, ia bisa
              berbeda dari tanggalnya — dan dokumen yang menyebut "3 hari"
              dengan dua tanggal tercetak tidak akan ditegur siapa pun. */}
          <Bidang label="Jumlah hari" nama="event_days">
            <p className="flex h-9 items-center text-sm">
              {jumlahHari > 0 ? (
                <span>
                  {jumlahHari} hari{" "}
                  <span className="text-muted-foreground">· dihitung dari tanggalnya</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Belum ada tanggal</span>
              )}
            </p>
          </Bidang>
          <Bidang label={retail ? "Jam tiba / kirim" : "Jam"} nama="event_time">
            <PilihRentangJam value={f.event_time} onChange={(v) => ubah("event_time", v)} aria-label={retail ? "Jam kirim" : "Jam acara"} />
            <ChipCepat
              label="Jam cepat"
              pilihan={Object.keys(JAM_CEPAT)}
              value={Object.entries(JAM_CEPAT).find(([, j]) => j === f.event_time)?.[0] ?? ""}
              onPilih={(v) => ubah("event_time", JAM_CEPAT[v])}
            />
          </Bidang>
            </div>

            {retail ? (
              <Bidang label="Alamat pengiriman" nama="venue">
                <InputSaran id="venue" value={f.venue} onChange={(v) => ubah("venue", v)} saran={saran.venue} placeholder="Jalan, nomor, kelurahan, patokan…" />
              </Bidang>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Bidang label={retail ? "Keperluan (opsional)" : "Jenis acara"} nama="event_type">
                <InputSaran id="event_type" value={f.event_type} onChange={(v) => ubah("event_type", v)} saran={saranJenis} placeholder="Ketik atau pilih…" />
                <ChipCepat label="Jenis acara cepat" pilihan={saranJenis.slice(0, 5)} value={f.event_type} onPilih={(v) => ubah("event_type", v)} />
              </Bidang>
              {retail ? null : (
                <Bidang label="Jumlah tamu" nama="guest_count">
                  <Input id="guest_count" inputMode="numeric" value={f.guest_count} onChange={(e) => ubah("guest_count", e.target.value)} placeholder="300" />
                </Bidang>
              )}
              {retail ? (
                <Bidang label="Sales / PIC" nama="fnb_planner">
                  <InputSaran id="fnb_planner" value={f.fnb_planner} onChange={(v) => ubah("fnb_planner", v)} saran={saran.planner} placeholder="Ketik atau pilih nama…" />
                </Bidang>
              ) : null}
            </div>

            {retail ? null : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Bidang label="Venue" nama="venue">
                  <InputSaran id="venue" value={f.venue} onChange={(v) => ubah("venue", v)} saran={saran.venue} placeholder="mis. Gedung Serbaguna, Bogor" />
                </Bidang>
                <Bidang label="F&B planner" nama="fnb_planner">
                  <InputSaran id="fnb_planner" value={f.fnb_planner} onChange={(v) => ubah("fnb_planner", v)} saran={saran.planner} placeholder="Ketik atau pilih nama…" />
                </Bidang>
              </div>
            )}
          </>
        ) : null}
      </BagianForm>

      </div>

      <div id="bagian-2" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Langkah 3: menu & harga ---------- */}
      <BagianForm
        nomor={3}
        judul="Menu & harga"
        keterangan="Pilih paket untuk mengisi menu & harga otomatis, atau tulis baris sendiri untuk pesanan custom. Nilai tiap baris = hari × porsi × harga."
      >
        {keadaan.galat?.items ? (
          <p role="alert" className="text-sm text-destructive">
            {keadaan.galat.items}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 rounded-[12px] border border-info-garis bg-info-halus p-4 sm:flex-row sm:items-end">
          {paket.length ? (
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-primary-strong">Tambah dari paket</span>
              <PilihCari
                pilihan={paket.map((p) => ({ id: p.id, label: `[${p.kode}] ${p.nama}`, sub: `${rupiah(p.harga)}/${p.satuan}` }))}
                onPilih={(o) => tambahPaket(o.id)}
                placeholder="Ketik kode atau nama paket, mis. BS-15, PR-01, ayam…"
              />
            </div>
          ) : null}
          {paket.length ? <span className="text-sm text-muted-foreground sm:pb-2.5">atau</span> : null}
          <Button
            type="button"
            variant="outline"
            className="bg-card"
            onClick={() => {
              catat();
              setF((lama) => ({ ...lama, items: [{ ...barisKosong(), charge_service: lama.order_type !== "retail" }, ...lama.items] }));
              setTimeout(() => document.querySelector<HTMLInputElement>('[data-nama-baris="1"]')?.focus(), 60);
            }}
          >
            <Plus className="size-4" />
            Tambah baris
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {f.items.length} baris · salah hapus atau salah tukar? tekan <b className="font-medium text-foreground">Urungkan</b>
          </span>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={!riwayat.lalu.length} onClick={urungkan} title="Urungkan (⌘Z / Ctrl+Z)">
              <Undo2 className="size-4" />
              Urungkan
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!riwayat.depan.length} onClick={ulangi} title="Ulangi (⌘⇧Z / Ctrl+Y)">
              <Redo2 className="size-4" />
              Ulangi
            </Button>
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-border-row">
          {f.items.map((b, i) => (
            <BarisItem
              key={b.kunci}
              baris={b}
              nomor={i + 1}
              produk={produk}
              menu={menu}
              tanggalAcara={tanggalAcaraIsi}
              bisaHapus={f.items.length > 1}
              bisaNaik={i > 0}
              bisaTurun={i < f.items.length - 1}
              onUbah={(perubahan, aksi) => ubahBaris(i, perubahan, aksi)}
              onPilihProduk={(id) => pilihProduk(i, id)}
              onHapus={() => {
                catat();
                setF((lama) => ({ ...lama, items: lama.items.filter((_, x) => x !== i) }));
                beritahu(`Baris ${i + 1}${b.item_name.trim() ? ` "${b.item_name.trim()}"` : ""} dihapus`);
              }}
              onSalin={() => {
                catat();
                setF((lama) => {
                  const asal = lama.items[i];
                  const salinan: BarisForm = { ...asal, kunci: crypto.randomUUID(), children: asal.children.map((a) => ({ ...a, kunci: crypto.randomUUID() })) };
                  return { ...lama, items: [...lama.items.slice(0, i + 1), salinan, ...lama.items.slice(i + 1)] };
                });
              }}
              saranSatuan={saran.satuan.length ? saran.satuan : SATUAN_UMUM}
              jumlahTamu={retail ? "" : f.guest_count}
              retail={retail}
              paketAsal={b.package_id ? paket.find((p) => p.id === b.package_id) : undefined}
              onPindah={(arah) => {
                catat();
                setF((lama) => {
                  const items = [...lama.items];
                  const j = i + arah;
                  if (j < 0 || j >= items.length) return lama;
                  [items[i], items[j]] = [items[j], items[i]];
                  return { ...lama, items };
                });
              }}
            />
          ))}
        </ul>
      </BagianForm>

      </div>

      <div id="bagian-3" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Langkah 4: layanan, PBJT & Delivery Fee ---------- */}
      <BagianForm
        nomor={4}
        judul={retail ? `${ISTILAH.pajak} & ${ISTILAH.delivery}` : `${ISTILAH.layanan}, ${ISTILAH.pajak} & ${ISTILAH.delivery}`}
        keterangan={
          retail
            ? "Pilih lokasi pengiriman untuk mengisi Delivery Fee otomatis, lalu ubah bila perlu."
            : `Pilih lokasi acara untuk mengisi angkanya otomatis, lalu ubah bila perlu. Layanan hanya dihitung dari baris buffet & stall yang dicentang "Kena layanan".`
        }
      >
        {aturanZona.length ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{retail ? "Lokasi pengiriman" : "Lokasi acara"}</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Isi otomatis menurut lokasi">
              {aturanZona.map((z) => (
                <button
                  key={z.kunci}
                  type="button"
                  onClick={() => pakaiZona(z)}
                  className="min-h-10 rounded-full border bg-card px-4 text-[0.9375rem] font-medium transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          {retail ? (
            <p className="rounded-[10px] bg-muted/60 px-3.5 py-2.5 text-sm text-muted-foreground sm:col-span-2">
              Pesanan retail tidak dikenai {ISTILAH.layanan.toLowerCase()} (tanpa set-up buffet/stall).
            </p>
          ) : (
            <>
          <Bidang label="Layanan perlengkapan (%)" nama="service_charge_percent">
            <Input
              id="service_charge_percent"
              inputMode="decimal"
              value={f.service_charge_percent}
              onChange={(e) => ubah("service_charge_percent", e.target.value)}
              placeholder="15"
              className="angka tabular-nums"
            />
          </Bidang>
          <Bidang label="Minimum layanan (Rp)" nama="service_charge_minimum">
            <Input
              id="service_charge_minimum"
              inputMode="numeric"
              value={f.service_charge_minimum}
              onChange={(e) => ubah("service_charge_minimum", e.target.value)}
              onBlur={(e) => ubah("service_charge_minimum", rapikanRupiah(e.target.value))}
              placeholder="mis. 1.500.000"
              aria-label="Minimum layanan perlengkapan"
              className="angka tabular-nums"
            />
          </Bidang>
          <p className="-mt-2 text-sm text-muted-foreground sm:col-span-2">
            Dihitung dari {rupiah(total.dasar_service_charge)} → layanan <b className="font-mono font-semibold text-foreground">{rupiah(total.service_charge_amount)}</b>
          </p>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="pb1_percent">{ISTILAH.pajak} (%)</Label>
            <div className="flex items-center gap-3">
              <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm">
                <Checkbox id="pb1_enabled" checked={f.pb1_enabled} onCheckedChange={(v) => ubah("pb1_enabled", v === true)} />
                Kenakan
              </label>
              <Input
                id="pb1_percent"
                inputMode="decimal"
                value={f.pb1_percent}
                onChange={(e) => ubah("pb1_percent", e.target.value)}
                placeholder="10"
                aria-label={`Persen ${ISTILAH.pajak}`}
                disabled={!f.pb1_enabled}
                className="angka tabular-nums"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {f.pb1_enabled ? (
                <>
                  Dari {rupiah(total.dasar_pb1)} → <b className="font-mono font-semibold text-foreground">{rupiah(total.pb1_amount)}</b>
                </>
              ) : (
                `Tidak dikenakan ${ISTILAH.pajak}.`
              )}
            </p>
            {total.ppn_amount.gt(0) ? (
              <p className="text-sm text-muted-foreground">
                {labelPpn(f.ppn_percent)}: {rupiah(total.ppn_amount)} dari sewa alat {rupiah(total.dasar_ppn)}
              </p>
            ) : null}
          </div>

          <Bidang label={`${ISTILAH.delivery} (Rp)`} nama="delivery_amount" galat={keadaan.galat?.delivery_amount}>
            <Input
              id="delivery_amount"
              inputMode="numeric"
              value={f.delivery_amount}
              onChange={(e) => ubah("delivery_amount", e.target.value)}
              onBlur={(e) => ubah("delivery_amount", rapikanRupiah(e.target.value))}
              placeholder="0"
              className="angka tabular-nums"
            />
            <p className="text-sm text-muted-foreground">Ongkos kirim, di luar layanan &amp; {ISTILAH.pajak}.</p>
          </Bidang>
        </div>
      </BagianForm>

      </div>

      <div id="bagian-4" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Biaya tambahan bernama ---------- */}
      <BagianForm
        nomor={5}
        judul="Biaya tambahan & potongan"
        keterangan="Opsional. Biaya lain di luar menu (mis. “Tim Servis 1 orang”), atau isi angka minus untuk potongan. Boleh dilewati."
      >
        {keadaan.galat?.biaya_tambahan ? (
          <p className="text-sm text-destructive">{keadaan.galat.biaya_tambahan}</p>
        ) : null}

        {f.biaya_tambahan.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {f.biaya_tambahan.map((b, i) => (
              <li key={b.kunci} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <InputSaran
                    value={b.label}
                    onChange={(v) => ubahTambahan(i, { label: v })}
                    saran={saran.biaya.length ? saran.biaya : BIAYA_UMUM}
                    placeholder="Nama biaya, mis. Tim servis 1 orang"
                    aria-label={`Nama biaya tambahan ${i + 1}`}
                  />
                </div>
                <Input
                  inputMode="numeric"
                  value={b.amount}
                  data-biaya={i}
                  onChange={(e) => ubahTambahan(i, { amount: e.target.value })}
                  onBlur={(e) => ubahTambahan(i, { amount: rapikanRupiah(e.target.value) })}
                  placeholder="0"
                  aria-label={`Jumlah biaya tambahan ${i + 1}`}
                  className="angka w-40 shrink-0 text-right tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    ubah(
                      "biaya_tambahan",
                      f.biaya_tambahan.filter((_, y) => y !== i),
                    )
                  }
                  aria-label={`Hapus biaya tambahan ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada biaya tambahan.</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Tambah cepat:</span>
          {(saran.biaya.length ? saran.biaya : BIAYA_UMUM).slice(0, 6).map((nama) => (
            <button
              key={nama}
              type="button"
              onClick={() => {
                const i = f.biaya_tambahan.length;
                ubah("biaya_tambahan", [...f.biaya_tambahan, { ...tambahanKosong(), label: nama }]);
                setTimeout(() => document.querySelector<HTMLInputElement>(`[data-biaya="${i}"]`)?.focus(), 60);
              }}
              className="min-h-8 rounded-full border bg-card px-3 text-[0.8125rem] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              + {nama}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => ubah("biaya_tambahan", [...f.biaya_tambahan, tambahanKosong()])}>
            <Plus className="size-4" />
            Tambah biaya
          </Button>
          <Button type="button" variant="outline" className="h-auto min-h-10 max-w-full shrink py-2 text-left whitespace-normal" onClick={usulkanPembulatan}>
            <Calculator className="size-4" />
            Bulatkan total ke bawah (kelipatan Rp100.000)
          </Button>
        </div>
      </BagianForm>

      {/* ---------- Penandatangan ---------- */}
      {penandatangan.length > 1 ? (
        <BagianForm
          judul="Penandatangan"
          keterangan="Nama dan tanda tangannya yang tercetak di kaki dokumen."
        >
          <Bidang label="Ditandatangani oleh" nama="signatory_id">
            <div id="signatory_id" className="flex flex-wrap gap-1.5" role="group" aria-label="Ditandatangani oleh">
              {penandatangan.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={f.signatory_id === o.id}
                  onClick={() => ubah("signatory_id", o.id)}
                  className={chip(f.signatory_id === o.id)}
                >
                  {o.nama}
                </button>
              ))}
            </div>
          </Bidang>
        </BagianForm>
      ) : null}

      </div>

      <div id="bagian-5" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Syarat & catatan ---------- */}
      <BagianForm nomor={6} judul="Syarat & catatan" keterangan="Isi S&K standar sesuai jenis pesanan, tambahkan catatan untuk customer, lalu simpan.">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            id="show_payment_terms"
            checked={f.show_payment_terms}
            onCheckedChange={(v) => ubah("show_payment_terms", v === true)}
          />
          Cetak syarat pembayaran di dokumen
        </label>

        {syarat.length ? (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Jenis pesanan untuk S&K">
              <span className="mr-1 text-xs text-muted-foreground">S&amp;K untuk:</span>
              {(
                [
                  ["buffetStall", "Buffet & Stall"],
                  ["box", "Nasi / Snack Box"],
                  ["setMenu", "Set Menu"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={jenisSyarat[k]}
                  onClick={() => setPilihSyarat((lama) => ({ ...lama, [k]: !jenisSyarat[k] }))}
                  className={chip(jenisSyarat[k])}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setF((lama) => ({ ...lama, show_payment_terms: true, payment_terms: rakitSyarat(syarat, jenisSyarat) }))}
              >
                {f.payment_terms.trim() ? "Isi ulang S&K standar" : "Isi S&K standar"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Bagian dipilih otomatis dari rincian; teksnya tetap bisa diubah di bawah.
              </span>
            </div>
          </div>
        ) : null}

        {f.show_payment_terms ? (
          <Bidang label="Syarat pembayaran" nama="payment_terms">
            <Textarea
              id="payment_terms"
              rows={f.payment_terms.length > 600 ? 14 : 4}
              value={f.payment_terms}
              onChange={(e) => ubah("payment_terms", e.target.value)}
              placeholder="Uang muka 50% saat pemesanan, pelunasan H-3 acara."
            />
          </Bidang>
        ) : null}

        <Bidang label="Catatan" nama="notes">
          <Textarea
            id="notes"
            rows={3}
            value={f.notes}
            onChange={(e) => ubah("notes", e.target.value)}
            placeholder="Catatan tambahan untuk customer"
          />
        </Bidang>
      </BagianForm>
      </div>

      <CekSebelumSimpan tampil selesai={selesai} onPergi={lompat} adaJenis={Boolean(jenis)} />

      <div className="hidden items-center justify-end gap-2 pt-1 lg:flex">
        <Button type="button" variant="outline" className="h-11 px-5" render={<Link href={istilah.batalHref} />}>
          Batal
        </Button>
        {kop ? <TombolPratinjau isi={isiDokumen} className="h-11 px-5" /> : null}
        <Button type="submit" className="h-11 px-6" disabled={sedangKirim}>
          {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
          {sedangKirim ? "Menyimpan…" : istilah.tombolSimpan}
        </Button>
      </div>
      </div>

      {/* ---------- Ringkasan kanan (lg+) ---------- */}
      <aside className="hidden flex-col gap-3 lg:sticky lg:top-4 lg:flex">
        <div className="flex flex-col gap-3 rounded-[14px] border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
          <p className="eyebrow flex items-center gap-2">
            <Calculator className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Ringkasan · {f.items.length} baris
          </p>
          <dl className="flex flex-col gap-2 text-[0.9375rem]">
            {rincianTotal.map(([label, nilai]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono">{nilai}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between gap-3 border-t border-border-row pt-3">
            <span className="font-semibold">Total</span>
            <span className="uang text-[1.375rem]">{rupiah(total.grand_total)}</span>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={sedangKirim}>
            {sedangKirim ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Menyimpan…
              </>
            ) : (
              <>
                <Check className="size-4" />
                {istilah.tombolSimpan}
              </>
            )}
          </Button>
          {kop ? <TombolPratinjau isi={isiDokumen} className="w-full" /> : null}
          <Button type="button" variant="outline" className="w-full" render={<Link href={istilah.batalHref} />}>
            Batal
          </Button>
        </div>
      </aside>

      {/* ---------- Bilah total yang menempel di bawah (layar sempit) ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total · {f.items.length} baris</p>
            <p className="uang truncate text-lg">{rupiah(total.grand_total)}</p>
          </div>
          {kop ? <TombolPratinjau isi={isiDokumen} className="h-11 shrink-0 px-3" /> : null}
          <Button type="submit" className="h-11 shrink-0 px-5" disabled={sedangKirim}>
            {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
            {sedangKirim ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------
   Satu baris item, lengkap dengan sub-itemnya
   ------------------------------------------------------------------------- */

function BarisItem({
  baris,
  nomor,
  produk,
  menu,
  tanggalAcara,
  bisaHapus,
  bisaNaik,
  bisaTurun,
  onUbah,
  onPilihProduk,
  onHapus,
  onSalin,
  onPindah,
  saranSatuan,
  jumlahTamu,
  retail,
  paketAsal,
}: {
  baris: BarisForm;
  nomor: number;
  produk: PilihanProduk[];
  menu: PilihanMenu[];
  tanggalAcara: string[];
  bisaHapus: boolean;
  bisaNaik: boolean;
  bisaTurun: boolean;
  /** aksi: undefined = ketikan, "" = aksi tanpa notifikasi, teks = aksi + notifikasi "Batalkan". */
  onUbah: (perubahan: Partial<BarisForm>, aksi?: string) => void;
  onPilihProduk: (id: string) => void;
  onHapus: () => void;
  onSalin: () => void;
  onPindah: (arah: -1 | 1) => void;
  saranSatuan: readonly string[];
  /** Jumlah tamu dari bagian Acara — tombol cepat untuk mengisi porsi. */
  jumlahTamu: string;
  /** Pesanan retail (D-070): tanpa layanan perlengkapan. */
  retail: boolean;
  /** Paket asal baris ini — pembanding isi & harga untuk upgrade/tambah/kurangi (D-070). */
  paketAsal?: PilihanPaket;
}) {
  const nilai = subtotalBaris({
    day: uraikanRupiah(baris.day) ?? 1,
    qty: uraikanRupiah(baris.qty) ?? 0,
    pax: uraikanRupiah(baris.pax) ?? null,
    price: uraikanRupiah(baris.price) ?? 0,
    is_compliment: baris.is_compliment,
  });

  const opsiProduk = useMemo(() => produk.map((p) => ({ id: p.id, label: p.nama })), [produk]);
  const opsiMenu = useMemo(
    () => menu.map((m) => ({ id: m.id, label: m.nama, sub: m.kategori ? (KATEGORI_MENU[m.kategori as KategoriMenu] ?? m.kategori) : undefined })),
    [menu],
  );

  // id dari useId, bukan baris.kunci (UUID acak berbeda di server & browser → hydration mismatch).
  const idBaris = useId();
  // Sub-item yang sedang ditukar menunya (indeks), hanya satu sekaligus.
  const [tukar, setTukar] = useState<number | null>(null);
  const menuPerId = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);

  const dariPaket = Boolean(baris.package_id);
  const paxBelum = !baris.pax.trim() || baris.pax.trim() === "1";
  const qtyBukanSatu = baris.qty.trim() !== "" && baris.qty.trim() !== "1";
  const [bukaPengali, setBukaPengali] = useState(qtyBukanSatu);
  const anakBerharga = (a: BarisForm["children"][number]) => Boolean(a.price.trim() || a.qty.trim() || a.unit.trim() || a.pax.trim() || a.day.trim());
  const [hargaIsi, setHargaIsi] = useState(() => baris.children.some(anakBerharga));
  const [tambahIsi, setTambahIsi] = useState(false);
  // Isi yang baru ditambah lewat "Tulis isi sendiri" langsung siap diketik.
  const [fokusIsi, setFokusIsi] = useState<string | null>(null);

  /** Mengubah satu sub-item tanpa menyentuh saudaranya. */
  function ubahAnak(j: number, ubahan: Partial<BarisForm["children"][number]>, aksi?: string) {
    onUbah(
      {
        children: baris.children.map((x, y) => (y === j ? { ...x, ...ubahan } : x)),
      },
      aksi,
    );
  }
  function tambahAnak(isi: Partial<BarisForm["children"][number]>) {
    const kunci = crypto.randomUUID();
    onUbah({ children: [...baris.children, { kunci, item_name: "", day: "", unit: "", qty: "", pax: "", price: "", ...isi }] }, "");
    if (!isi.item_name) setFokusIsi(kunci);
  }

  const angka = (s: string, bawaan: string) => (s.trim() ? s.trim() : bawaan);

  // Perubahan terhadap isi asli paket (D-070): ditukar / tambahan / dikurangi.
  // Paket pilihan per kategori tidak punya "isi asli" — isinya dipilih lewat PilihSlot.
  const paketTetap = paketAsal && !paketAsal.slot.length ? paketAsal : undefined;
  const asliIds = new Set(paketTetap?.isi.map((m) => m.id) ?? []);
  const statusIsi = (a: BarisForm["children"][number]): "asli" | "ditukar" | "tambahan" =>
    a.swapped_from_menu_id ? "ditukar" : paketTetap && (!a.menu_id || !asliIds.has(a.menu_id)) ? "tambahan" : "asli";
  const dikurangi = paketTetap ? paketTetap.isi.filter((m) => !baris.children.some((a) => a.menu_id === m.id || a.swapped_from_menu_id === m.id)) : [];
  const adaUbahanPaket = Boolean(paketTetap) && (dikurangi.length > 0 || baris.children.some((a) => statusIsi(a) !== "asli"));
  const hargaDasar = paketAsal ? Number(paketAsal.harga) : null;
  const hargaKini = uraikanRupiah(baris.price)?.toNumber() ?? 0;
  const selisih = hargaDasar === null ? 0 : hargaKini - hargaDasar;
  const geserHarga = (n: number) => onUbah({ price: Math.max(0, hargaKini + n).toLocaleString("id-ID") }, "");
  const label = "text-[0.8125rem] font-medium text-muted-foreground";

  return (
    <li className="flex flex-col gap-4 py-6 first:pt-2 last:pb-2">
      {/* Kepala baris: nomor, nama, nilai, pilihan */}
      <div className="flex items-center gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-primary">{nomor}</span>
        <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{baris.item_name.trim() || "Baris baru"}</span>
        {dariPaket ? <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">dari paket</span> : null}
        <span className={cn("uang shrink-0 text-base", baris.is_compliment && "text-muted-foreground line-through")}>{rupiah(nilai)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground" aria-label={`Pilihan baris ${nomor}`} />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onSalin}>
              <Copy className="size-4" />
              Salin baris ini
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!bisaNaik} onClick={() => onPindah(-1)}>
              <ArrowUp className="size-4" />
              Pindah ke atas
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!bisaTurun} onClick={() => onPindah(1)}>
              <ArrowDown className="size-4" />
              Pindah ke bawah
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={!bisaHapus} onClick={onHapus} aria-label={`Hapus baris ${nomor}`}>
              <Trash2 className="size-4" />
              Hapus baris
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Isian: nama selebar penuh, lalu angka-angkanya berlabel. Lebar mengikuti
          kartu (container query), bukan layar. */}
      <div className="@container flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className={label} htmlFor={`nama-${idBaris}`}>
            Nama item / menu
          </Label>
          {produk.length && !dariPaket && !baris.item_name.trim() ? (
            <PilihCari
              nilai={opsiProduk.find((o) => o.id === baris.product_id)}
              pilihan={opsiProduk}
              onPilih={(o) => onPilihProduk(o.id)}
              placeholder="Ambil dari katalog product (opsional)…"
            />
          ) : null}
          <Input
            id={`nama-${idBaris}`}
            data-nama-baris={nomor}
            value={baris.item_name}
            onChange={(e) => onUbah({ item_name: e.target.value })}
            placeholder="mis. Buffet Nusantara, Sewa tenda, Tim servis"
            className="text-base"
          />
        </div>

        {/* Hari x Porsi x Harga (x pengali). Dipisah, bukan dikalikan sendiri oleh
            yang mengetik: dokumen yang menulis "390 box" menghilangkan keterangan
            130 per hari selama tiga hari — dan angka itulah yang dipakai dapur. */}
        <div className="grid grid-cols-2 gap-3 @xl:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`hari-${idBaris}`}>
              Hari
            </Label>
            <Input
              id={`hari-${idBaris}`}
              aria-label={`Jumlah hari baris ${nomor}`}
              inputMode="decimal"
              value={baris.day}
              onChange={(e) => onUbah({ day: e.target.value })}
              placeholder="1"
              className="angka text-center tabular-nums"
            />
          </div>

          {/* Pax membawa banyaknya pesanan (236 box, 150 porsi). Kosong berarti
              satu, bukan nol — itu yang membuat dokumen lama bernilai sama. */}
          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`pax-${idBaris}`}>
              Jumlah porsi / pax
            </Label>
            <Input
              id={`pax-${idBaris}`}
              aria-label={`Jumlah pax baris ${nomor}`}
              inputMode="numeric"
              value={baris.pax}
              onChange={(e) => onUbah({ pax: e.target.value })}
              placeholder="1"
              title="Banyaknya pesanan. Nilai baris = hari × porsi × harga. Kosong berarti 1."
              className={cn("angka text-center tabular-nums", dariPaket && paxBelum && "border-perhatian-garis bg-perhatian-halus")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`satuan-${idBaris}`}>
              Satuan
            </Label>
            <InputSaran
              id={`satuan-${idBaris}`}
              aria-label={`Satuan baris ${nomor}`}
              value={baris.unit}
              onChange={(v) => onUbah({ unit: v })}
              saran={saranSatuan}
              placeholder="box, porsi…"
            />
          </div>

          <div className="col-span-2 flex flex-col gap-1.5 @xl:col-span-1">
            <Label className={label} htmlFor={`harga-${idBaris}`}>
              Harga satuan
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id={`harga-${idBaris}`}
                inputMode="numeric"
                value={baris.price}
                onChange={(e) => onUbah({ price: e.target.value })}
                onBlur={(e) => onUbah({ price: rapikanRupiah(e.target.value) })}
                placeholder="0"
                className="angka pl-9 text-base tabular-nums"
              />
            </div>
          </div>
        </div>

        {(dariPaket && paxBelum) || (jumlahTamu.trim() && paxBelum) ? (
          <div className="-mt-1 flex flex-wrap items-center gap-2">
            {dariPaket && paxBelum ? <p className="text-sm font-medium text-perhatian">Isi jumlah porsi/box yang dipesan supaya nilainya benar.</p> : null}
            {/^\d+$/.test(jumlahTamu.trim()) && jumlahTamu.trim() !== baris.pax.trim() ? (
              <button
                type="button"
                onClick={() => onUbah({ pax: jumlahTamu.trim() })}
                className="min-h-8 rounded-full border border-primary/30 bg-accent px-3 text-[0.8125rem] font-medium text-accent-foreground hover:border-primary"
              >
                Pakai jumlah tamu ({Number(jumlahTamu).toLocaleString("id-ID")})
              </button>
            ) : null}
          </div>
        ) : null}

        {bukaPengali || qtyBukanSatu ? (
          <div className="flex items-center gap-3">
            <Label className={label} htmlFor={`qty-${idBaris}`}>
              Pengali tambahan
            </Label>
            <Input
              id={`qty-${idBaris}`}
              inputMode="decimal"
              value={baris.qty}
              onChange={(e) => onUbah({ qty: e.target.value })}
              placeholder="1"
              className="angka w-24 text-center tabular-nums"
            />
            <span className="text-xs text-muted-foreground">Biasanya 1. Dipakai bila harga dikali lagi, mis. 2 titik stall.</span>
          </div>
        ) : null}

        {/* Rumus terlihat — angka baris selalu bisa dicocokkan pembacanya. */}
        <p className="rounded-[10px] bg-muted/60 px-3.5 py-2.5 font-mono text-sm text-muted-foreground">
          {angka(baris.day, "1")} hari × {angka(baris.pax, "1")} {baris.unit.trim() || "porsi"}
          {qtyBukanSatu ? ` × ${baris.qty.trim()}` : ""} × {baris.price.trim() ? `Rp ${baris.price.trim()}` : "Rp 0"} ={" "}
          <b className={cn("font-semibold text-foreground", baris.is_compliment && "line-through")}>{rupiah(nilai)}</b>
          {baris.is_compliment ? <span className="font-sans"> · compliment, dihitung nol</span> : null}
        </p>
      </div>

      {/* Ikut dihitung */}
      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <legend className="sr-only">Ikut dihitung pada baris {nomor}</legend>
        {retail ? null : (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={baris.charge_service} onCheckedChange={(v) => onUbah({ charge_service: v === true }, "")} />
            Kena layanan <span className="text-muted-foreground">(buffet &amp; stall)</span>
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={baris.charge_pb1} onCheckedChange={(v) => onUbah({ charge_pb1: v === true }, "")} />
          Kena {ISTILAH.pajak}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={baris.charge_ppn ?? false}
            onCheckedChange={(v) =>
              // Sewa alat kena PPN, bukan PBJT maupun layanan (D-015).
              onUbah(v === true ? { charge_ppn: true, charge_pb1: false, charge_service: false } : { charge_ppn: false, charge_pb1: true }, "")
            }
          />
          Sewa alat <span className="text-muted-foreground">(kena PPN)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={baris.is_compliment} onCheckedChange={(v) => onUbah({ is_compliment: v === true }, "")} />
          Compliment <span className="text-muted-foreground">(gratis)</span>
        </label>
      </fieldset>

      {paketAsal?.slot.length ? (
        <PilihSlot
          slot={paketAsal.slot}
          isi={baris.children}
          nomor={nomor}
          onUbah={(children) => onUbah({ children }, "")}
        />
      ) : null}

      {/* Isi paket / rincian: daftar menu yang mudah diubah (tukar, hapus, tambah). */}
      {baris.children.length > 0 || tambahIsi ? (
        <div className="flex flex-col gap-3 rounded-[12px] bg-muted/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {dariPaket ? "Isi paket" : "Rincian isi"} <span className="font-mono font-normal text-muted-foreground">· {baris.children.length}</span>
            </span>
            <button
              type="button"
              onClick={() => setHargaIsi((x) => !x)}
              className="text-sm font-medium text-primary hover:underline"
              aria-pressed={hargaIsi}
            >
              {hargaIsi ? "Sembunyikan harga per isi" : "Beri harga per isi (custom)"}
            </button>
          </div>
          {hargaIsi ? (
            <p className="text-xs text-muted-foreground">
              Isi yang diberi jumlah &amp; harga ikut dijumlahkan; baris induknya jadi judul kelompok dan angkanya boleh dikosongkan.
            </p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {baris.children.map((anak, j) => (
              <li key={anak.kunci} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-subtle-foreground">{j + 1}.</span>
                  <Input
                    value={anak.item_name}
                    onChange={(e) => ubahAnak(j, { item_name: e.target.value })}
                    placeholder="Nama menu / isi"
                    aria-label={`Sub-item ${j + 1} pada baris ${nomor}`}
                    autoFocus={anak.kunci === fokusIsi}
                    className="h-9 min-w-40 flex-1 bg-card"
                  />
                  {statusIsi(anak) === "tambahan" ? (
                    <span className="shrink-0 rounded-full bg-lunas-halus px-2.5 py-0.5 text-xs font-medium text-lunas">tambahan</span>
                  ) : statusIsi(anak) === "ditukar" ? (
                    <span className="shrink-0 rounded-full bg-info-halus px-2.5 py-0.5 text-xs font-medium text-primary">ditukar</span>
                  ) : null}
                  {anak.menu_id && menuPerId.get(anak.menu_id)?.kategori ? (
                    <TukarMenu
                      anak={anak}
                      menu={menu}
                      menuPerId={menuPerId}
                      buka={tukar === j}
                      onBuka={() => setTukar(tukar === j ? null : j)}
                      onPilih={(m, asli) => {
                        ubahAnak(j, { item_name: m.nama, menu_id: m.id, swapped_from_menu_id: m.id === asli ? undefined : asli }, `${anak.item_name} ditukar → ${m.nama}`);
                        setTukar(null);
                      }}
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onUbah({ children: baris.children.filter((_, y) => y !== j) }, `"${anak.item_name.trim() || "Isi"}" dihapus`)}
                    aria-label={`Hapus sub-item ${j + 1}`}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {hargaIsi ? (
                  <div className="ml-7 grid grid-cols-2 gap-2 sm:grid-cols-[70px_80px_100px_70px_minmax(0,1fr)_auto] sm:items-center">
                    <Input value={anak.day} onChange={(e) => ubahAnak(j, { day: e.target.value })} inputMode="numeric" placeholder={`${baris.day || "1"} hr`} aria-label={`Jumlah hari sub-item ${j + 1} pada baris ${nomor}`} title="Kosong = mengikuti hari baris induk" className="angka h-9 bg-card text-sm tabular-nums" />
                    <Input value={anak.qty} onChange={(e) => ubahAnak(j, { qty: e.target.value })} inputMode="numeric" placeholder="Jumlah" aria-label={`Jumlah sub-item ${j + 1} pada baris ${nomor}`} className="angka h-9 bg-card text-sm tabular-nums" />
                    <Input value={anak.unit} onChange={(e) => ubahAnak(j, { unit: e.target.value })} placeholder="Satuan" aria-label={`Satuan sub-item ${j + 1} pada baris ${nomor}`} className="h-9 bg-card text-sm" />
                    <Input value={anak.pax} onChange={(e) => ubahAnak(j, { pax: e.target.value })} inputMode="numeric" placeholder="Pax" aria-label={`Jumlah pax sub-item ${j + 1} pada baris ${nomor}`} title="Banyaknya pesanan. Kosong berarti 1." className="angka h-9 bg-card text-sm tabular-nums" />
                    <Input value={anak.price} onChange={(e) => ubahAnak(j, { price: e.target.value })} onBlur={(e) => ubahAnak(j, { price: rapikanRupiah(e.target.value) })} inputMode="numeric" placeholder="Harga" aria-label={`Harga sub-item ${j + 1} pada baris ${nomor}`} className="angka h-9 bg-card text-sm tabular-nums" />
                    <span className="uang text-right text-sm text-muted-foreground">
                      {rupiah(
                        (uraikanRupiah(anak.day) ?? uraikanRupiah(baris.day) ?? d(1))
                          .times(uraikanRupiah(anak.qty) ?? d(0))
                          .times(uraikanRupiah(anak.pax) ?? d(1))
                          .times(uraikanRupiah(anak.price) ?? d(0)),
                      )}
                    </span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {dikurangi.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-dashed bg-card px-3 py-2">
              <span className="text-sm text-muted-foreground">Dikurangi dari paket:</span>
              {dikurangi.map((m) => (
                <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-sm">
                  <span className="line-through decoration-muted-foreground/60">{m.nama}</span>
                  <button
                    type="button"
                    onClick={() => tambahAnak({ item_name: m.nama, menu_id: m.id })}
                    className="rounded-full px-2 py-0.5 text-xs font-medium text-primary hover:bg-card"
                  >
                    Kembalikan
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {paketAsal && (adaUbahanPaket || selisih !== 0) ? (
            <div className="flex flex-col gap-2 rounded-[10px] border border-info-garis bg-info-halus px-3.5 py-3">
              <p className="text-sm text-primary-strong">
                Harga dasar paket <b className="font-mono font-semibold">{rupiah(hargaDasar ?? 0)}</b>/porsi → sekarang{" "}
                <b className="font-mono font-semibold">{rupiah(hargaKini)}</b>
                {selisih !== 0 ? (
                  <span className={cn("ml-1 font-mono font-semibold", selisih > 0 ? "text-lunas" : "text-tempo")}>
                    ({selisih > 0 ? "+" : "−"}
                    {Math.abs(selisih).toLocaleString("id-ID")})
                  </span>
                ) : null}
              </p>
              {adaUbahanPaket ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">Isi diubah. Sesuaikan harga per porsi:</span>
                  {[-5000, -2500, 2500, 5000, 10000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => geserHarga(n)}
                      className="min-h-8 rounded-full border bg-card px-3 font-mono text-[0.8125rem] hover:border-primary/40"
                    >
                      {n > 0 ? "+" : "−"}
                      {Math.abs(n).toLocaleString("id-ID")}
                    </button>
                  ))}
                  {selisih !== 0 ? (
                    <button type="button" onClick={() => onUbah({ price: (hargaDasar ?? 0).toLocaleString("id-ID") }, "")} className="min-h-8 rounded-full px-3 text-[0.8125rem] font-medium text-primary hover:bg-card">
                      Kembali ke harga dasar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {menu.length ? (
              <div className="sm:w-80">
                <PilihCari pilihan={opsiMenu} onPilih={(o) => tambahAnak({ item_name: o.label, menu_id: o.id })} placeholder="+ Tambah / upgrade menu dari daftar…" />
              </div>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="self-start bg-card sm:self-auto" onClick={() => tambahAnak({})}>
              <Plus className="size-4" />
              Tulis isi sendiri
            </Button>
          </div>
        </div>
      ) : null}

      {/* Pilihan lanjutan — tertutup sampai dibutuhkan */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {baris.children.length === 0 && !tambahIsi ? (
          <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => setTambahIsi(true)}>
            <CornerDownRight className="size-4" />
            Rincian isi / menu
          </Button>
        ) : null}
        <SesiBaris baris={baris} nomor={nomor} tanggalAcara={tanggalAcara} onUbah={onUbah} />
        {!bukaPengali && !qtyBukanSatu ? (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setBukaPengali(true)}>
            <Plus className="size-4" />
            Pengali tambahan
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------------- */

/** Waktu untuk menggabung ketikan beruntun di riwayat urungkan — hanya dipanggil dari aksi pengguna, bukan saat render. */
const waktuSekarang = () => Date.now();

/* ---------- Bagian form (D-068, D-069) ---------- */

/** Pilihan jam cepat untuk acara — tetap bisa diubah lewat pemilih jam. */
const JAM_CEPAT: Record<string, string> = {
  "Pagi 07.00–09.00": "07.00–09.00",
  "Siang 11.00–13.00": "11.00–13.00",
  "Sore 15.00–17.00": "15.00–17.00",
  "Malam 18.00–21.00": "18.00–21.00",
};

const SARAN_KOSONG: SaranDokumen = { jenisAcara: JENIS_ACARA_UMUM, venue: [], planner: [], satuan: SATUAN_UMUM, biaya: BIAYA_UMUM };

const TAHAP = [
  { judul: "Customer", ket: "Untuk siapa" },
  { judul: "Acara", ket: "Tanggal & tempat" },
  { judul: "Menu & harga", ket: "Paket & porsi" },
  { judul: "Layanan & pajak", ket: "Lokasi, PBJT, ongkir" },
  { judul: "Biaya tambahan", ket: "Opsional" },
  { judul: "S&K & catatan", ket: "Lalu simpan" },
] as const;

/** Isian bergalat → langkah tempat isian itu berada. */
const LANGKAH_GALAT: Record<string, number> = {
  customer_id: 0,
  contact_person: 0,
  contact_phone: 0,
  po_reference: 0,
  tanggal: 0,
  tanggal_akhir: 0,
  event_dates: 1,
  event_time: 1,
  guest_count: 1,
  venue: 1,
  items: 2,
  service_charge_percent: 3,
  service_charge_minimum: 3,
  pb1_percent: 3,
  delivery_amount: 3,
  biaya_tambahan: 4,
  signatory_id: 4,
  payment_terms: 5,
  notes: 5,
};

function Penunjuk({
  langkah,
  selesai,
  onPilih,
  judulKedua,
}: {
  langkah: number;
  selesai: boolean[];
  onPilih: (n: number) => void;
  /** Bagian 2 berganti nama mengikuti jenis pesanan (D-070). */
  judulKedua: string;
}) {
  const daftar = useRef<HTMLOListElement>(null);
  // Di HP deretannya digeser: langkah aktif selalu terlihat.
  useEffect(() => {
    const el = daftar.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const ol = daftar.current;
    if (!el || !ol) return;
    const kotak = el.getBoundingClientRect();
    const wadah = ol.getBoundingClientRect();
    // ?. — lingkungan tanpa scrollTo (jsdom di tes) cukup dilewati.
    ol.scrollTo?.({ left: ol.scrollLeft + kotak.left - wadah.left - wadah.width / 2 + kotak.width / 2, behavior: "smooth" });
  }, [langkah]);
  return (
    <nav
      id="penunjuk-langkah"
      aria-label="Bagian form"
      className="sticky top-[60px] z-20 rounded-[14px] border bg-card/95 p-1.5 shadow-[0_6px_20px_-14px_rgba(31,42,92,0.35)] backdrop-blur lg:top-3"
    >
      <ol ref={daftar} className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {TAHAP.map((t, i) => {
          const aktif = i === langkah;
          return (
            <li key={t.judul} className="min-w-[84px] flex-1 sm:min-w-[96px]">
              <button
                type="button"
                onClick={() => onPilih(i)}
                aria-current={aktif ? "location" : undefined}
                className={cn(
                  "flex h-full w-full flex-col items-center gap-1 rounded-[10px] px-1.5 py-1.5 text-center transition-colors sm:gap-1.5 sm:py-2.5",
                  aktif ? "bg-accent" : "hover:bg-muted/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold sm:size-7 sm:text-sm",
                    aktif ? "bg-primary text-primary-foreground" : selesai[i] ? "bg-lunas-halus text-lunas" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {selesai[i] && !aktif ? <Check className="size-4" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className={cn("text-xs leading-tight font-semibold sm:text-[0.8125rem]", aktif ? "text-primary-strong" : "text-foreground")}>{i === 1 ? judulKedua : t.judul}</span>
                <span className="hidden text-xs leading-tight text-muted-foreground xl:block">{t.ket}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Langkah terakhir: apa yang masih kurang, dengan tombol ke langkahnya. */
function CekSebelumSimpan({ tampil, selesai, onPergi, adaJenis }: { tampil: boolean; selesai: boolean[]; onPergi: (n: number) => void; adaJenis: boolean }) {
  if (!tampil) return null;
  const wajib = (
    [
      [0, "Customer & tanggal dokumen belum lengkap", !selesai[0]],
      [1, "Jenis pesanan (event / retail) belum dipilih", !adaJenis],
      [2, "Belum ada menu yang berharga", !selesai[2]],
    ] as const
  ).filter(([, , kurang]) => kurang);
  if (wajib.length) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-[14px] border border-perhatian-garis bg-perhatian-halus px-5 py-4 text-perhatian">
        <p className="flex items-center gap-2 font-semibold">
          <CircleAlert className="size-5" /> Masih ada yang perlu dilengkapi
        </p>
        <ul className="flex flex-col gap-1.5">
          {wajib.map(([i, teks]) => (
            <li key={i} className="flex flex-wrap items-center gap-x-3">
              {teks}
              <button type="button" onClick={() => onPergi(i)} className="font-medium underline underline-offset-4">
                Ke bagian {i + 1}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-info-garis bg-info-halus px-5 py-4 text-primary-strong">
      <CircleCheck className="mt-0.5 size-5 shrink-0" />
      <p>
        <b className="font-semibold">Siap disimpan.</b> Periksa total di ringkasan{selesai[1] ? "" : " (tanggal belum diisi, boleh menyusul)"}, lalu tekan simpan.
      </p>
    </div>
  );
}

function Bidang({
  label,
  nama,
  galat,
  wajib,
  children,
}: {
  label: string;
  nama: string;
  galat?: string;
  wajib?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={nama}>
        {label}
        {wajib ? <span className="text-muted-foreground"> *</span> : null}
      </Label>
      {children}
      {galat ? <p className="text-xs text-destructive">{galat}</p> : null}
    </div>
  );
}

/**
 * "Tukar" satu isi paket dengan menu lain BERKATEGORI SAMA (01-SPEC C/E,
 * D-040). Harga baris tidak berubah — custom dihargai manual oleh sales
 * (02-ATURAN-BISNIS); HPP dihitung ulang di server dari menu penggantinya.
 */
/**
 * Pilih menu paket per kategori (D-082): chip per opsi — "pilih 1" bergantian,
 * "pilih 2" dibatasi, "termasuk" tampil sebagai teks, menu tambahan opsional.
 * Hasilnya langsung menjadi isi baris ("Soup: Sup Pelangi") — format PO Kitchen.
 */
function PilihSlot({
  slot,
  isi,
  nomor,
  onUbah,
}: {
  slot: SlotPaket[];
  isi: BarisForm["children"];
  nomor: number;
  onUbah: (isi: BarisForm["children"]) => void;
}) {
  const pilihan = bacaPilihan(
    isi.map((a) => a.item_name),
    slot,
  );
  const kurang = kategoriKurang(slot, pilihan);
  const wajib = slot.filter((s) => s.pilih > 0 && !s.tambahan).length;
  const ubah = (s: SlotPaket, nama: string) => {
    const baru = new Map(pilihan);
    baru.set(s.label, togglePilihan(s, pilihan.get(s.label) ?? [], nama));
    onUbah(susunIsi(isi, slot, baru, (item_name) => ({ kunci: crypto.randomUUID(), item_name, day: "", unit: "", qty: "", pax: "", price: "" })));
  };

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-info-garis bg-info-halus/50 p-4" role="group" aria-label={`Pilih menu paket baris ${nomor}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-primary-strong">Pilih menu paket</span>
        <span className={cn("text-sm", kurang.length ? "font-medium text-perhatian" : "text-lunas")}>
          {kurang.length ? `Belum lengkap: ${kurang.join(", ")}` : `✓ ${wajib} kategori lengkap`}
        </span>
      </div>
      {slot.map((s) => {
        const dipilih = pilihan.get(s.label) ?? [];
        const termasuk = s.pilih === 0 && !s.tambahan;
        const penuh = s.pilih > 1 && dipilih.length >= s.pilih;
        return (
          <div key={s.label} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">
                {termasuk
                  ? "termasuk"
                  : s.tambahan
                    ? "menu tambahan · biaya tambahan, opsional"
                    : s.pilih === 1
                      ? "pilih 1"
                      : `pilih ${s.pilih} · ${dipilih.length}/${s.pilih}`}
                {s.catatan && !s.tambahan && !termasuk && !/pilih/i.test(s.catatan) ? ` · ${s.catatan}` : ""}
              </span>
            </div>
            {termasuk ? (
              <p className="text-sm text-muted-foreground">{s.opsi.map((o) => o.nama).join(" · ")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {s.opsi.map((o) => {
                  const aktif = dipilih.includes(o.nama);
                  return (
                    <button
                      key={o.nama}
                      type="button"
                      aria-pressed={aktif}
                      disabled={!aktif && penuh}
                      onClick={() => ubah(s, o.nama)}
                      className={cn(
                        "min-h-8 rounded-full border px-3 text-[0.8125rem] transition-colors disabled:opacity-40",
                        aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:border-primary/40",
                      )}
                    >
                      {o.nama}
                      {o.hargaTambahan ? <span className="ml-1 font-mono opacity-75">+{o.hargaTambahan.toLocaleString("id-ID")}</span> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TukarMenu({
  anak,
  menu,
  menuPerId,
  buka,
  onBuka,
  onPilih,
}: {
  anak: BarisForm["children"][number];
  menu: PilihanMenu[];
  menuPerId: Map<string, PilihanMenu>;
  buka: boolean;
  onBuka: () => void;
  onPilih: (m: PilihanMenu, asli: string) => void;
}) {
  const asli = anak.swapped_from_menu_id ?? anak.menu_id!;
  const kategori = menuPerId.get(anak.menu_id!)?.kategori;
  // Sekategori dulu (tukar biasa), lalu kategori lain (upgrade, mis. ayam → udang; D-070).
  const pilihan = useMemo(() => {
    const opsi = (m: PilihanMenu) => ({
      id: m.id,
      label: m.nama,
      sub: m.id === asli ? "menu asli paket" : m.kategori !== kategori ? (KATEGORI_MENU[m.kategori as KategoriMenu] ?? m.kategori ?? undefined) : undefined,
    });
    const lain = menu.filter((m) => m.id !== anak.menu_id);
    return [...lain.filter((m) => m.kategori === kategori).map(opsi), ...lain.filter((m) => m.kategori !== kategori).map(opsi)];
  }, [menu, kategori, anak.menu_id, asli]);
  return (
    <>
      <Button
        type="button"
        variant={buka ? "secondary" : "outline"}
        size="icon"
        className="size-8 shrink-0 rounded-full"
        onClick={onBuka}
        title={buka ? "Batal tukar" : "Tukar dengan menu sekategori"}
        aria-label={`${buka ? "Batal tukar" : "Tukar"} ${anak.item_name}`}
        aria-expanded={buka}
      >
        <ArrowLeftRight className="size-3.5" />
      </Button>
      {anak.swapped_from_menu_id || buka ? (
        <div className="flex basis-full flex-col gap-1.5">
          {anak.swapped_from_menu_id ? (
            <span className="text-xs text-muted-foreground">
              ditukar dari {menuPerId.get(anak.swapped_from_menu_id)?.nama ?? "menu paket"}
            </span>
          ) : null}
          {buka ? (
            <PilihCari
          pilihan={pilihan}
          semuaSaatKosong
          autoFocus
          placeholder={`Pilih pengganti ${KATEGORI_MENU[kategori as KategoriMenu] ?? kategori}…`}
              onPilih={(o) => onPilih(menuPerId.get(o.id)!, asli)}
            />
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const chip = (aktif: boolean) =>
  `min-h-9 rounded-full border px-3.5 text-sm transition-colors ${aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent"}`;

/**
 * Sesi per hari (01-SPEC E.2, D-041): tanggal acara + jenis + jam untuk satu
 * baris. Tertutup bila kosong supaya form satu hari tetap ringkas.
 */
function SesiBaris({
  baris,
  nomor,
  tanggalAcara,
  onUbah,
}: {
  baris: BarisForm;
  nomor: number;
  tanggalAcara: string[];
  onUbah: (perubahan: Partial<BarisForm>) => void;
}) {
  const terisi = Boolean(baris.sesi_tanggal || baris.sesi_jenis || baris.sesi_jam);
  const [buka, setBuka] = useState(terisi);
  if (!buka && !terisi) {
    return (
      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setBuka(true)}>
        <Plus className="size-4" />
        Sesi (tanggal, jenis, jam)
      </Button>
    );
  }
  return (
    <div className="flex w-full basis-full flex-col gap-2.5 rounded-[12px] bg-muted/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Sesi baris {nomor}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => {
            onUbah({ sesi_tanggal: undefined, sesi_jenis: undefined, sesi_jam: undefined });
            setBuka(false);
          }}
        >
          Hapus sesi
        </Button>
      </div>
      {tanggalAcara.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Tanggal sesi baris ${nomor}`}>
          {tanggalAcara.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={baris.sesi_tanggal === t}
              onClick={() => onUbah({ sesi_tanggal: baris.sesi_tanggal === t ? undefined : t })}
              className={chip(baris.sesi_tanggal === t)}
            >
              {tanggalSesiPendek(t)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Isi tanggal acara di atas untuk memilih hari sesi ini.</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Jenis sesi baris ${nomor}`}>
        {JENIS_SESI.map((j) => (
          <button
            key={j}
            type="button"
            aria-pressed={baris.sesi_jenis === j}
            onClick={() => onUbah({ sesi_jenis: baris.sesi_jenis === j ? undefined : j })}
            className={chip(baris.sesi_jenis === j)}
          >
            {j}
          </button>
        ))}
        <div className="w-full sm:w-80">
          <PilihRentangJam value={baris.sesi_jam ?? ""} onChange={(v) => onUbah({ sesi_jam: v })} aria-label={`Jam sesi baris ${nomor}`} />
        </div>
      </div>
    </div>
  );
}
