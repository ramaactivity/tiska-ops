/* ==========================================================================
   REVISI QUOTATION — salinan versi & perbandingannya (01-SPEC E.10, D-042).
   Murni. Salinan TIDAK memuat HPP/untung, jadi aman untuk sales.
   ========================================================================== */

export type BarisSalinan = {
  nama: string;
  hari: string;
  qty: string;
  pax: number | null;
  harga: string;
  nilai: string;
  sesi: string;
  isi: string[];
};

export type SalinanPenawaran = {
  nomor: string;
  tanggal: string;
  berlaku: string;
  tanggalAcara: string[];
  tamu: number | null;
  subtotal: string;
  layanan: string;
  pajak: string;
  ppn: string;
  delivery: string;
  total: string;
  baris: BarisSalinan[];
  biaya: { label: string; nilai: string }[];
};

export type PerubahanBaris =
  | { jenis: "tambah"; nama: string }
  | { jenis: "hapus"; nama: string }
  | { jenis: "ubah"; nama: string; rincian: string[] };

export type HasilBanding = {
  angka: { label: string; lama: string; baru: string }[];
  baris: PerubahanBaris[];
};

const rp = (v: string) => `Rp ${Math.round(Number(v)).toLocaleString("id-ID")}`;
const angkaSama = (a: string, b: string) => Number(a) === Number(b);

function bandingBaris(lama: BarisSalinan, baru: BarisSalinan): string[] {
  const r: string[] = [];
  if (!angkaSama(lama.qty, baru.qty)) r.push(`jumlah ${Number(lama.qty)} → ${Number(baru.qty)}`);
  if ((lama.pax ?? 1) !== (baru.pax ?? 1)) r.push(`pax ${lama.pax ?? 1} → ${baru.pax ?? 1}`);
  if (!angkaSama(lama.hari, baru.hari)) r.push(`hari ${Number(lama.hari)} → ${Number(baru.hari)}`);
  if (!angkaSama(lama.harga, baru.harga)) r.push(`harga ${rp(lama.harga)} → ${rp(baru.harga)}`);
  if (lama.sesi !== baru.sesi) r.push(`sesi ${lama.sesi || "—"} → ${baru.sesi || "—"}`);
  const keluar = lama.isi.filter((x) => !baru.isi.includes(x));
  const masuk = baru.isi.filter((x) => !lama.isi.includes(x));
  if (keluar.length && masuk.length && keluar.length === masuk.length) {
    keluar.forEach((k, i) => r.push(`menu ${k} → ${masuk[i]}`));
  } else {
    if (keluar.length) r.push(`menu dihapus: ${keluar.join(", ")}`);
    if (masuk.length) r.push(`menu ditambah: ${masuk.join(", ")}`);
  }
  return r;
}

/** Apa yang berubah dari versi `lama` ke `baru`. Baris dipasangkan menurut namanya. */
export function bandingkanVersi(lama: SalinanPenawaran, baru: SalinanPenawaran): HasilBanding {
  const angka: HasilBanding["angka"] = [];
  const uang: [string, keyof SalinanPenawaran][] = [
    ["Subtotal", "subtotal"],
    ["Layanan", "layanan"],
    ["PBJT", "pajak"],
    ["PPN sewa alat", "ppn"],
    ["Delivery Fee", "delivery"],
    ["Total", "total"],
  ];
  for (const [label, k] of uang) {
    if (!angkaSama(lama[k] as string, baru[k] as string)) angka.push({ label, lama: rp(lama[k] as string), baru: rp(baru[k] as string) });
  }
  if (lama.tamu !== baru.tamu) angka.push({ label: "Jumlah tamu", lama: String(lama.tamu ?? "—"), baru: String(baru.tamu ?? "—") });
  if (lama.tanggalAcara.join() !== baru.tanggalAcara.join()) {
    angka.push({ label: "Tanggal acara", lama: lama.tanggalAcara.join(", ") || "—", baru: baru.tanggalAcara.join(", ") || "—" });
  }

  const sisa = [...baru.baris];
  const baris: PerubahanBaris[] = [];
  for (const l of lama.baris) {
    const i = sisa.findIndex((b) => b.nama === l.nama);
    if (i < 0) {
      baris.push({ jenis: "hapus", nama: l.nama });
      continue;
    }
    const rincian = bandingBaris(l, sisa[i]);
    if (rincian.length) baris.push({ jenis: "ubah", nama: l.nama, rincian });
    sisa.splice(i, 1);
  }
  for (const b of sisa) baris.push({ jenis: "tambah", nama: b.nama });

  const biayaLama = lama.biaya.map((b) => `${b.label} ${rp(b.nilai)}`).join("; ");
  const biayaBaru = baru.biaya.map((b) => `${b.label} ${rp(b.nilai)}`).join("; ");
  if (biayaLama !== biayaBaru) angka.push({ label: "Biaya tambahan", lama: biayaLama || "—", baru: biayaBaru || "—" });

  return { angka, baris };
}
