"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  Calculator,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Copy,
  CornerDownRight,
  GripVertical,
  LoaderCircle,
  MoreHorizontal,
  PartyPopper,
  Pencil,
  Redo2,
  Plus,
  Search,
  Trash2,
  Truck,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { BagianForm } from "@/components/halaman";
import { KartuDaftarMenu, type DataMenuBaru } from "@/components/kartu-daftar-menu";
import { PaletMenu } from "@/components/palet-menu";
import { PilihCari } from "@/components/pilih-cari";
import { PilihDropdown } from "@/components/pilih-dropdown";
import { TeksSyarat } from "@/components/teks-syarat";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type BarisTanggalForm, tanggalKosong } from "@/lib/bentuk-form";
import { labelPelanggan } from "@/lib/kontak";
import { jumlahHariAcara } from "@/lib/tanggal";
import { partnerFee, usulanPembulatan } from "@/lib/hitung/quotation";
import { daftarkanMenuDariDokumen, kategoriMenuDariDokumen } from "@/app/(aplikasi)/menu/actions";
import { namaIsiBersih, peringkatIsi, posisiSisipIsi } from "@/lib/hitung/urutan-isi";
import { KANAL_LANGSUNG, SUMBER_ORDER } from "@/lib/hitung/rekanan";
import { JENIS_ACARA, tebakJenisAcara } from "@/lib/hitung/acara";
import { ISTILAH, JENIS_PESANAN, labelPpn } from "@/lib/istilah";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";
import { JENIS_SESI, labelSesi, tanggalSesiPendek } from "@/lib/sesi";
import { type BagianSyarat, type JenisPesanan, rakitSyarat, tebakJenisPesanan } from "@/lib/syarat";
import { d, hitungTotalDokumen, rupiah, subtotalBaris, uraikanRupiah } from "@/lib/uang";

import type { KeadaanDokumen } from "@/lib/dokumen";
import { InputSaran } from "@/components/input-saran";
import { InputMenu, type OpsiMenu } from "@/components/input-menu";
import { rapikanTeks } from "@/lib/cari-mirip";
import type { SaranRiwayat } from "@/lib/pilihan-builder";
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
  /** Rekanan yang membawa customer ini (D-132) — usulan sumber order. */
  rekanan?: string | null;
};

export type PilihanPenandatangan = { id: string; nama: string };

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
  /** Harga pricelist sudah termasuk pajak & layanan (D-083). */
  nett?: boolean;
};

/** Menu untuk "Tukar" isi paket (kategori sama, D-040). Tanpa HPP. */
export type PilihanMenu = { id: string; nama: string; kategori: string | null };

/** Tombol zona: mengisi persen & minimum layanan dan saran Delivery Fee (dari Angka Bisnis). */
/** Rekanan untuk isian sumber order; pct kosong = Partner Fee bawaan. */
export type OpsiRekanan = { id: string; label: string; sub?: string; pct: number | null };

export type AturanZona = { kunci: string; label: string; pct: number; min: number; delivery: number | null };

