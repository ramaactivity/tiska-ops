import { bandingkanVersi, type SalinanPenawaran } from "../revisi";

/* ==========================================================================
   EVENT (01-SPEC G, D-049). Murni.

   Batas kunci perubahan (02-ATURAN-BISNIS §5): H-5 untuk pesanan yang ada
   buffet/stall, H-2 untuk box saja — pukul 17.00 WIB (akhir jam kantor).
   ========================================================================== */

export type ItemEvent = {
  session_date: string | null;
  session_label: string | null;
  session_time: string | null;
  item_name: string;
  qty: string;
  unit: string | null;
  pax: number | null;
  day: string;
  contents: string[];
};

export const STATUS_EVENT = {
  dp: "DP",
  final: "Final",
  terkunci: "Terkunci",
  berjalan: "Berjalan",
  selesai: "Selesai",
  batal: "Batal",
} as const;

export const CARA_LAYANAN = { antar: "Diantar", ambil: "Diambil customer", setup_service: "Set-up & service" } as const;

/** Tanggal acara pertama ("2026-12-20") → batas ubah: H-5 / H-2 pukul 17.00 WIB (10.00 UTC). */
export function batasKunci(tanggalPertama: string | null, adaBuffet: boolean): Date | null {
  const m = tanggalPertama && /^(\d{4})-(\d{2})-(\d{2})$/.exec(tanggalPertama);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - (adaBuffet ? 5 : 2), 10, 0, 0));
}

export function caraLayananBawaan(adaBuffet: boolean): keyof typeof CARA_LAYANAN {
  return adaBuffet ? "setup_service" : "antar";
}

/** Ringkasan "UPDATE ke-n": baris ditambah/dihapus/diubah (jumlah, pax, sesi, menu). */
export function ringkasPerubahan(lama: ItemEvent[], baru: ItemEvent[]): string[] {
  const salin = (items: ItemEvent[]): SalinanPenawaran => ({
    nomor: "",
    tanggal: "",
    berlaku: "",
    tanggalAcara: [],
    tamu: null,
    subtotal: "0",
    layanan: "0",
    pajak: "0",
    ppn: "0",
    delivery: "0",
    total: "0",
    biaya: [],
    baris: items.map((i) => ({
      nama: i.item_name,
      hari: i.day,
      qty: i.qty,
      pax: i.pax,
      harga: "0",
      nilai: "0",
      sesi: [i.session_date, i.session_label, i.session_time].filter(Boolean).join(" · "),
      isi: i.contents,
    })),
  });
  return bandingkanVersi(salin(lama), salin(baru)).baris.map((b) =>
    b.jenis === "tambah" ? `+ ${b.nama}` : b.jenis === "hapus" ? `− ${b.nama}` : `• ${b.nama}: ${b.rincian.join("; ")}`,
  );
}