export type IsiAwal = {
  id?: string;
  /** Lead asal (D-047) — quotation baru ditautkan ke lead setelah disimpan. */
  lead_id?: string;
  /** Sumber order (D-137, quotation saja): langsung / rekanan / relasi / repeat + keterangannya. */
  order_source?: string;
  order_source_note?: string;
  partner_id?: string;
  /** Partner Fee order ini; kosong = ikut rekanan / bawaan Angka Bisnis. */
  partner_fee_pct?: string;
  customer_id: string;
  contact_person: string;
  contact_phone: string;
  /** Orang yang ikut di-CC (D-165); opsional, form lama boleh tidak mengirim. */
  contact_cc_name?: string;
  contact_cc_phone?: string;
  tanggal: string;
  tanggal_akhir: string;
  event_dates: BarisTanggalForm[];
  event_type: string;
  /** Jenis acara (D-163); event_type = nama acara. */
  event_category?: string;
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
  /** Menu dapur yang dipilih dari saran nama (D-141); hilang begitu namanya diketik ulang. */
  menu_id?: string;
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
  /** Sesi tempat baris ini (UI saja). Nilai sesi_* di atas diisi dari sesinya saat simpan. */
  sesi_kunci?: string;
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

/** Satu sesi acara (D-041, alur "sesi dulu baru menu"): hari + jenis + jam. */
type SesiForm = { kunci: string; tanggal: string; jenis: string; jam: string };

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
  penandatangan,
  aksi,
  istilah,
  medanTambahan,
  pakaiReferensiPo = false,
  paket = [],
  menu: menuAwal = [],
  syarat = [],
  aturanZona = [],
  saran = SARAN_KOSONG,
  kop,
  sumber,
  hargaJual = [],
}: {
  isiAwal: IsiAwal;
  pelanggan: PilihanPelanggan[];
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
  /** Isian "Order dari mana?" + Partner Fee (D-137). Hanya quotation; tidak tercetak ke klien. */
  sumber?: { rekanan: OpsiRekanan[]; feeBawaan: number };
  /** Harga jual katalog & yang pernah dipakai, untuk saran nama baris (D-141). */
  hargaJual?: SaranRiwayat[];
}) {
  const [keadaan, kirim, sedangKirim] = useActionState(aksi, keadaanAwal);
  // Daftar menu bisa bertambah kategori dari form (D-159) — disimpan di sini supaya semua baris ikut tahu.
  const [menu, setMenu] = useState(menuAwal);
  // Cek rekap sebelum simpan (D-143): setiap submit (tombol atau Enter) dibelokkan ke dialog
  // rekap; baru tersimpan setelah "Ya, simpan".
  const refForm = useRef<HTMLFormElement>(null);
  const lolosCek = useRef(false);
  const [bukaCek, setBukaCek] = useState(false);
  // Slot tombol di kanan judul halaman (D-157): halaman menaruh <SlotAksiDokumen />, form mengisinya lewat portal.
  const [slotAksi, setSlotAksi] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Elemen milik halaman (di luar komponen ini) — dicari sekali setelah tampil.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotAksi(document.getElementById("aksi-dokumen"));
  }, []);

  // Formulir tidak pernah dibuka dalam keadaan tanpa baris sama sekali —
  // baris kosong pertama disiapkan di sini supaya halaman baru langsung
  // bisa diketik tanpa menekan "Tambah baris" lebih dulu.
  // Sesi diturunkan dari baris lama: tiap kombinasi tanggal+jenis+jam = satu sesi.
  const [awal] = useState(() => {
    const sesi: SesiForm[] = [];
    const items = isiAwal.items.map((b) => {
      if (!b.sesi_tanggal && !b.sesi_jenis && !b.sesi_jam) return b;
      const s = { tanggal: b.sesi_tanggal ?? "", jenis: b.sesi_jenis ?? "", jam: b.sesi_jam ?? "" };
      let ada = sesi.find((x) => x.tanggal === s.tanggal && x.jenis === s.jenis && x.jam === s.jam);
      if (!ada) sesi.push((ada = { kunci: `s${sesi.length}`, ...s }));
      return { ...b, sesi_kunci: ada.kunci };
    });
    return { sesi, items };
  });
  const [sesiList, setSesiList] = useState<SesiForm[]>(awal.sesi);
  const [f, setF] = useState<IsiAwal>(() => ({
    ...isiAwal,
    // Dokumen lama tanpa jenis pesanan (D-070): ditebak dari barisnya — ada baris
    // kena layanan = event, selain itu retail. Dokumen baru wajib dipilih.
    order_type: isiAwal.order_type || (isiAwal.items.length ? (isiAwal.items.some((b) => b.charge_service) ? "event" : "retail") : ""),
    // Kunci tetap (bukan UUID acak) — dirender di data-kunci-baris, harus sama di server & browser.
    items: awal.items.length > 0 ? awal.items : [{ ...barisKosong(), kunci: "baris-awal" }],
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
        // Customer bawaan rekanan → usulan sumber order, hanya bila belum diisi.
        ...(sumber && !lama.order_source && dipilih?.rekanan ? { order_source: "rekanan", partner_id: dipilih.rekanan } : {}),
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

  // Baris diurutkan per sesi (urutan sesi, lalu "tanpa sesi"); nilai sesi_* diisi dari
  // sesinya — satu sumber, jadi mengubah jam sesi langsung berlaku ke semua menunya.
  const urutSesi = useMemo(() => new Map(sesiList.map((s, k) => [s.kunci, k])), [sesiList]);
  const posisiSesi = (b: BarisForm) => urutSesi.get(b.sesi_kunci ?? "") ?? sesiList.length;
  const urutan = f.items.map((_, i) => i).sort((a, b) => posisiSesi(f.items[a]) - posisiSesi(f.items[b]) || a - b);
  const itemsSesi = urutan.map((i) => {
    const b = f.items[i];
    const s = sesiList[urutSesi.get(b.sesi_kunci ?? "") ?? -1];
    // Acara satu hari: tanggal sesi selalu tanggal acara (pilihannya tidak ditampilkan).
    const tanggal = s ? (tanggalAcaraIsi.length === 1 ? tanggalAcaraIsi[0] : s.tanggal) : "";
    return { ...b, sesi_tanggal: tanggal || undefined, sesi_jenis: s?.jenis || undefined, sesi_jam: s?.jam || undefined };
  });

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

  const isiDokumen = () => isiPratinjau({ ...f, items: itemsSesi }, total, kop!, pelanggan);

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
  const saranJenis = saran.jenisAcara.length ? saran.jenisAcara : JENIS_ACARA_UMUM;
  // Jenis acara ikut tebakan nama sampai dipilih sendiri; dokumen yang sudah berjenis tidak ditimpa.
  const [jenisManual, setJenisManual] = useState(Boolean(isiAwal.event_category));
  const [ubahSyarat, setUbahSyarat] = useState(false);
  const [adaCc, setAdaCc] = useState(Boolean(isiAwal.contact_cc_name?.trim() || isiAwal.contact_cc_phone?.trim()));

  /** Satu paket menjadi satu baris berharga + isi menunya sebagai sub-item tanpa harga. */
  function barisPaket(p: PilihanPaket): BarisForm {
    return {
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
  }

  /**
   * Isi baris dari saran nama (D-141). Paket → baris paket utuh (hari, porsi, sesi tetap);
   * menu/katalog/riwayat → nama, satuan, harga jual terakhir bila ada, tertaut ke menu dapur.
   */
  function dariSaran(o: OpsiMenu, dasar: BarisForm): BarisForm {
    const p = o.jenis === "paket" ? paket.find((x) => x.id === o.id) : undefined;
    if (p) return { ...barisPaket(p), kunci: dasar.kunci, sesi_kunci: dasar.sesi_kunci, day: dasar.day, pax: dasar.pax };
    return {
      ...dasar,
      item_name: o.label,
      menu_id: o.menuId ?? undefined,
      product_id: "",
      ...(dasar.package_id ? { package_id: undefined, children: [] } : {}),
      unit: o.satuan || dasar.unit || "porsi",
      price: o.harga ? Number(o.harga).toLocaleString("id-ID") : dasar.price,
    };
  }

  /**
   * Sorot (D-155): layar ikut ke baris/sesi itu lalu baris menyala lembut satu warna (±1,8 dtk) dan nomornya
   * membesar sebentar — supaya jelas bagi pengguna mana yang baru dipindah/dituju. Web Animations API: tanpa CSS
   * tambahan, tidak mengubah tata letak. Gerak dimatikan bila pengguna memilih kurangi gerakan.
   */
  const sorot = (pemilih: string) =>
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(pemilih);
      if (!el) return;
      const kurangi = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView?.({ block: "center", behavior: kurangi ? "auto" : "smooth" });
      el.animate?.([{ backgroundColor: "color-mix(in oklab, var(--primary) 14%, transparent)" }, { backgroundColor: "transparent" }], { duration: 1800, easing: "ease-out" });
      if (!kurangi)
        el.querySelector<HTMLElement>("[data-nomor-baris]")?.animate?.(
          [{ transform: "scale(1.4)", backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }, { transform: "scale(1)" }],
          { duration: 1000, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
        );
    }, 60);
  const sorotBaris = (kunci: string) => sorot(`[data-kunci-baris="${kunci}"]`);

  const fokusBaris = (kunci: string, pemilih: string) =>
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-kunci-baris="${kunci}"] ${pemilih}`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);

  /**
   * Baris baru masuk di BAWAH (urut seperti dokumennya), tepat di atas kotak tambah.
   * Satu-satunya baris yang masih kosong diganti, bukan ditumpuk.
   */
  function sisipkan(baris: BarisForm, pemilih: string) {
    catat();
    setF((lama) => {
      const [a] = lama.items;
      const kosong = lama.items.length === 1 && !a.item_name.trim() && !a.price.trim() && a.children.length === 0;
      return { ...lama, items: kosong ? [baris] : [...lama.items, baris] };
    });
    fokusBaris(baris.kunci, pemilih);
  }

  /** Sisipkan baris kosong tepat di bawah baris ke-i (seperti insert row di spreadsheet), di sesi yang sama. */
  function sisipkanSetelah(i: number) {
    const baris: BarisForm = { ...barisKosong(), sesi_kunci: f.items[i]?.sesi_kunci, charge_service: f.order_type !== "retail" };
    catat();
    setF((lama) => ({ ...lama, items: [...lama.items.slice(0, i + 1), baris, ...lama.items.slice(i + 1)] }));
    fokusBaris(baris.kunci, "[data-nama-baris]");
    sorotBaris(baris.kunci);
  }

  function tambahDariSaran(o: OpsiMenu, sesiKunci?: string) {
    const baris = dariSaran(o, { ...barisKosong(), sesi_kunci: sesiKunci, charge_service: f.order_type !== "retail" });
    // Tanpa jumlah porsi nilainya tetap harga satu porsi — langsung minta porsinya.
    sisipkan(baris, '[aria-label^="Jumlah pax baris"]');
  }

  function tambahBaris(sesiKunci?: string, nama = "") {
    const baris: BarisForm = { ...barisKosong(), item_name: nama, sesi_kunci: sesiKunci, charge_service: f.order_type !== "retail" };
    sisipkan(baris, nama ? '[aria-label^="Jumlah pax baris"]' : "[data-nama-baris]");
  }

  function tambahSesi() {
    const sesi: SesiForm = { kunci: crypto.randomUUID(), tanggal: "", jenis: "", jam: "" };
    setSesiList((l) => [...l, sesi]);
    // Sesi pertama mengambil baris kosong bawaan supaya tidak tertinggal di "belum masuk sesi".
    setF((lama) => {
      const [b] = lama.items;
      const kosong = lama.items.length === 1 && !b.sesi_kunci && !b.item_name.trim() && !b.price.trim() && b.children.length === 0;
      return kosong ? { ...lama, items: [{ ...b, sesi_kunci: sesi.kunci }] } : lama;
    });
  }

  function hapusSesi(kunci: string) {
    const isi = f.items.filter((b) => b.sesi_kunci === kunci).length;
    setSesiList((l) => l.filter((s) => s.kunci !== kunci));
    setF((lama) => ({ ...lama, items: lama.items.map((b) => (b.sesi_kunci === kunci ? { ...b, sesi_kunci: undefined } : b)) }));
    if (isi) toast.info(`Sesi dihapus. ${isi} menu-nya pindah ke "Belum masuk sesi", tidak ikut terhapus.`);
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

  const labelSesiPendek = (s: SesiForm, k: number) =>
    [s.tanggal && tanggalAcaraIsi.length > 1 ? tanggalSesiPendek(s.tanggal) : "", s.jenis, s.jam].filter(Boolean).join(" · ") || `Sesi ${k + 1}`;

  // Saran nama baris (D-141): menu dapur (+ harga jual terakhirnya), katalog & menu yang pernah dijual, paket.
  const opsiBaris = useMemo<OpsiMenu[]>(() => {
    const perNama = new Map(hargaJual.map((r) => [rapikanTeks(r.nama), r]));
    const perMenu = new Map(hargaJual.filter((r) => r.menuId).map((r) => [r.menuId!, r]));
    const terpakai = new Set<string>();
    const o: OpsiMenu[] = [];
    for (const m of menu) {
      const r = perMenu.get(m.id) ?? perNama.get(rapikanTeks(m.nama));
      if (r) terpakai.add(rapikanTeks(r.nama));
      const kat = m.kategori ? (KATEGORI_MENU[m.kategori as KategoriMenu] ?? m.kategori) : null;
      o.push({ kunci: `m${m.id}`, jenis: "menu", id: m.id, label: m.nama, cari: [m.nama], sub: kat, harga: r?.harga, satuan: r?.satuan, menuId: m.id });
    }
    for (const [k, r] of perNama) {
      if (!terpakai.has(k)) o.push({ kunci: `r${k}`, jenis: r.katalog ? "katalog" : "riwayat", label: r.nama, cari: [r.nama], harga: r.harga, satuan: r.satuan, menuId: r.menuId });
    }
    for (const p of paket) {
      o.push({ kunci: `p${p.id}`, jenis: "paket", id: p.id, label: `[${p.kode}] ${p.nama}`, cari: [p.nama, p.kode], sub: p.isi.slice(0, 3).map((x) => x.nama).join(", ") || null, harga: Number(p.harga) ? p.harga : null, satuan: p.satuan });
    }
    return o;
  }, [menu, hargaJual, paket]);

  const bilahTambah = (sesiKunci?: string) => (
    <TambahMenu opsi={opsiBaris} onPilih={(o) => tambahDariSaran(o, sesiKunci)} onBaru={(nama) => tambahBaris(sesiKunci, nama)} />
  );

  /** Naik/turun satu langkah di dalam sesinya (dipakai tombol di baris & panel kiri, D-155). */
  function geserBaris(i: number, arah: -1 | 1) {
    const b = f.items[i];
    const kelompok = urutan.filter((x) => posisiSesi(f.items[x]) === posisiSesi(b));
    const j = kelompok[kelompok.indexOf(i) + arah];
    if (j === undefined) return;
    catat();
    setF((lama) => {
      // Tukar dengan tetangga di sesi yang sama, bukan tetangga di larik.
      const items = [...lama.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...lama, items };
    });
    // Layar ikut baris yang dipindah + kabar jelas nomor barunya.
    sorotBaris(b.kunci);
    beritahu(`Baris "${b.item_name.trim() || "baru"}" pindah ke nomor ${urutan.indexOf(j) + 1}`);
  }

  /** Duplikat baris tepat di bawahnya (isi & sub-item ikut, kunci baru). */
  function salinBaris(i: number) {
    const asal = f.items[i];
    const salinan: BarisForm = { ...asal, kunci: crypto.randomUUID(), children: asal.children.map((a) => ({ ...a, kunci: crypto.randomUUID() })) };
    catat();
    setF((lama) => ({ ...lama, items: [...lama.items.slice(0, i + 1), salinan, ...lama.items.slice(i + 1)] }));
    sorotBaris(salinan.kunci);
    beritahu(`Baris "${asal.item_name.trim() || "baru"}" diduplikat jadi nomor ${urutan.indexOf(i) + 2}`);
  }

  /** Seret-lepas di panel kiri: baris `dari` ditaruh di posisi baris `ke` (ikut sesinya). */
  function pindahKe(dari: string, ke: string) {
    if (dari === ke) return;
    const posDari = urutan.findIndex((x) => f.items[x].kunci === dari);
    const posKe = urutan.findIndex((x) => f.items[x].kunci === ke);
    if (posDari < 0 || posKe < 0) return;
    const turun = posDari < posKe;
    const b = f.items[urutan[posDari]];
    catat();
    setF((lama) => {
      const items = [...lama.items];
      const [x] = items.splice(items.findIndex((y) => y.kunci === dari), 1);
      const t = items.findIndex((y) => y.kunci === ke);
      items.splice(turun ? t + 1 : t, 0, { ...x, sesi_kunci: items[t].sesi_kunci });
      return { ...lama, items };
    });
    sorotBaris(dari);
    beritahu(`Baris "${b.item_name.trim() || "baru"}" pindah ke nomor ${posKe + 1}`);
  }

  const daftarBaris = (indeks: number[]) => (
        <ul className="flex flex-col divide-y divide-border-row">
          {indeks.map((i) => {
            const b = f.items[i];
            const kelompok = urutan.filter((x) => posisiSesi(f.items[x]) === posisiSesi(b));
            const di = kelompok.indexOf(i);
            return (
            <BarisItem
              key={b.kunci}
              baris={b}
              nomor={urutan.indexOf(i) + 1}
              menu={menu}
              onKategoriMenu={(id, k) => setMenu((l) => l.map((m) => (m.id === id ? { ...m, kategori: k } : m)))}
              onMenuBaru={(m) => setMenu((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))}
              pilihanSesi={sesiList.map((s, k) => ({ kunci: s.kunci, label: labelSesiPendek(s, k) }))}
              opsiBaris={opsiBaris}
              onPilihSaran={(o) => {
                catat();
                setF((lama) => ({ ...lama, items: lama.items.map((x, y) => (y === i ? dariSaran(o, x) : x)) }));
                if (o.jenis === "paket" || o.harga) fokusBaris(b.kunci, '[aria-label^="Jumlah pax baris"]');
              }}
              bisaHapus={f.items.length > 1}
              bisaNaik={di > 0}
              bisaTurun={di < kelompok.length - 1}
              onUbah={(perubahan, aksi) => ubahBaris(i, perubahan, aksi)}
              onPindahSesi={(kunci) => ubahBaris(i, { sesi_kunci: kunci }, "")}
              onHapus={() => {
                catat();
                setF((lama) => ({ ...lama, items: lama.items.filter((_, x) => x !== i) }));
                beritahu(`Baris ${urutan.indexOf(i) + 1}${b.item_name.trim() ? ` "${b.item_name.trim()}"` : ""} dihapus`);
              }}
              onSisip={() => sisipkanSetelah(i)}
              onSalin={() => salinBaris(i)}
              saranSatuan={saran.satuan.length ? saran.satuan : SATUAN_UMUM}
              jumlahTamu={retail ? "" : f.guest_count}
              retail={retail}
              paketAsal={b.package_id ? paket.find((p) => p.id === b.package_id) : undefined}
              onPindah={(arah) => geserBaris(i, arah)}
            />
            );
          })}
        </ul>
  );

  // Baris yang sedang terlihat di layar (D-155) — disorot di panel kiri. Pita pengamatan di tengah layar.
  const [barisTampak, setBarisTampak] = useState<string | null>(null);
  const kunciBaris = f.items.map((b) => b.kunci).join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const amat = new IntersectionObserver(
      (masuk) => {
        const kena = masuk.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.kunciBaris);
        if (kena[0]) setBarisTampak(kena[0]);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    document.querySelectorAll("[data-kunci-baris]").forEach((el) => amat.observe(el));
    return () => amat.disconnect();
  }, [kunciBaris]);

  // Ringkasan tiap bagian untuk panel langkah kiri (D-155): cukup untuk tahu isinya tanpa menggulir.
  const kecil = "text-[0.8125rem] text-muted-foreground";
  const kelompokMenu: KelompokPanel[] = [];
  itemsSesi.forEach((b, n) => {
    const sesiKunci = urutSesi.has(b.sesi_kunci ?? "") ? b.sesi_kunci : undefined;
    const label = [b.sesi_jenis, b.sesi_jam].filter(Boolean).join(" · ") || (sesiKunci ? `Sesi ${(urutSesi.get(sesiKunci) ?? 0) + 1}` : "");
    const k = kelompokMenu.at(-1);
    const isi = { kunci: b.kunci, nomor: n + 1, nama: b.item_name.trim() };
    if (k && k.sesiKunci === sesiKunci) k.baris.push(isi);
    else kelompokMenu.push({ label, sesiKunci, baris: [isi] });
  });
  const indeksKunci = (kunci: string) => f.items.findIndex((x) => x.kunci === kunci);
  const pelangganDipilih = pelanggan.find((p) => p.id === f.customer_id);
  const isiPanel: React.ReactNode[] = [
    <p key="0" className={kecil}>{pelangganDipilih ? pelangganDipilih.nama : "Customer belum dipilih"}</p>,
    <p key="1" className={kecil}>
      {[tanggalAcaraIsi.map((t) => tanggalSesiPendek(t)).join(", ") || "Tanggal belum diisi", f.venue.trim()].filter(Boolean).join(" · ")}
    </p>,
    <DaftarBarisPanel
      key="2"
      kelompok={kelompokMenu}
      aktif={barisTampak}
      onPilih={sorotBaris}
      onGeser={(kunci, arah) => geserBaris(indeksKunci(kunci), arah)}
      onSalin={(kunci) => salinBaris(indeksKunci(kunci))}
      onPindahKe={pindahKe}
      onTambah={(sesiKunci) => tambahBaris(sesiKunci)}
    />,
    <div key="3" className={kecil}>
      {rincianTotal.slice(1).length ? rincianTotal.slice(1).map(([l, n]) => <p key={l}>{l} {n}</p>) : <p>Belum ada pajak / layanan</p>}
    </div>,
    <p key="4" className={kecil}>
      {f.biaya_tambahan.filter((b) => b.label.trim()).length ? `${f.biaya_tambahan.filter((b) => b.label.trim()).length} biaya tambahan` : "Tidak ada"}
    </p>,
    <p key="5" className={kecil}>{f.payment_terms.trim() ? "S&K sudah diisi" : "S&K belum diisi"}{f.notes.trim() ? " · ada catatan" : ""}</p>,
  ];

  // Total + rincian (klik) — dipakai panel kiri (layar lebar) dan bilah bawah (HP).
  const totalRincian = (kotak = false) => (
  <Popover>
    <PopoverTrigger
      className={cn(
        "flex min-w-0 text-left transition-colors",
        // kotak: sejajar & setinggi tombol di sebelahnya (kanan judul halaman).
        kotak ? "h-11 items-baseline gap-2 rounded-[10px] border bg-card px-3.5 py-2.5 hover:bg-muted/60" : "-mx-2 flex-col items-start rounded-[10px] px-2 py-1 hover:bg-muted/70",
      )}
      aria-label="Lihat rincian total"
    >
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        Total{kotak ? null : <span className="hidden sm:inline"> · {f.items.length} baris · lihat rincian</span>}
      </span>
      <span className={cn("uang truncate leading-tight", kotak ? "text-lg" : "text-lg sm:text-xl")}>{rupiah(total.grand_total)}</span>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-72">
      <dl className="flex flex-col gap-2 text-[0.9375rem]">
        {rincianTotal.map(([label, nilai]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{nilai}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-border-row pt-2">
          <dt className="font-semibold">Total</dt>
          <dd className="uang">{rupiah(total.grand_total)}</dd>
        </div>
      </dl>
    </PopoverContent>
  </Popover>
  );
  const tombolSimpanLabel = sedangKirim ? "Menyimpan…" : istilah.tombolSimpan;

  const muatan = JSON.stringify({
    id: f.id ?? null,
    customer_id: f.customer_id,
    contact_person: f.contact_person,
    contact_phone: f.contact_phone,
    contact_cc_name: f.contact_cc_name ?? "",
    contact_cc_phone: f.contact_cc_phone ?? "",
    tanggal: f.tanggal,
    tanggal_akhir: f.tanggal_akhir,
    event_dates: f.event_dates.map((b) => b.tanggal).filter((s) => s !== ""),
    event_type: f.event_type,
    event_category: f.event_category || null,
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
    order_source: f.order_source || null,
    order_source_note: f.order_source === "langsung" || f.order_source === "relasi" ? f.order_source_note?.trim() || null : null,
    partner_id: f.order_source === "rekanan" ? f.partner_id || null : null,
    partner_fee_pct: f.order_source === "rekanan" ? f.partner_fee_pct?.trim() || null : null,
    po_reference: f.po_reference || null,
    show_payment_terms: f.show_payment_terms,
    payment_terms: f.payment_terms,
    items: itemsSesi.map((b) => ({
      product_id: b.product_id || null,
      package_id: b.package_id || null,
      menu_id: b.menu_id || null,
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
    <form
      id="form-dokumen"
      ref={refForm}
      action={kirim}
      onSubmit={(e) => {
        if (lolosCek.current) {
          lolosCek.current = false;
          return;
        }
        e.preventDefault();
        setBukaCek(true);
      }}
      // Layar lebar (D-155): panel langkah di kiri (kerangka aplikasi diciutkan otomatis), isi di kanan.
      className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[236px_minmax(0,1fr)]"
    >
      <PanelLangkah
        langkah={aktif}
        selesai={selesai}
        onPilih={lompat}
        judulKedua={retail ? "Pengiriman" : jenis ? "Acara" : "Jenis pesanan"}
        isi={isiPanel}
        kaki={
          // Total & simpan di bawah panel kiri (D-155): tidak lagi bilah melayang di atas isi form.
          <>
            {totalRincian()}
            <Button type="submit" className="h-11 w-full" disabled={sedangKirim}>
              {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
              {tombolSimpanLabel}
            </Button>
            {kop ? <TombolPratinjau isi={isiDokumen} className="h-10 w-full" /> : null}
          </>
        }
      />
      {/* Kanan judul halaman (layar lebar): terlihat begitu halaman dibuka; panel kiri menjaga Simpan saat menggulir. */}
      {slotAksi
        ? createPortal(
            <>
              {totalRincian(true)}
              <Button type="button" variant="ghost" className="h-11 text-muted-foreground" render={<Link href={istilah.batalHref} />}>
                Batal
              </Button>
              {kop ? <TombolPratinjau isi={isiDokumen} className="h-11 px-4" /> : null}
              <Button type="submit" form="form-dokumen" className="h-11 px-5" disabled={sedangKirim}>
                {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
                {tombolSimpanLabel}
              </Button>
            </>,
            slotAksi,
          )
        : null}
      <input type="hidden" name="muatan" value={muatan} />
      {Object.entries(medanTambahan ?? {}).map(([nama, nilai]) => (
        <input key={nama} type="hidden" name={nama} value={nilai} />
      ))}

      <div className="flex min-w-0 flex-col gap-3.5 lg:col-start-2">

      {keadaan.pesan ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
        >
          {keadaan.pesan}
        </p>
      ) : null}

      <Penunjuk
        kelas="lg:hidden"
        langkah={aktif}
        selesai={selesai}
        onPilih={lompat}
        judulKedua={retail ? "Pengiriman" : jenis ? "Acara" : "Jenis pesanan"}
        baris={urutan.map((x, n) => ({ kunci: f.items[x].kunci, nomor: n + 1, nama: f.items[x].item_name.trim() }))}
        onBaris={sorotBaris}
      />

      <div id="bagian-0" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Langkah 1: customer & tanggal ---------- */}
      <BagianForm nomor={1} judul="Customer" keterangan={`Untuk siapa ${istilah.kata} ini, dan sampai kapan berlaku.`}>
        {sumber ? (
          <SumberOrder
            f={f}
            ubah={(u) => setF((lama) => ({ ...lama, ...u }))}
            rekanan={sumber.rekanan}
            feeBawaan={sumber.feeBawaan}
            nilaiMenu={total.subtotal.toNumber()}
          />
        ) : null}
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
          {/* Kontak CC (D-165): kolom sendiri, bukan "Nama / Cc: Nama2" di satu isian. */}
          {adaCc ? (
            <>
              <Bidang label="Nama CC" nama="contact_cc_name">
                <Input
                  id="contact_cc_name"
                  value={f.contact_cc_name ?? ""}
                  onChange={(e) => ubah("contact_cc_name", e.target.value)}
                  placeholder="Orang yang ikut di-CC, mis. Mbak Aniek"
                  autoFocus={!isiAwal.contact_cc_name}
                />
              </Bidang>
              <Bidang label="Telepon CC" nama="contact_cc_phone">
                <Input
                  id="contact_cc_phone"
                  value={f.contact_cc_phone ?? ""}
                  onChange={(e) => ubah("contact_cc_phone", e.target.value)}
                  placeholder="0812… (boleh kosong)"
                />
              </Bidang>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-mt-2 self-start justify-self-start text-muted-foreground sm:col-span-2"
                onClick={() => {
                  setF((lama) => ({ ...lama, contact_cc_name: "", contact_cc_phone: "" }));
                  setAdaCc(false);
                }}
              >
                <X className="size-4" />
                Hapus kontak CC
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="-mt-1 self-start justify-self-start text-primary sm:col-span-2" onClick={() => setAdaCc(true)}>
              <Plus className="size-4" />
              Tambah kontak CC
            </Button>
          )}
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
            {/* Satu grid dua kolom (D-162): tanggal | jam, jenis | tamu, venue | planner — tanpa kolom kosong. */}
            <div className="grid items-start gap-x-6 gap-y-5 sm:grid-cols-2">
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
              {/* Jumlah hari DIHITUNG dari tanggalnya, tidak diketik (dokumen "3 hari" dengan 2 tanggal tidak akan ditegur
                  siapa pun). Cukup keterangan kecil (D-162), bukan kolom sendiri yang menyisakan ruang kosong. */}
              <p className="text-xs text-muted-foreground">{jumlahHari > 0 ? `${jumlahHari} hari · dihitung dari tanggalnya` : "Belum ada tanggal"}</p>
            </div>
          </Bidang>

          <Bidang label={retail ? "Jam tiba / kirim" : "Jam"} nama="event_time">
            <PilihRentangJam value={f.event_time} onChange={(v) => ubah("event_time", v)} aria-label={retail ? "Jam kirim" : "Jam acara"} />
          </Bidang>

            {retail ? (
              <div className="sm:col-span-2"><Bidang label="Alamat pengiriman" nama="venue">
                <InputSaran id="venue" value={f.venue} onChange={(v) => ubah("venue", v)} saran={saran.venue} placeholder="Jalan, nomor, kelurahan, patokan…" />
              </Bidang></div>
            ) : null}

              {/* Nama acara ≠ jenis acara (D-163): "BRIN Business Lunch (Guest Visit)" adalah nama (event_type, tercetak
                  di dokumen); jenisnya "Meeting / business lunch" (event_category) — ditebak dari nama, bisa diganti. */}
              <Bidang label={retail ? "Keperluan (opsional)" : "Nama acara"} nama="event_type">
                <InputSaran
                  id="event_type"
                  value={f.event_type}
                  onChange={(v) =>
                    setF((lama) => ({ ...lama, event_type: v, ...(jenisManual ? {} : { event_category: tebakJenisAcara(v) ?? "" }) }))
                  }
                  saran={saranJenis}
                  placeholder={retail ? "Ketik atau pilih…" : "mis. BRIN Business Lunch (Guest Visit)"}
                />
              </Bidang>
              {retail ? null : (
                <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-start gap-3">
                  <Bidang label="Jenis acara" nama="event_category">
                    <PilihDropdown
                      id="event_category"
                      nilai={f.event_category ?? ""}
                      kelompok={[{ opsi: OPSI_JENIS_ACARA }]}
                      onPilih={(v) => {
                        setJenisManual(true);
                        ubah("event_category", v);
                      }}
                      placeholder="Pilih jenis…"
                    />
                  </Bidang>
                  <Bidang label="Jumlah tamu" nama="guest_count">
                    <Input id="guest_count" inputMode="numeric" value={f.guest_count} onChange={(e) => ubah("guest_count", e.target.value)} placeholder="300" />
                  </Bidang>
                </div>
              )}
              {retail ? (
                <Bidang label="Sales / PIC" nama="fnb_planner">
                  <InputSaran id="fnb_planner" value={f.fnb_planner} onChange={(v) => ubah("fnb_planner", v)} saran={saran.planner} placeholder="Ketik atau pilih nama…" />
                </Bidang>
              ) : null}

            {retail ? null : (
              <>
                <Bidang label="Venue" nama="venue">
                  <InputSaran id="venue" value={f.venue} onChange={(v) => ubah("venue", v)} saran={saran.venue} placeholder="mis. Gedung Serbaguna, Bogor" />
                </Bidang>
                <Bidang label="F&B planner" nama="fnb_planner">
                  <InputSaran id="fnb_planner" value={f.fnb_planner} onChange={(v) => ubah("fnb_planner", v)} saran={saran.planner} placeholder="Ketik atau pilih nama…" />
                </Bidang>
              </>
            )}
            </div>
          </>
        ) : null}
      </BagianForm>

      </div>

      <div id="bagian-2" className="flex scroll-mt-32 flex-col gap-3.5">
      {/* ---------- Langkah 3: menu & harga ---------- */}
      <BagianForm
        nomor={3}
        judul="Menu & harga"
        keterangan="Ketik nama menu atau kode paket di kotak tambah; harga ikut terisi. Nilai tiap baris = Day × Qty × Pax × Harga Satuan, sama dengan kolom di dokumen."
      >
        {keadaan.galat?.items ? (
          <p role="alert" className="text-sm text-destructive">
            {keadaan.galat.items}
          </p>
        ) : null}

        {/* Sesi dulu, baru menu: tiap sesi (hari + jenis + jam) punya paket & menunya sendiri. */}
        {sesiList.length ? null : (
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-info-garis bg-info-halus px-4 py-3">
            <span className="min-w-0 flex-1 text-sm text-primary-strong">Ada beberapa waktu makan, mis. Coffee Break, Lunch, Dinner? Bagi per sesi dulu.</span>
            <Button type="button" variant="outline" size="sm" className="rounded-full bg-card" onClick={tambahSesi}>
              <Plus className="size-4" />
              Bagi per sesi
            </Button>
          </div>
        )}

        {(() => {
          // Paket ber-harga nett (D-083) sudah termasuk pajak & layanan — jangan dikenai dua kali.
          const nett = f.items.filter((b) => b.package_id && paket.find((p) => p.id === b.package_id)?.nett);
          const masihKena = f.pb1_enabled || Boolean(f.service_charge_percent.trim()) || nett.some((b) => b.charge_service);
          if (!nett.length || !masihKena) return null;
          return (
            <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-sm text-perhatian">
              <span className="min-w-0 flex-1">
                <b className="font-semibold">Harga nett</b> (sudah termasuk pajak &amp; layanan): {nett.map((b) => b.item_name).join(", ")}. Dokumen ini masih menambahkan PBJT/layanan.
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-card"
                onClick={() => {
                  catat();
                  setF((lama) => ({
                    ...lama,
                    pb1_enabled: false,
                    service_charge_percent: "",
                    service_charge_minimum: "",
                    items: lama.items.map((b) => (paket.find((p) => p.id === b.package_id)?.nett ? { ...b, charge_service: false } : b)),
                  }));
                  toast.info("PBJT & layanan dimatikan untuk dokumen ini.");
                }}
              >
                Matikan PBJT &amp; layanan
              </Button>
            </div>
          );
        })()}

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

        {sesiList.map((s, k) => (
          <KartuSesi
            key={s.kunci}
            sesi={s}
            nomor={k + 1}
            tanggalAcara={tanggalAcaraIsi}
            onUbah={(ubahan) => setSesiList((l) => l.map((x) => (x.kunci === s.kunci ? { ...x, ...ubahan } : x)))}
            onHapus={() => hapusSesi(s.kunci)}
            bisaNaik={k > 0}
            bisaTurun={k < sesiList.length - 1}
            // Urutan sesi = urutan di dokumen & lembar dapur; menunya ikut pindah bersama sesinya.
            onPindah={(arah) => {
              setSesiList((l) => {
                const x = [...l];
                [x[k], x[k + arah]] = [x[k + arah], x[k]];
                return x;
              });
              sorot(`[data-kunci-sesi="${s.kunci}"]`);
              toast(`${s.jenis || `Sesi ${k + 1}`} sekarang jadi Sesi ${k + arah + 1}`);
            }}
          >
            {daftarBaris(urutan.filter((i) => f.items[i].sesi_kunci === s.kunci))}
            {bilahTambah(s.kunci)}
          </KartuSesi>
        ))}
        {sesiList.length ? (
          <Button type="button" variant="outline" className="self-start rounded-full" onClick={tambahSesi}>
            <Plus className="size-4" />
            Tambah sesi
          </Button>
        ) : null}
        {(() => {
          const tanpa = urutan.filter((i) => posisiSesi(f.items[i]) === sesiList.length);
          if (!sesiList.length) return (
            <>
              {daftarBaris(tanpa)}
              {bilahTambah()}
            </>
          );
          if (!tanpa.length) return null;
          return (
            <div className="flex flex-col gap-3 rounded-[12px] border border-dashed p-4">
              <p className="text-sm">
                <b className="font-semibold">Belum masuk sesi</b>
                <span className="text-muted-foreground"> · pindahkan lewat tombol … di tiap baris</span>
              </p>
              {daftarBaris(tanpa)}
            </div>
          );
        })()}
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
            {/* Tampil rapi seperti di dokumen (butir bernomor, indentasi gantung); teks mentahnya dibuka lewat "Ubah teks" (D-163). */}
            {ubahSyarat || !f.payment_terms.trim() ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  id="payment_terms"
                  rows={Math.min(16, Math.max(4, f.payment_terms.split("\n").length + 1))}
                  value={f.payment_terms}
                  onChange={(e) => ubah("payment_terms", e.target.value)}
                  placeholder={"Termin pembayaran:\n1 Uang muka 50% saat pemesanan\n2 Pelunasan H-3 acara"}
                  autoFocus={ubahSyarat}
                />
                <p className="text-xs text-muted-foreground">Satu butir satu baris, awali dengan nomornya (1, 2, 3…). Nomor otomatis dirapikan di dokumen.</p>
                {f.payment_terms.trim() ? (
                  <Button type="button" size="sm" variant="outline" className="self-start rounded-full" onClick={() => setUbahSyarat(false)}>
                    <Check className="size-4" />
                    Selesai mengubah
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <TeksSyarat teks={f.payment_terms} lapang className="text-sm leading-relaxed text-foreground" />
                <Button type="button" size="sm" variant="ghost" className="self-start rounded-full text-primary" onClick={() => setUbahSyarat(true)}>
                  <Pencil className="size-3.5" />
                  Ubah teks
                </Button>
              </div>
            )}
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

      <CekSebelumSimpan
        tampil
        selesai={selesai}
        onPergi={lompat}
        adaJenis={Boolean(jenis)}
        aksi={
          <>
            {totalRincian()}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {kop ? <TombolPratinjau isi={isiDokumen} className="h-11 px-4" /> : null}
              <Button type="submit" className="h-11 px-5" disabled={sedangKirim}>
                {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
                {sedangKirim ? "Menyimpan…" : istilah.tombolSimpan}
              </Button>
            </div>
          </>
        }
      />

      </div>

      {/* ---------- Bilah simpan (D-142): menempel di bawah layar, selebar form, di semua ukuran ---------- */}
      <div className="sticky bottom-3 z-20 flex items-center gap-3 rounded-[14px] border lg:hidden bg-card/95 px-4 py-2.5 shadow-[0_-6px_24px_-14px_rgba(31,42,92,0.35)] backdrop-blur sm:px-5">
        {totalRincian()}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" className="hidden h-11 text-muted-foreground sm:inline-flex" render={<Link href={istilah.batalHref} />}>
            Batal
          </Button>
          {kop ? <TombolPratinjau isi={isiDokumen} ringkas className="h-11 px-3 sm:px-4" /> : null}
          <Button type="submit" className="h-11 px-5" disabled={sedangKirim}>
            {sedangKirim ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" />}
            {sedangKirim ? (
              "Menyimpan…"
            ) : (
              <>
                <span className="sm:hidden">Simpan</span>
                <span className="hidden sm:inline">{istilah.tombolSimpan}</span>
              </>
            )}
          </Button>
        </div>
      </div>
      <RekapSimpan
        buka={bukaCek}
        onTutup={() => setBukaCek(false)}
        onSimpan={() => {
          setBukaCek(false);
          lolosCek.current = true;
          refForm.current?.requestSubmit();
        }}
        onPergi={(n) => {
          setBukaCek(false);
          lompat(n);
        }}
        istilah={istilah}
        f={f}
        items={itemsSesi}
        pelanggan={pelanggan.find((p) => p.id === f.customer_id)}
        sumber={sumber}
        tanggal={tanggalAcaraIsi}
        rincian={rincianTotal}
        subtotal={total.subtotal.toNumber()}
        grandTotal={total.grand_total.toNumber()}
        paket={paket}
        namaPenandatangan={penandatangan.find((p) => p.id === f.signatory_id)?.nama}
      />
    </form>
  );
}

/* -------------------------------------------------------------------------
   Satu baris item, lengkap dengan sub-itemnya
   ------------------------------------------------------------------------- */

function BarisItem({
  baris,
  nomor,
  menu,
  onKategoriMenu,
  onMenuBaru,
  opsiBaris,
  onPilihSaran,
  pilihanSesi,
  bisaHapus,
  bisaNaik,
  bisaTurun,
  onUbah,
  onPindahSesi,
  onHapus,
  onSalin,
  onSisip,
  onPindah,
  saranSatuan,
  jumlahTamu,
  retail,
  paketAsal,
}: {
  baris: BarisForm;
  nomor: number;
  menu: PilihanMenu[];
  /** Kategori menu baru diisi dari sub-item (D-159). */
  onKategoriMenu: (idMenu: string, kategori: string) => void;
  /** Isi ketik manual didaftarkan ke data menu (D-159). */
  onMenuBaru: (m: PilihanMenu) => void;
  /** Saran nama baris (D-141): paket, menu dapur, katalog, menu yang pernah dijual. */
  opsiBaris: OpsiMenu[];
  onPilihSaran: (o: OpsiMenu) => void;
  /** Sesi dokumen ini; kosong = form tanpa sesi, pilihan pindah sesi tidak tampil. */
  pilihanSesi: { kunci: string; label: string }[];
  bisaHapus: boolean;
  bisaNaik: boolean;
  bisaTurun: boolean;
  /** aksi: undefined = ketikan, "" = aksi tanpa notifikasi, teks = aksi + notifikasi "Batalkan". */
  onUbah: (perubahan: Partial<BarisForm>, aksi?: string) => void;
  onPindahSesi: (kunci: string | undefined) => void;
  onHapus: () => void;
  onSalin: () => void;
  onSisip: () => void;
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


  // id dari useId, bukan baris.kunci (UUID acak berbeda di server & browser → hydration mismatch).
  const idBaris = useId();
  // Sub-item yang sedang ditukar menunya (indeks), hanya satu sekaligus.
  const [tukar, setTukar] = useState<number | null>(null);
  // Kartu "Daftarkan ke menu" (D-165): indeks isi yang sedang didaftarkan.
  const [daftar, setDaftar] = useState<number | null>(null);
  const [palet, setPalet] = useState(false);
  const menuPerId = useMemo(() => new Map(menu.map((m) => [m.id, m])), [menu]);

  const dariPaket = Boolean(baris.package_id);
  // Jumlah pesanan belum diisi: Qty dan Pax sama-sama kosong/1 (dokumen Tiska memakai salah satunya).
  const satuAtauKosong = (v: string) => !v.trim() || v.trim() === "1";
  const jumlahBelum = satuAtauKosong(baris.pax) && satuAtauKosong(baris.qty);
  const anakBerharga = (a: BarisForm["children"][number]) => Boolean(a.price.trim() || a.qty.trim() || a.unit.trim() || a.pax.trim() || a.day.trim());
  const [hargaIsi, setHargaIsi] = useState(() => baris.children.some(anakBerharga));
  const [tambahIsi, setTambahIsi] = useState(false);
  const [bukaHitung, setBukaHitung] = useState(false);
  const sesiLain = pilihanSesi.filter((x) => x.kunci !== baris.sesi_kunci);
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
  // Urutan sajian (D-159): isi baru diselipkan di tempat kategorinya (starter → … → minuman); isi lama tidak diacak.
  const peringkat = (a: Pick<BarisForm["children"][number], "item_name" | "menu_id">) => peringkatIsi(a.item_name, a.menu_id ? menuPerId.get(a.menu_id)?.kategori : null);
  function tambahAnak(isi: Partial<BarisForm["children"][number]>) {
    const kunci = crypto.randomUUID();
    const baru = { kunci, item_name: "", day: "", unit: "", qty: "", pax: "", price: "", ...isi };
    // Isi kosong ("Tulis isi sendiri") di akhir: namanya belum ada, belum bisa ditebak tempatnya.
    const i = baru.item_name.trim() ? posisiSisipIsi(baris.children.map(peringkat), peringkat(baru)) : baris.children.length;
    onUbah({ children: [...baris.children.slice(0, i), baru, ...baris.children.slice(i)] }, "");
    if (!isi.item_name) setFokusIsi(kunci);
    else sorotIsi(kunci);
  }
  /** Pindah isi (tombol naik/turun atau seret-lepas); isi yang dipindah menyala sebentar. */
  function pindahAnak(dari: number, ke: number) {
    if (ke < 0 || ke >= baris.children.length || dari === ke) return;
    const x = [...baris.children];
    const [a] = x.splice(dari, 1);
    x.splice(ke, 0, a);
    onUbah({ children: x }, `"${a.item_name.trim() || "Isi"}" pindah ke urutan ${ke + 1}`);
    sorotIsi(a.kunci);
  }
  /** Isi kategori menu dari sub-item: tersimpan di data menu, isi pindah ke tempat kategorinya. */
  async function isiKategori(j: number, kategori: string) {
    const a = baris.children[j];
    if (!a.menu_id) return;
    const h = await kategoriMenuDariDokumen(a.menu_id, kategori);
    if (!h.ok) return void toast.error(h.pesan);
    onKategoriMenu(a.menu_id, kategori);
    const lain = baris.children.filter((_, y) => y !== j);
    const i = posisiSisipIsi(lain.map(peringkat), peringkatIsi(a.item_name, kategori));
    onUbah({ children: [...lain.slice(0, i), a, ...lain.slice(i)] }, "");
    sorotIsi(a.kunci);
    toast.success(h.pesan);
  }
  /** Isi ketik manual → data menu (baru, atau ditautkan bila namanya sudah ada) + kategori; isi pindah ke tempatnya. */
  /** Tautkan isi ke menu (baru dari kartu, atau yang sudah ada); teks di dokumen tetap. */
  function tautkanIsi(j: number, m: PilihanMenu) {
    const a = baris.children[j];
    const tertaut = { ...a, menu_id: m.id };
    const lain = baris.children.filter((_, y) => y !== j);
    const i = posisiSisipIsi(lain.map(peringkat), peringkatIsi(a.item_name, m.kategori));
    onUbah({ children: [...lain.slice(0, i), tertaut, ...lain.slice(i)] }, "");
    sorotIsi(a.kunci);
  }
  async function daftarkanIsi(j: number, d: DataMenuBaru): Promise<boolean> {
    const a = baris.children[j];
    const h = await daftarkanMenuDariDokumen(d.nama, d.kategori, { namaEn: d.namaEn, keterangan: d.keterangan });
    if (!h.ok || !h.menu) {
      toast.error(h.pesan);
      return false;
    }
    onMenuBaru(h.menu);
    toast.success(h.pesan);
    if (!baris.children[j] || baris.children[j].kunci !== a.kunci) return true;
    const lain = baris.children.filter((_, y) => y !== j);
    const i = posisiSisipIsi(lain.map(peringkat), peringkatIsi(a.item_name, h.menu.kategori));
    onUbah({ children: [...lain.slice(0, i), { ...a, menu_id: h.menu.id }, ...lain.slice(i)] }, "");
    sorotIsi(a.kunci);
    return true;
  }
  const sorotIsi = (kunci: string) =>
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-kunci-isi="${kunci}"]`)
        ?.animate?.([{ backgroundColor: "color-mix(in oklab, var(--primary) 16%, transparent)" }, { backgroundColor: "transparent" }], { duration: 1600, easing: "ease-out" });
    }, 40);
  const [seretIsi, setSeretIsi] = useState<number | null>(null);
  const [sasaranIsi, setSasaranIsi] = useState<number | null>(null);

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
    <li data-kunci-baris={baris.kunci} className="group/baris @container relative -mx-3 flex flex-col gap-3.5 rounded-[12px] px-3 py-5">
      {/* Kepala baris (D-142): nomor + nama menu (dengan saran) + nilai + urutan + pilihan.
          Nama langsung bisa diketik di sini; tidak ada judul kembar di atas kotak nama. */}
      <div className="flex items-start gap-2.5">
        <span data-nomor-baris className="mt-2 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-sm font-semibold text-primary">{nomor}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <InputMenu
            value={baris.item_name}
            // Diketik ulang = bukan lagi menu yang dipilih dari saran.
            onChange={(v) => onUbah({ item_name: v, ...(baris.menu_id ? { menu_id: undefined } : {}) })}
            opsi={opsiBaris}
            onPilih={onPilihSaran}
            placeholder="Ketik nama menu atau paket…"
            className="text-base font-medium"
            inputProps={{ id: `nama-${idBaris}`, "data-nama-baris": nomor, "aria-label": `Nama menu baris ${nomor}` }}
          />
          {dariPaket || baris.menu_id ? (
            <span className="text-xs text-muted-foreground">{dariPaket ? "Dari paket" : "Tertaut ke menu dapur"}</span>
          ) : null}
        </div>
        <span className={cn("uang mt-2.5 hidden shrink-0 text-base @lg:inline", baris.is_compliment && "text-muted-foreground line-through")}>{rupiah(nilai)}</span>
        {/* Urutan langsung terlihat: naik/turun di kepala baris, bukan tersembunyi di menu "…". */}
        <div className="hidden shrink-0 items-center @lg:flex">
          <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground" disabled={!bisaNaik} onClick={() => onPindah(-1)} aria-label={`Naikkan baris ${nomor}`} title="Naikkan">
            <ArrowUp className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground" disabled={!bisaTurun} onClick={() => onPindah(1)} aria-label={`Turunkan baris ${nomor}`} title="Turunkan">
            <ArrowDown className="size-4" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground" aria-label={`Pilihan baris ${nomor}`} />}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onSisip}>
              <Plus className="size-4" />
              Sisipkan baris di bawah
            </DropdownMenuItem>
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
            {sesiLain.length ? <DropdownMenuSeparator /> : null}
            {sesiLain.length
              ? sesiLain.map((x) => (
                  <DropdownMenuItem key={x.kunci} onClick={() => onPindahSesi(x.kunci)}>
                    <ArrowLeftRight className="size-4" />
                    Pindah ke {x.label}
                  </DropdownMenuItem>
                ))
              : null}
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
      {/* Isian rata dengan nama (sejajar setelah nomor) supaya satu baris terbaca satu kelompok. */}
      <div className="flex flex-col gap-3.5 pl-[2.375rem]">

        {/* Day × Qty × Pax × Vol. × Harga Satuan (D-157): kolom & istilah SAMA dengan tabel quotation/invoice
            cetak, urutan sama. Dipisah, bukan dikalikan sendiri oleh yang mengetik: dokumen yang menulis
            "390 box" menghilangkan keterangan 130 per hari selama tiga hari — angka itu dipakai dapur. */}
        {/* Lebar mengikuti isinya (D-162): angka pendek sempit, Vol. sedang, Harga Satuan paling lebar. */}
        <div className="grid grid-cols-3 gap-3 @xl:grid-cols-[72px_96px_96px_minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`hari-${idBaris}`}>
              Day
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

          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`qty-${idBaris}`}>
              Qty
            </Label>
            <Input
              id={`qty-${idBaris}`}
              aria-label={`Qty baris ${nomor}`}
              inputMode="decimal"
              value={baris.qty}
              onChange={(e) => onUbah({ qty: e.target.value })}
              placeholder="1"
              className={cn("angka text-center tabular-nums", dariPaket && jumlahBelum && "border-perhatian-garis bg-perhatian-halus")}
            />
          </div>

          {/* Pax membawa banyaknya pesanan (236 box, 150 porsi). Kosong berarti
              satu, bukan nol — itu yang membuat dokumen lama bernilai sama. */}
          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`pax-${idBaris}`}>
              Pax
            </Label>
            <Input
              id={`pax-${idBaris}`}
              aria-label={`Jumlah pax baris ${nomor}`}
              inputMode="numeric"
              value={baris.pax}
              onChange={(e) => onUbah({ pax: e.target.value })}
              placeholder="1"
              title="Nilai baris = Day × Qty × Pax × Harga Satuan. Kosong berarti 1."
              className={cn("angka text-center tabular-nums", dariPaket && jumlahBelum && "border-perhatian-garis bg-perhatian-halus")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={label} htmlFor={`satuan-${idBaris}`}>
              Vol.
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
              Harga Satuan
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

        {(dariPaket && jumlahBelum) || (jumlahTamu.trim() && jumlahBelum) ? (
          <div className="-mt-1 flex flex-wrap items-center gap-2">
            {dariPaket && jumlahBelum ? <p className="text-sm font-medium text-perhatian">Isi Qty atau Pax yang dipesan supaya nilainya benar.</p> : null}
            {/^\d+$/.test(jumlahTamu.trim()) && jumlahTamu.trim() !== baris.pax.trim() ? (
              <button
                type="button"
                onClick={() => onUbah({ pax: jumlahTamu.trim() })}
                className="min-h-8 rounded-full border border-primary/30 bg-accent px-3 text-[0.8125rem] font-medium text-accent-foreground hover:border-primary"
              >
                Pax = jumlah tamu ({Number(jumlahTamu).toLocaleString("id-ID")})
              </button>
            ) : null}
          </div>
        ) : null}


        {/* Rumus & "Dihitung" satu baris (D-162): rumus kiri, pungutan kanan. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        {/* Rumus terlihat: angka baris selalu bisa dicocokkan pembacanya. */}
        <p className="font-mono text-[0.8125rem] text-muted-foreground">
          {angka(baris.day, "1")} Day × {angka(baris.qty, "1")} Qty × {angka(baris.pax, "1")} Pax{baris.unit.trim() ? ` (${baris.unit.trim()})` : ""} ×{" "}
          {baris.price.trim() ? `Rp ${baris.price.trim()}` : "Rp 0"} ={" "}
          <b className={cn("font-semibold text-foreground", baris.is_compliment && "line-through")}>{rupiah(nilai)}</b>
          {baris.is_compliment ? <span className="font-sans"> · compliment, dihitung nol</span> : null}
        </p>

      {/* Ikut dihitung (D-142): bawaannya sudah benar untuk hampir semua menu, jadi
          ringkas satu baris; centangnya baru dibuka saat memang perlu diubah. */}
      {!bukaHitung ? (
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>
            Dihitung:{" "}
            <span className="text-foreground">
              {[
                !retail && baris.charge_service ? "layanan" : null,
                baris.charge_pb1 ? ISTILAH.pajak : null,
                baris.charge_ppn ? "PPN sewa alat" : null,
                baris.is_compliment ? "compliment (gratis)" : null,
              ]
                .filter(Boolean)
                .join(" + ") || "tanpa pajak & layanan"}
            </span>
          </span>
          <button type="button" onClick={() => setBukaHitung(true)} className="font-medium text-primary underline-offset-4 hover:underline">
            Ubah
          </button>
        </p>
      ) : (
      <fieldset className="flex basis-full flex-wrap items-center gap-x-5 gap-y-2.5">
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
        <button type="button" onClick={() => setBukaHitung(false)} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Selesai
        </button>
      </fieldset>
      )}
        </div>

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
              <li
                key={anak.kunci}
                data-kunci-isi={anak.kunci}
                // Seret-lepas lewat pegangan ⋮⋮ (D-159); kotak isian tetap bisa diketik/dipilih teksnya.
                onDragOver={(e) => {
                  if (seretIsi === null || seretIsi === j) return;
                  e.preventDefault();
                  setSasaranIsi(j);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (seretIsi !== null) pindahAnak(seretIsi, j);
                  setSeretIsi(null);
                  setSasaranIsi(null);
                }}
                className={cn("-mx-1.5 flex flex-col gap-2 rounded-[10px] px-1.5 py-0.5", seretIsi === j && "opacity-40", sasaranIsi === j && "ring-2 ring-primary/60")}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", anak.kunci);
                      setSeretIsi(j);
                    }}
                    onDragEnd={() => {
                      setSeretIsi(null);
                      setSasaranIsi(null);
                    }}
                    className="hidden cursor-grab text-subtle-foreground active:cursor-grabbing sm:inline-flex"
                    aria-hidden="true"
                  >
                    <GripVertical className="size-4" />
                  </span>
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
                  {!anak.menu_id && anak.item_name.trim().length >= 2 ? (
                    <button
                      type="button"
                      onClick={() => setDaftar(j)}
                      className="shrink-0 rounded-full border border-dashed bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary"
                    >
                      + Daftarkan ke menu
                    </button>
                  ) : anak.menu_id && menuPerId.has(anak.menu_id) && !menuPerId.get(anak.menu_id)?.kategori ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className={cn(
                              "shrink-0 rounded-full border border-dashed border-perhatian-garis bg-perhatian-halus px-2.5 py-1 text-xs font-medium text-perhatian hover:border-perhatian",
                            )}
                          />
                        }
                      >
                        Pilih kategori
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="max-h-80 w-60 overflow-y-auto">
                        {Object.entries(KATEGORI_MENU).map(([k, l]) => (
                          <DropdownMenuItem key={k} onClick={() => isiKategori(j, k)}>
                            {l}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                  <div className="flex shrink-0 items-center">
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={j === 0} onClick={() => pindahAnak(j, j - 1)} aria-label={`Naikkan sub-item ${j + 1}`}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={j === baris.children.length - 1} onClick={() => pindahAnak(j, j + 1)} aria-label={`Turunkan sub-item ${j + 1}`}>
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
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

          {/* Satu pintu tambah isi (D-163): cari di daftar menu dulu; nama baru hanya lewat opsi terakhir di bawah hasil cari,
              supaya daftar menu tidak dipenuhi tulisan bebas. */}
          {menu.length ? (
            <>
              {/* Panel cari ala Spotlight (D-167): lega, dikelompokkan, bisa tambah beberapa isi berturut-turut. */}
              <button
                type="button"
                onClick={() => setPalet(true)}
                className="flex h-11 items-center gap-2.5 self-start rounded-[10px] border border-dashed bg-card px-4 text-[0.9375rem] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary sm:w-96"
              >
                <Search className="size-4" />
                <span className="flex-1 text-left">Tambah isi menu…</span>
                <span className="text-xs">cari dari daftar</span>
              </button>
              <PaletMenu
                buka={palet}
                onTutup={() => setPalet(false)}
                menu={menu}
                sudahAda={baris.children.map((a) => a.item_name)}
                onPilih={(m) => tambahAnak({ item_name: m.nama, menu_id: m.id })}
                onTulisBaru={(t) => tambahAnak({ item_name: t })}
              />
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" className="self-start bg-card" onClick={() => tambahAnak({})}>
              <Plus className="size-4" />
              Tulis isi sendiri
            </Button>
          )}
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
      </div>
      </div>
      {/* Sisipkan di antara baris: muncul saat kursor di baris (selalu tampil di layar sentuh). */}
      <button
        type="button"
        onClick={onSisip}
        aria-label={`Sisipkan baris di bawah baris ${nomor}`}
        className="absolute -bottom-3.5 left-1/2 z-10 flex h-7 -translate-x-1/2 items-center gap-1 rounded-full border bg-card px-3 text-xs font-medium text-primary opacity-0 shadow-[0_4px_12px_-6px_rgba(31,42,92,0.35)] transition-opacity duration-150 group-hover/baris:opacity-100 focus-visible:opacity-100 active:scale-[0.97] [@media(pointer:coarse)]:opacity-100"
      >
        <Plus className="size-3.5" />
        Sisipkan baris
      </button>
      <KartuDaftarMenu
        teks={daftar !== null && baris.children[daftar] ? baris.children[daftar].item_name : null}
        menu={menu}
        onTutup={() => setDaftar(null)}
        onDaftar={(d) => (daftar === null ? Promise.resolve(false) : daftarkanIsi(daftar, d))}
        onPakai={(m) => {
          if (daftar !== null) tautkanIsi(daftar, m);
          toast.success(`Ditautkan ke menu "${m.nama}"`);
          setDaftar(null);
        }}
      />
    </li>
  );
}

/* ------------------------------------------------------------------------- */

/** Waktu untuk menggabung ketikan beruntun di riwayat urungkan — hanya dipanggil dari aksi pengguna, bukan saat render. */
const waktuSekarang = () => Date.now();

/* ---------- Bagian form (D-068, D-069) ---------- */

/** Pilihan jam cepat untuk acara — tetap bisa diubah lewat pemilih jam. */

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
  contact_cc_name: 0,
  contact_cc_phone: 0,
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

/**
 * Panel langkah di kiri (layar lebar, D-155): enam bagian berurutan, yang aktif menyala; tiap bagian bisa dibuka
 * untuk melihat ringkasannya (Menu & harga: daftar baris per sesi, klik untuk lompat). Menempel saat menggulir.
 */
/**
 * Daftar baris menu di panel kiri (D-155): baris yang sedang terlihat di layar disorot satu baris (bukan satu blok),
 * dan saat urutan berubah tiap baris meluncur ke posisi barunya (FLIP, ±0,45 dtk; dimatikan bila kurangi gerakan).
 */
type KelompokPanel = { label: string; sesiKunci?: string; baris: { kunci: string; nomor: number; nama: string }[] };

function DaftarBarisPanel({
  kelompok,
  aktif,
  onPilih,
  onGeser,
  onSalin,
  onPindahKe,
  onTambah,
}: {
  kelompok: KelompokPanel[];
  aktif: string | null;
  onPilih: (kunci: string) => void;
  onGeser: (kunci: string, arah: -1 | 1) => void;
  onSalin: (kunci: string) => void;
  onPindahKe: (dari: string, ke: string) => void;
  onTambah: (sesiKunci?: string) => void;
}) {
  const elemen = useRef(new Map<string, HTMLElement>());
  const posisiLalu = useRef(new Map<string, number>());
  const [seret, setSeret] = useState<string | null>(null);
  const [sasaran, setSasaran] = useState<string | null>(null);
  useLayoutEffect(() => {
    const kurangi = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const kini = new Map<string, number>();
    elemen.current.forEach((el, k) => kini.set(k, el.offsetTop));
    if (!kurangi)
      kini.forEach((y, k) => {
        const lalu = posisiLalu.current.get(k);
        if (lalu !== undefined && lalu !== y)
          elemen.current.get(k)?.animate?.([{ transform: `translateY(${lalu - y}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
      });
    posisiLalu.current = kini;
  });
  const alat = "flex size-7 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-card hover:text-foreground disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="relative flex flex-col gap-1.5">
      {kelompok.map((k, gi) => (
        <div key={k.sesiKunci ?? `tanpa-${gi}`} className="flex flex-col gap-0.5">
          {k.label ? <span className="px-1 text-xs font-medium text-muted-foreground">{k.label}</span> : null}
          {k.baris.map((b, bi) => {
            const nyala = b.kunci === aktif;
            return (
              <div
                key={b.kunci}
                ref={(el) => {
                  if (el) elemen.current.set(b.kunci, el);
                  else elemen.current.delete(b.kunci);
                }}
                // Seret-lepas (mouse): pegang barisnya, lepas di atas baris lain.
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", b.kunci);
                  setSeret(b.kunci);
                }}
                onDragOver={(e) => {
                  if (!seret || seret === b.kunci) return;
                  e.preventDefault();
                  setSasaran(b.kunci);
                }}
                onDragLeave={() => setSasaran((x) => (x === b.kunci ? null : x))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (seret) onPindahKe(seret, b.kunci);
                  setSeret(null);
                  setSasaran(null);
                }}
                onDragEnd={() => {
                  setSeret(null);
                  setSasaran(null);
                }}
                className={cn(
                  "group/pb relative flex min-h-9 cursor-grab items-center gap-0.5 rounded-[10px] pr-1 transition-colors active:cursor-grabbing",
                  nyala ? "bg-accent" : "hover:bg-muted/70",
                  seret === b.kunci && "opacity-40",
                  sasaran === b.kunci && "ring-2 ring-primary/60",
                )}
              >
                <GripVertical className="size-3.5 shrink-0 text-subtle-foreground opacity-0 transition-opacity group-hover/pb:opacity-100" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => onPilih(b.kunci)}
                  aria-current={nyala ? "true" : undefined}
                  className={cn("flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-1 text-left text-xs", nyala && "font-medium text-primary-strong")}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[0.6875rem] font-semibold transition-colors",
                      nyala ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                    )}
                  >
                    {b.nomor}
                  </span>
                  <span className="truncate">{b.nama || "Baris baru"}</span>
                </button>
                {/* Alat cepat (D-162): muncul hanya saat kursor di baris; nama menyempit rapi, tidak ditimpa gradasi. */}
                <div className="hidden shrink-0 items-center group-focus-within/pb:flex group-hover/pb:flex">
                  <button type="button" className={alat} disabled={bi === 0} onClick={() => onGeser(b.kunci, -1)} aria-label={`Naikkan baris ${b.nomor}`}>
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" className={alat} disabled={bi === k.baris.length - 1} onClick={() => onGeser(b.kunci, 1)} aria-label={`Turunkan baris ${b.nomor}`}>
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button type="button" className={alat} onClick={() => onSalin(b.kunci)} aria-label={`Duplikat baris ${b.nomor}`}>
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => onTambah(k.sesiKunci)}
            className="flex min-h-8 items-center gap-2 rounded-[8px] px-1 text-left text-xs font-medium text-primary hover:bg-muted"
          >
            <Plus className="size-4" />
            Tambah baris{k.label ? ` di ${k.label}` : ""}
          </button>
        </div>
      ))}
    </div>
  );
}

function PanelLangkah({
  langkah,
  selesai,
  onPilih,
  judulKedua,
  isi,
  kaki,
}: {
  langkah: number;
  selesai: boolean[];
  onPilih: (n: number) => void;
  judulKedua: string;
  isi: React.ReactNode[];
  /** Total & tombol simpan, selalu terlihat di dasar panel. */
  kaki?: React.ReactNode;
}) {
  // Bagian yang dibuka manual; bagian aktif selalu terbuka.
  const [buka, setBuka] = useState<number[]>([2]);
  return (
    <aside aria-label="Bagian form" className="sticky top-3 hidden max-h-[calc(100dvh-1.5rem)] flex-col kartu lg:flex">
      {/* Daftar langkah bisa digulir sendiri; kaki (total & simpan) tetap di dasar panel. */}
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 [scrollbar-width:thin]">
      {TAHAP.map((t, i) => {
        const aktif = i === langkah;
        const terbuka = aktif || buka.includes(i);
        return (
          <div key={t.judul} className="flex flex-col">
            {/* Bagian aktif ditandai bulatan nomor terisi + teks primer, tanpa blok latar — supaya sorot baris menu di bawahnya
                tidak menumpuk dengan sorot judul bagian. */}
            <div className="flex items-center rounded-[10px]">
              <button
                type="button"
                onClick={() => {
                  onPilih(i);
                  setBuka((b) => (b.includes(i) ? b : [...b, i]));
                }}
                aria-current={aktif ? "location" : undefined}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2 text-left"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    aktif ? "bg-primary text-primary-foreground" : selesai[i] ? "bg-lunas-halus text-lunas" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {selesai[i] && !aktif ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn("truncate text-sm font-semibold", aktif ? "text-primary-strong" : "text-foreground")}>{i === 1 ? judulKedua : t.judul}</span>
                </span>
              </button>
              {aktif ? null : (
                <button
                  type="button"
                  onClick={() => setBuka((b) => (b.includes(i) ? b.filter((x) => x !== i) : [...b, i]))}
                  aria-expanded={terbuka}
                  aria-label={`${terbuka ? "Tutup" : "Buka"} ringkasan ${t.judul}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted"
                >
                  <ChevronDown className={cn("size-4 transition-transform duration-200", terbuka && "rotate-180")} />
                </button>
              )}
            </div>
            {/* Daftar baris menu hampir rata kiri supaya nama menu tidak banyak terpotong; ringkasan lain sejajar judul. */}
            {terbuka ? <div className={cn("pr-1.5 pb-2.5", i === 2 ? "mt-0.5 pl-1" : "pl-[2.75rem]")}>{isi[i]}</div> : null}
          </div>
        );
      })}
      </div>
      {kaki ? <div className="flex flex-col gap-2 border-t p-3">{kaki}</div> : null}
    </aside>
  );
}

function Penunjuk({
  langkah,
  selesai,
  onPilih,
  judulKedua,
  baris = [],
  onBaris,
  kelas,
}: {
  kelas?: string;
  langkah: number;
  selesai: boolean[];
  onPilih: (n: number) => void;
  /** Bagian 2 berganti nama mengikuti jenis pesanan (D-070). */
  judulKedua: string;
  /** Chip lompat ke baris menu (D-155) — tampil saat berada di bagian Menu & harga. */
  baris?: { kunci: string; nomor: number; nama: string }[];
  onBaris?: (kunci: string) => void;
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
  const tampilBaris = langkah === 2 && baris.length > 1 && onBaris;
  return (
    // Ramping (D-155): satu baris nomor + nama (±44px), bukan kartu tinggi berketerangan yang menutupi layar.
    <nav
      id="penunjuk-langkah"
      aria-label="Bagian form"
      className={cn("sticky top-[60px] z-20 flex flex-col gap-1 rounded-[20px] border bg-card/95 p-1 shadow-[0_6px_20px_-14px_rgba(31,42,92,0.35)] backdrop-blur lg:top-3", kelas)}
    >
      <ol ref={daftar} className="flex gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {TAHAP.map((t, i) => {
          const aktif = i === langkah;
          return (
            <li key={t.judul} className="flex-1">
              <button
                type="button"
                onClick={() => onPilih(i)}
                aria-current={aktif ? "location" : undefined}
                aria-label={`${i + 1}. ${i === 1 ? judulKedua : t.judul}`}
                title={t.ket}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-2 rounded-[10px] px-2.5 whitespace-nowrap transition-colors",
                  aktif ? "bg-accent" : "hover:bg-muted/70",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    aktif ? "bg-primary text-primary-foreground" : selesai[i] ? "bg-lunas-halus text-lunas" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {selesai[i] && !aktif ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className={cn("text-[0.8125rem] font-semibold", aktif ? "text-primary-strong" : "text-foreground", !aktif && "hidden sm:inline")}>
                  {i === 1 ? judulKedua : t.judul}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {tampilBaris ? (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t px-1.5 pt-1.5 pb-0.5 [scrollbar-width:none]" role="group" aria-label="Lompat ke baris menu">
          <span className="shrink-0 text-xs text-muted-foreground">Baris</span>
          {baris.map((b) => (
            <button
              key={b.kunci}
              type="button"
              onClick={() => onBaris(b.kunci)}
              className="flex h-8 max-w-[15rem] shrink-0 items-center gap-1.5 rounded-full border bg-card pr-3 pl-1 text-[0.8125rem] transition-colors hover:border-primary/40 hover:bg-accent active:scale-[0.97]"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-semibold text-primary">{b.nomor}</span>
              <span className="truncate">{b.nama || "Baris baru"}</span>
            </button>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

/** Langkah terakhir: apa yang masih kurang, dengan tombol ke langkahnya. */
function CekSebelumSimpan({
  tampil,
  selesai,
  onPergi,
  adaJenis,
  aksi,
}: {
  tampil: boolean;
  selesai: boolean[];
  onPergi: (n: number) => void;
  adaJenis: boolean;
  /** Total + Pratinjau + Simpan langsung di kartu ini, supaya langkah terakhirnya jelas dan bisa diklik (D-163). */
  aksi?: React.ReactNode;
}) {
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
            <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {teks}
              <Button type="button" size="sm" variant="outline" className="rounded-full border-perhatian-garis bg-card text-perhatian" onClick={() => onPergi(i)}>
                Lengkapi di bagian {i + 1}
                <ArrowRight className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-info-garis bg-info-halus px-5 py-4 text-primary-strong">
      <p className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-5 shrink-0" />
        <span>
          <b className="font-semibold">Semua sudah lengkap.</b> Cek totalnya (klik untuk lihat rincian), lihat dulu tampilannya lewat Pratinjau
          kalau perlu, lalu tekan simpan.{selesai[1] ? "" : " Tanggal acara belum diisi, boleh menyusul."}
        </span>
      </p>
      {aksi ? <div className="flex flex-col gap-3 border-t border-info-garis pt-3 sm:flex-row sm:items-center">{aksi}</div> : null}
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
const chipKecil = (aktif: boolean) =>
  `inline-flex min-h-8 items-center rounded-full border px-3 text-[0.8125rem] transition-colors ${aktif ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card hover:bg-accent"}`;

/**
 * Satu sesi acara (01-SPEC E.2, D-041): hari + jenis + jam di kepala kartu,
 * lalu paket & menu sesi itu di dalamnya — sesi dulu, baru menu.
 */
function KartuSesi({
  sesi,
  nomor,
  tanggalAcara,
  onUbah,
  onHapus,
  bisaNaik,
  bisaTurun,
  onPindah,
  children,
}: {
  sesi: SesiForm;
  nomor: number;
  tanggalAcara: string[];
  onUbah: (ubahan: Partial<SesiForm>) => void;
  onHapus: () => void;
  bisaNaik: boolean;
  bisaTurun: boolean;
  onPindah: (arah: -1 | 1) => void;
  children: React.ReactNode;
}) {
  // Jenis yang sudah dipilih cukup tampil sendiri; daftar lengkap dibuka lewat "Ganti" (D-142).
  const [gantiJenis, setGantiJenis] = useState(false);
  const semuaJenis = !sesi.jenis || gantiJenis;
  return (
    <section data-kunci-sesi={sesi.kunci} className="flex scroll-mt-40 flex-col gap-3 rounded-[12px] border-t pt-5 first:border-t-0 first:pt-0" aria-label={`Sesi ${nomor}`}>
      {/* Kepala sesi: satu pita lembut berisi nama, pengaturan, urutan. Bukan kartu di dalam kartu. */}
      <div className="flex flex-col gap-2.5 rounded-[12px] bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[0.9375rem] font-semibold">Sesi {nomor}</span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{[sesi.jenis, sesi.jam].filter(Boolean).join(", ")}</span>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={!bisaNaik} onClick={() => onPindah(-1)} aria-label={`Naikkan sesi ${nomor}`} title="Naikkan sesi">
            <ArrowUp className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground" disabled={!bisaTurun} onClick={() => onPindah(1)} aria-label={`Turunkan sesi ${nomor}`} title="Turunkan sesi">
            <ArrowDown className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={onHapus}>
            Hapus
          </Button>
        </div>
        {tanggalAcara.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Tanggal sesi ${nomor}`}>
            {tanggalAcara.map((t) => (
              <button key={t} type="button" aria-pressed={sesi.tanggal === t} onClick={() => onUbah({ tanggal: sesi.tanggal === t ? "" : t })} className={chipKecil(sesi.tanggal === t)}>
                {tanggalSesiPendek(t)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Jenis sesi ${nomor}`}>
          {semuaJenis ? (
            JENIS_SESI.map((j) => (
              <button
                key={j}
                type="button"
                aria-pressed={sesi.jenis === j}
                onClick={() => {
                  onUbah({ jenis: sesi.jenis === j ? "" : j });
                  setGantiJenis(false);
                }}
                className={chipKecil(sesi.jenis === j)}
              >
                {j}
              </button>
            ))
          ) : (
            <>
              <span className={chipKecil(true)}>{sesi.jenis}</span>
              <button type="button" onClick={() => setGantiJenis(true)} className="px-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                Ganti
              </button>
            </>
          )}
          <div className="w-full sm:ml-1 sm:w-64">
            <PilihRentangJam value={sesi.jam} onChange={(v) => onUbah({ jam: v })} aria-label={`Jam sesi ${nomor}`} />
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * "Order ini dari mana?" (D-137) di awal form quotation, dengan isian lanjutan
 * per sumber. Partner Fee rekanan dihitung langsung dari nilai menu dan masuk
 * ke perkiraan biaya Margin saat disimpan — TIDAK tercetak di quotation.
 */
function SumberOrder({
  f,
  ubah,
  rekanan,
  feeBawaan,
  nilaiMenu,
}: {
  f: IsiAwal;
  ubah: (u: Partial<IsiAwal>) => void;
  rekanan: OpsiRekanan[];
  feeBawaan: number;
  nilaiMenu: number;
}) {
  const dipilih = rekanan.find((r) => r.id === f.partner_id);
  const pctBawaan = dipilih?.pct ?? feeBawaan;
  // Persen ditulis "2,5" atau "2.5" — bukan rupiah (uraikanRupiah membaca titik sebagai ribuan).
  const pctIsi = Number((f.partner_fee_pct ?? "").trim().replace(",", "."));
  const pct = (f.partner_fee_pct ?? "").trim() && Number.isFinite(pctIsi) ? pctIsi : pctBawaan;
  const fee = Number(partnerFee(nilaiMenu, pct));
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-info-garis bg-info-halus p-4">
      <span className="text-sm font-medium text-primary-strong">Order ini dari mana?</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sumber order">
        {Object.entries(SUMBER_ORDER).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={f.order_source === k} onClick={() => ubah({ order_source: f.order_source === k ? "" : k })} className={chip(f.order_source === k)}>
            {label}
          </button>
        ))}
      </div>
      {f.order_source === "langsung" ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kanal">
          {KANAL_LANGSUNG.map((k) => (
            <button key={k} type="button" aria-pressed={f.order_source_note === k} onClick={() => ubah({ order_source_note: f.order_source_note === k ? "" : k })} className={chip(f.order_source_note === k)}>
              {k}
            </button>
          ))}
        </div>
      ) : null}
      {f.order_source === "relasi" ? (
        <Input value={f.order_source_note ?? ""} onChange={(e) => ubah({ order_source_note: e.target.value })} placeholder="Nama relasi yang mengenalkan, mis. Pak Budi (teman owner)" aria-label="Nama relasi" />
      ) : null}
      {f.order_source === "rekanan" ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-muted-foreground">Rekanan</span>
            <PilihCari
              nilai={dipilih}
              pilihan={rekanan}
              onPilih={(o) => ubah({ partner_id: o.id })}
              placeholder={rekanan.length ? "Ketik nama EO / WO / vendor…" : "Belum ada rekanan"}
            />
            <Link href="/rekanan" target="_blank" className="text-xs text-primary underline-offset-2 hover:underline">
              Rekanan belum terdaftar? Tambah di Data Induk → Rekanan
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-muted-foreground">Partner Fee (%)</span>
            <Input
              inputMode="decimal"
              value={f.partner_fee_pct ?? ""}
              onChange={(e) => ubah({ partner_fee_pct: e.target.value.replace(/[^\d.,]/g, "") })}
              placeholder={String(pctBawaan).replace(".", ",")}
              aria-label="Partner Fee persen"
            />
          </div>
          <p className="text-sm sm:col-span-2">
            Partner Fee <b className="uang font-semibold">{rupiah(fee)}</b>
            <span className="text-muted-foreground">
              {" "}
              = {String(pct).replace(".", ",")}% × nilai menu {rupiah(nilaiMenu)} · masuk biaya &amp; margin, <b className="font-medium">tidak tercetak</b> di quotation
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Kotak tambah di BAWAH daftar baris (D-141): satu kotak untuk menu & paket —
 * ketik, pilih saran (harga ikut terisi), atau tulis menu baru.
 */
function TambahMenu({ opsi, onPilih, onBaru }: { opsi: OpsiMenu[]; onPilih: (o: OpsiMenu) => void; onBaru: (nama: string) => void }) {
  const [teks, setTeks] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-info-garis bg-info-halus p-4 sm:flex-row sm:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium text-primary-strong">Tambah menu atau paket</span>
        <InputMenu
          value={teks}
          onChange={setTeks}
          opsi={opsi}
          onPilih={(o) => {
            onPilih(o);
            setTeks("");
          }}
          onBaru={(nama) => {
            onBaru(nama);
            setTeks("");
          }}
          placeholder="Ketik nama menu atau kode paket, mis. ayam bakar, CB-01…"
          inputProps={{ "aria-label": "Tambah menu atau paket" }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="bg-card"
        onClick={() => {
          onBaru(teks.trim());
          setTeks("");
        }}
      >
        <Plus className="size-4" />
        Tulis menu sendiri
      </Button>
    </div>
  );
}

/**
 * Rekap sebelum simpan (D-143, permintaan Rama): satu layar untuk memeriksa customer, asal order,
 * acara, menu per sesi, dan angka. Yang wajib belum lengkap menahan tombol simpan; yang janggal
 * (harga nol, porsi belum diisi, sesi tanpa jam) hanya diingatkan.
 */
function RekapSimpan({
  buka,
  onTutup,
  onSimpan,
  onPergi,
  istilah,
  f,
  items,
  pelanggan,
  sumber,
  tanggal,
  rincian,
  subtotal,
  grandTotal,
  paket,
  namaPenandatangan,
}: {
  buka: boolean;
  onTutup: () => void;
  onSimpan: () => void;
  onPergi: (bagian: number) => void;
  istilah: IstilahDokumen;
  f: IsiAwal;
  items: BarisForm[];
  pelanggan?: PilihanPelanggan;
  sumber?: { rekanan: OpsiRekanan[]; feeBawaan: number };
  tanggal: string[];
  rincian: [string, string][];
  subtotal: number;
  grandTotal: number;
  paket: PilihanPaket[];
  namaPenandatangan?: string;
}) {
  const refSimpan = useRef<HTMLButtonElement>(null);
  const isi = items.filter((b) => b.item_name.trim() || b.price.trim());
  const nilai = (b: BarisForm) =>
    subtotalBaris({ day: uraikanRupiah(b.day) ?? 1, qty: uraikanRupiah(b.qty) ?? 0, pax: uraikanRupiah(b.pax) ?? null, price: uraikanRupiah(b.price) ?? 0, is_compliment: b.is_compliment });
  const angka = (s: string, bawaan: string) => (s.trim() ? s.trim() : bawaan);

  // Asal order & Partner Fee (rumus sama dengan isian di langkah 1).
  const rekanan = sumber?.rekanan.find((r) => r.id === f.partner_id);
  const pctIsi = Number((f.partner_fee_pct ?? "").trim().replace(",", "."));
  const pct = (f.partner_fee_pct ?? "").trim() && Number.isFinite(pctIsi) ? pctIsi : (rekanan?.pct ?? sumber?.feeBawaan ?? 0);
  const asal = !f.order_source
    ? null
    : f.order_source === "rekanan"
      ? `Rekanan: ${rekanan?.label ?? "belum dipilih"}`
      : `${SUMBER_ORDER[f.order_source as keyof typeof SUMBER_ORDER] ?? f.order_source}${f.order_source_note?.trim() ? ` (${f.order_source_note.trim()})` : ""}`;

  const wajib: [number, string][] = [];
  if (!f.customer_id) wajib.push([0, "Customer belum dipilih"]);
  if (!f.tanggal || !f.tanggal_akhir) wajib.push([0, "Tanggal dokumen belum lengkap"]);
  if (!f.order_type) wajib.push([1, "Jenis pesanan (event / retail) belum dipilih"]);
  if (f.order_source === "rekanan" && !f.partner_id) wajib.push([0, "Rekanan pembawa order belum dipilih"]);
  if (!isi.length || subtotal <= 0) wajib.push([2, "Belum ada menu yang berharga"]);
  isi.forEach((b, i) => {
    if (!b.item_name.trim()) wajib.push([2, `Baris ${i + 1}: nama menu belum diisi`]);
  });

  const ingat: [number, string][] = [];
  if (!tanggal.length) ingat.push([1, "Tanggal acara belum diisi"]);
  isi.forEach((b, i) => {
    const nama = b.item_name.trim() || `Baris ${i + 1}`;
    if (!b.is_compliment && !(uraikanRupiah(b.price)?.gt(0) ?? false)) ingat.push([2, `${nama}: harga masih Rp 0`]);
    const satu = (v: string) => !v.trim() || v.trim() === "1";
    if (b.package_id && satu(b.pax) && satu(b.qty)) ingat.push([2, `${nama}: Qty / Pax belum diisi`]);
    const p = b.package_id ? paket.find((x) => x.id === b.package_id) : undefined;
    // Sama dengan penanda "Belum lengkap" di kotak Pilih menu paket.
    const kurang = p?.slot.length ? kategoriKurang(p.slot, bacaPilihan(b.children.map((a) => a.item_name), p.slot)) : [];
    if (kurang.length) ingat.push([2, `${nama}: pilihan menu paket belum lengkap (${kurang.join(", ")})`]);
  });
  const sesiTanpaJam = [...new Set(isi.filter((b) => b.sesi_jenis && !b.sesi_jam).map((b) => b.sesi_jenis!))];
  for (const j of sesiTanpaJam) ingat.push([2, `Sesi ${j}: jam belum diisi`]);

  // Menu dikelompokkan per sesi, urut seperti dokumen.
  const kelompok: { label: string; baris: BarisForm[] }[] = [];
  for (const b of isi) {
    const label = labelSesi({ tanggal: b.sesi_tanggal || null, jenis: b.sesi_jenis || null, jam: b.sesi_jam || null });
    const k = kelompok.at(-1);
    if (k && k.label === label) k.baris.push(b);
    else kelompok.push({ label, baris: [b] });
  }

  const kosong = (t: string) => <span className="text-muted-foreground">{t}</span>;
  // Pasangan label–nilai bergaris putus-putus, gaya halaman kwitansi (D-164).
  const pasang = (label: string, isiNilai: React.ReactNode) => (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-dashed border-border-row py-2 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{isiNilai}</dd>
    </div>
  );
  const bagian = (judul: string, ke: number, isiBagian: React.ReactNode, kanan?: React.ReactNode) => (
    <section className="border-t px-6 py-5">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[0.9375rem] font-semibold text-primary-strong">{judul}</h3>
        {kanan}
        <button type="button" onClick={() => onPergi(ke)} className="ml-auto rounded-full px-2.5 py-1 text-xs font-medium text-primary hover:bg-accent">
          Ubah
        </button>
      </div>
      {isiBagian}
    </section>
  );
  const subjudul = (t: string) => <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t}</p>;
  const jam = f.event_time?.trim();

  return (
    <Dialog open={buka} onOpenChange={(o) => (o ? null : onTutup())}>
      <DialogContent initialFocus={refSimpan} className="flex max-h-[min(92dvh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(64rem,calc(100vw-2rem))]">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-6 pt-5 pb-4">
          <div className="min-w-[min(100%,18rem)] flex-1 pr-8 sm:pr-0">
            <DialogTitle className="text-lg font-semibold">Cek dulu sebelum disimpan</DialogTitle>
            <DialogDescription className="mt-1">
              Baca dari atas ke bawah. Ada yang salah? Tekan <b className="font-medium text-foreground">Ubah</b> di bagian itu. Setelah disimpan, {istilah.kata} tetap bisa diubah.
            </DialogDescription>
          </div>
          <div className="flex flex-col rounded-[12px] border bg-card px-4 py-2 sm:mr-8 sm:items-end">
            <span className="text-xs text-muted-foreground">Total {istilah.kata}</span>
            <span className="uang text-xl font-semibold">{rupiah(grandTotal)}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto text-sm">
          {wajib.length || ingat.length ? (
            <div className="flex flex-col gap-2 px-6 pb-4">
              {wajib.length ? (
                <div role="alert" className="rounded-[12px] border border-perhatian-garis bg-perhatian-halus px-4 py-3 text-perhatian">
                  <p className="mb-1.5 flex items-center gap-2 font-semibold">
                    <CircleAlert className="size-4" /> Belum bisa disimpan — lengkapi dulu
                  </p>
                  <ul className="flex flex-col divide-y divide-perhatian-garis/60">
                    {wajib.map(([n, t], i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                        {t}
                        <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-full bg-card" onClick={() => onPergi(n)}>
                          Lengkapi <ArrowRight className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {ingat.length ? (
                <div className="rounded-[12px] border bg-muted/50 px-4 py-3">
                  <p className="mb-1.5 font-semibold">Perlu dicek ({ingat.length}) — boleh tetap disimpan</p>
                  <ul className="flex flex-col divide-y divide-border-row">
                    {ingat.map(([n, t], i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-1.5 text-muted-foreground">
                        {t}
                        <button type="button" onClick={() => onPergi(n)} className="shrink-0 text-xs font-medium text-primary hover:underline">
                          Lihat
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {bagian(
            "Customer & acara",
            0,
            <div className="grid gap-x-10 gap-y-4 md:grid-cols-2">
              <div>
                {subjudul("Customer")}
                <dl>
                  {pasang("Nama", pelanggan ? <span className="font-medium">{pelanggan.nama}</span> : kosong("belum dipilih"))}
                  {pasang("Kontak", f.contact_person.trim() || kosong("—"))}
                  {pasang("No. HP", f.contact_phone.trim() ? <span className="font-mono">{f.contact_phone.trim()}</span> : kosong("—"))}
                  {f.contact_cc_name?.trim() || f.contact_cc_phone?.trim()
                    ? pasang(
                        "CC",
                        <span>
                          {f.contact_cc_name?.trim() || kosong("tanpa nama")}
                          {f.contact_cc_phone?.trim() ? <span className="block font-mono">{f.contact_cc_phone.trim()}</span> : null}
                        </span>,
                      )
                    : null}
                  {asal ? pasang("Asal order", asal) : null}
                  {f.order_source === "rekanan" && rekanan
                    ? pasang(
                        "Partner Fee",
                        <span>
                          <span className="font-mono">{rupiah(Number(partnerFee(subtotal, pct)))}</span>
                          <span className="block text-xs text-muted-foreground">{String(pct).replace(".", ",")}% · internal, tidak tercetak</span>
                        </span>,
                      )
                    : null}
                  {pasang(istilah.labelTanggal, f.tanggal ? labelSesi({ tanggal: f.tanggal }) : kosong("belum diisi"))}
                  {pasang(istilah.labelTanggalAkhir, f.tanggal_akhir ? labelSesi({ tanggal: f.tanggal_akhir }) : kosong("belum diisi"))}
                  {f.po_reference?.trim() ? pasang("Referensi PO", f.po_reference.trim()) : null}
                </dl>
              </div>
              <div>
                {subjudul(f.order_type === "retail" ? "Pengiriman" : "Acara")}
                <dl>
                  {f.order_type !== "retail" ? pasang("Nama acara", f.event_type.trim() || kosong("—")) : null}
                  {f.order_type !== "retail" ? pasang("Jenis acara", f.event_category ? (JENIS_ACARA[f.event_category as keyof typeof JENIS_ACARA] ?? f.event_category) : kosong("—")) : null}
                  {pasang(
                    "Tanggal",
                    tanggal.length ? (
                      <span className="flex flex-col">
                        {tanggal.map((t) => (
                          <span key={t}>{labelSesi({ tanggal: t })}</span>
                        ))}
                      </span>
                    ) : (
                      kosong("belum diisi")
                    ),
                  )}
                  {jam ? pasang("Jam", jam) : null}
                  {pasang(f.order_type === "retail" ? "Alamat kirim" : "Venue", f.venue.trim() || kosong("—"))}
                  {f.order_type !== "retail" ? pasang("Jumlah tamu", f.guest_count.trim() ? `${f.guest_count.trim()} orang` : kosong("—")) : null}
                </dl>
              </div>
            </div>,
          )}

          {bagian(
            "Menu & harga",
            2,
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="w-px py-2 pr-3 font-medium">No</th>
                    <th className="w-full py-2 pr-3 font-medium">Menu</th>
                    <th className="hidden w-px px-2 py-2 text-right font-medium sm:table-cell">Day</th>
                    <th className="hidden w-px px-2 py-2 text-right font-medium sm:table-cell">Qty</th>
                    <th className="hidden w-px px-2 py-2 text-right font-medium sm:table-cell">Pax</th>
                    <th className="hidden w-px px-2 py-2 text-right font-medium whitespace-nowrap sm:table-cell">Harga</th>
                    <th className="w-px py-2 pl-3 text-right font-medium">Jumlah</th>
                  </tr>
                </thead>
                {kelompok.map((k, gi) => (
                  <tbody key={gi}>
                    {k.label ? (
                      <tr>
                        <td colSpan={7} className="bg-muted/50 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {k.label}
                        </td>
                      </tr>
                    ) : null}
                    {k.baris.map((b) => {
                      const no = isi.indexOf(b) + 1;
                      const anak = b.children.filter((a) => a.item_name.trim());
                      return (
                        <tr key={b.kunci} className="border-b border-border-row align-top last:border-b-0">
                          <td className="py-2.5 pr-3 font-mono text-xs text-muted-foreground">{no}</td>
                          <td className="max-w-0 py-2.5 pr-3">
                            <span className="font-medium">{b.item_name.trim() || kosong("tanpa nama")}</span>
                            {b.is_compliment ? <span className="ml-2 rounded-full bg-lunas-halus px-2 py-0.5 text-xs text-lunas">Gratis</span> : null}
                            {/* HP: kolom angka dilipat jadi satu baris rumus. */}
                            <span className="mt-0.5 block font-mono text-xs text-muted-foreground sm:hidden">
                              {angka(b.day, "1")} day × {angka(b.qty, "1")} qty × {angka(b.pax, "1")} {b.unit.trim() || "pax"} × {b.price.trim() ? `Rp ${b.price.trim()}` : "Rp 0"}
                            </span>
                            {anak.length ? (
                              <ol className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                                {anak.map((a, k2) => (
                                  <li key={a.kunci} className="flex gap-1.5">
                                    <span className="w-4 shrink-0 text-right tabular-nums">{k2 + 1}.</span>
                                    <span className="min-w-0">{namaIsiBersih(a.item_name)}</span>
                                  </li>
                                ))}
                              </ol>
                            ) : null}
                          </td>
                          <td className="hidden px-2 py-2.5 text-right font-mono sm:table-cell">{angka(b.day, "1")}</td>
                          <td className="hidden px-2 py-2.5 text-right font-mono sm:table-cell">{angka(b.qty, "1")}</td>
                          <td className="hidden px-2 py-2.5 text-right font-mono whitespace-nowrap sm:table-cell">
                            {angka(b.pax, "1")}
                            {b.unit.trim() ? <span className="block font-sans text-xs text-muted-foreground">{b.unit.trim()}</span> : null}
                          </td>
                          <td className="hidden px-2 py-2.5 text-right font-mono whitespace-nowrap sm:table-cell">{b.price.trim() ? `Rp ${b.price.trim()}` : "Rp 0"}</td>
                          <td className={cn("py-2.5 pl-3 text-right font-mono font-semibold whitespace-nowrap", b.is_compliment && "font-normal text-muted-foreground line-through")}>
                            {rupiah(nilai(b))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>,
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{isi.length} baris</span>,
          )}

          {bagian(
            "Total & syarat",
            5,
            <div className="grid gap-x-10 gap-y-5 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <dl className="order-2 md:order-1">
                {pasang("S&K", f.show_payment_terms && f.payment_terms.trim() ? "Ikut tercetak" : kosong("Tidak dicetak"))}
                {pasang("Penandatangan", namaPenandatangan ?? kosong("belum dipilih"))}
                {pasang("Catatan", f.notes.trim() ? <span className="whitespace-pre-line">{f.notes.trim()}</span> : kosong("—"))}
              </dl>
              <dl className="order-1 rounded-[12px] border bg-muted/30 px-4 py-3 md:order-2">
                {rincian.map(([label, n]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border-row py-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-mono">{n}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 pt-2.5">
                  <dt className="font-semibold">Total</dt>
                  <dd className="uang text-lg font-semibold">{rupiah(grandTotal)}</dd>
                </div>
              </dl>
            </div>,
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-6 py-3.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11" onClick={onTutup}>
            Kembali ubah
          </Button>
          <Button ref={refSimpan} type="button" className="h-11 px-6" disabled={wajib.length > 0} onClick={onSimpan}>
            <Check className="size-4" />
            {ingat.length ? "Sudah dicek, simpan" : "Ya, simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tempat tombol Simpan/Pratinjau/Total di kanan judul halaman form dokumen (layar lebar), diisi oleh FormDokumen. */
export function SlotAksiDokumen() {
  return <div id="aksi-dokumen" className="hidden items-center gap-2 lg:flex" />;
}

const OPSI_JENIS_ACARA = Object.entries(JENIS_ACARA).map(([id, label]) => ({ id, label }));

