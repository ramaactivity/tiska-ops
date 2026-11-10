"use client";

import { LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KATEGORI_RAB, labelKategori } from "@/lib/biaya";
import { rupiah } from "@/lib/uang";

import { selesaikanPr } from "../../uang-muka/actions";
import { ajukanPr, batalkanPr, kembalikanPr, setujuiPr, simpanIsiPr } from "../actions";

type Baris = {
  id: string | null;
  idBahan: string | null;
  nama: string;
  perlu: string | null;
  qtyBeli: string;
  satuanBeli: string | null;
  note: string | null;
  manual: boolean;
  /** Kategori biaya Margin (D-146). */
  kategori: string;
  /** Harga perkiraan baris di luar master bahan — diketik pembelanja sendiri (BBM, e-toll, bunga…), jadi boleh terlihat. */
  hargaRab: string;
  /** 🔒 undefined = peran ini tidak boleh melihat harga. */
  nilai?: number | null;
  harga?: number | null;
};

const PILIHAN_KATEGORI = KATEGORI_RAB.map((k) => ({ nilai: k, label: labelKategori(k) }));
const rp = (t: string) => (t ? Number(t).toLocaleString("id-ID") : "");

// "1,5" (kebiasaan Indonesia) dan "1.5" sama-sama diterima.
const keAngka = (t: string) => Number(t.replace(",", "."));
const tampil = (t: string) => t.replace(/\.?0+$/, "").replace(".", ",");

function jalankan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, sukses?: string) {
  mulai(async () => {
    try {
      await kerja();
      if (sukses) toast.success(sukses);
    } catch (e) {
      // redirect() dari server action juga dilempar sebagai galat — biarkan lewat.
      if (e && typeof e === "object" && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) throw e;
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

export function EditorPr({
  id,
  bisaUbah,
  lihatHarga,
  baris: awal,
  catatan: catatanAwal,
  bahan,
}: {
  id: string;
  bisaUbah: boolean;
  lihatHarga: boolean;
  baris: Baris[];
  catatan: string;
  bahan: OpsiCari[];
}) {
  const [baris, setBaris] = useState<Baris[]>(() => awal.map((b) => ({ ...b, qtyBeli: tampil(b.qtyBeli) })));
  const [catatan, setCatatan] = useState(catatanAwal);
  const [ubah, setUbah] = useState(false);
  const [lain, setLain] = useState({ nama: "", satuan: "" });
  const [menunggu, mulai] = useTransition();

  const ganti = (i: number, isi: Partial<Baris>) => {
    setBaris((s) => s.map((b, j) => (j === i ? { ...b, ...isi } : b)));
    setUbah(true);
  };
  const tambah = (b: Baris) => {
    setBaris((s) => [b, ...s]);
    setUbah(true);
  };
  const isian = () =>
    baris.map((b) => ({
      id: b.id,
      idBahan: b.idBahan,
      nama: b.nama,
      qtyBeli: keAngka(b.qtyBeli),
      satuanBeli: b.satuanBeli,
      note: b.note?.trim() || null,
      kategori: b.kategori,
      harga: b.idBahan || !b.hargaRab ? null : Number(b.hargaRab),
    }));
  const salah = baris.find((b) => !Number.isFinite(keAngka(b.qtyBeli)) || keAngka(b.qtyBeli) < 0);
  // Nilai baris baru belum diketahui sampai disimpan (harga dihitung server).
  const hargaBaris = (b: Baris) => (b.idBahan ? (b.harga ?? null) : b.hargaRab ? Number(b.hargaRab) : null);
  const total = lihatHarga ? baris.reduce((s, b) => s + Math.round(keAngka(b.qtyBeli) * (hargaBaris(b) ?? 0)), 0) : 0;

  return (
    <section className="rounded-[14px] border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <h2 className="eyebrow">Daftar belanja · {baris.length} barang</h2>
        {lihatHarga ? <span className="font-mono text-sm tabular-nums">Perkiraan {rupiah(total)}</span> : null}
      </div>

      {bisaUbah ? (
        <div className="flex flex-col gap-2 border-b p-4">
          <p className="text-sm text-muted-foreground">Tambah barang (mis. isi ulang stok, bahan menu yang belum terhitung):</p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <PilihCari
              pilihan={bahan}
              placeholder="Cari bahan dari master…"
              onPilih={(p) => tambah({ id: null, idBahan: p.id, nama: p.label, perlu: null, qtyBeli: "1", satuanBeli: p.sub?.split(" · ").at(-1) ?? null, note: null, manual: true, kategori: "hpp_bahan_baku", hargaRab: "" })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={lain.nama} onChange={(e) => setLain({ ...lain, nama: e.target.value })} placeholder="Barang/biaya lain: BBM, e-toll, bunga…" className="min-w-0 flex-1" aria-label="Nama barang lain" />
            <Input value={lain.satuan} onChange={(e) => setLain({ ...lain, satuan: e.target.value })} placeholder="Satuan" className="w-28" aria-label="Satuan barang lain" />
            <Button
              variant="outline"
              disabled={!lain.nama.trim()}
              onClick={() => {
                tambah({ id: null, idBahan: null, nama: lain.nama.trim(), perlu: null, qtyBeli: "1", satuanBeli: lain.satuan.trim() || null, note: null, manual: true, kategori: tebakKategori(lain.nama), hargaRab: "", harga: lihatHarga ? null : undefined });
                setLain({ nama: "", satuan: "" });
              }}
            >
              <Plus className="size-4" />
              Tambah
            </Button>
          </div>
        </div>
      ) : null}

      {!baris.length ? (
        <p className="p-4 text-sm text-muted-foreground">
          Belum ada barang. Tambahkan bahan dari master atau biaya lain (BBM, e-toll, bunga…) di atas.
        </p>
      ) : null}
      <ul className="divide-y">
        {baris.map((b, i) => (
          <li key={b.id ?? `baru-${i}-${b.nama}`} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {b.nama}
                {b.manual ? <span className="ml-2 text-xs font-normal text-muted-foreground">tambahan</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {b.perlu ? `Dari resep: ${b.perlu}` : "Ditambah manual"}
                {b.idBahan && lihatHarga && b.harga != null ? ` · @ ${rupiah(b.harga)}/${b.satuanBeli ?? "satuan"}` : b.idBahan && lihatHarga && b.id ? " · belum ada harga" : ""}
                {!bisaUbah ? ` · ${labelKategori(b.kategori)}` : ""}
                {!bisaUbah && !b.idBahan && b.hargaRab ? ` · @ ${rupiah(Number(b.hargaRab))}` : ""}
              </p>
              {bisaUbah ? (
                <div className="pt-2">
                  <PilihanChip kecil label={`Kategori ${b.nama}`} pilihan={PILIHAN_KATEGORI} nilai={b.kategori} onPilih={(k) => ganti(i, { kategori: k })} />
                </div>
              ) : null}
            </div>
            {bisaUbah ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={b.qtyBeli}
                  inputMode="decimal"
                  onChange={(e) => ganti(i, { qtyBeli: e.target.value })}
                  className="w-24 text-right font-mono tabular-nums"
                  aria-label={`Jumlah beli ${b.nama}`}
                />
                <span className="w-24 truncate text-sm text-muted-foreground">{b.satuanBeli ?? ""}</span>
                {!b.idBahan ? (
                  <Input
                    value={rp(b.hargaRab)}
                    inputMode="numeric"
                    onChange={(e) => ganti(i, { hargaRab: e.target.value.replace(/\D/g, "") })}
                    placeholder="Perkiraan @ Rp"
                    className="w-36 text-right font-mono tabular-nums"
                    aria-label={`Perkiraan harga ${b.nama}`}
                  />
                ) : null}
                <Input value={b.note ?? ""} onChange={(e) => ganti(i, { note: e.target.value })} placeholder="Catatan" className="w-40" aria-label={`Catatan ${b.nama}`} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus ${b.nama}`}
                  onClick={() => {
                    setBaris((s) => s.filter((_, j) => j !== i));
                    setUbah(true);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-mono tabular-nums">
                  {b.qtyBeli} {b.satuanBeli ?? ""}
                </span>
                {b.note ? <span className="text-muted-foreground">{b.note}</span> : null}
              </div>
            )}
            {lihatHarga ? (
              <span className="font-mono text-sm tabular-nums md:w-28 md:text-right">
                {hargaBaris(b) != null ? rupiah(Math.round(keAngka(b.qtyBeli) * hargaBaris(b)!)) : "—"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t p-4">
        {bisaUbah ? (
          <Textarea
            value={catatan}
            onChange={(e) => {
              setCatatan(e.target.value);
              setUbah(true);
            }}
            rows={3}
            placeholder="Catatan untuk Finance (mis. sekalian isi ulang minyak & gas)"
            aria-label="Catatan PR"
          />
        ) : catatan ? (
          <p className="text-sm whitespace-pre-line text-muted-foreground">{catatan}</p>
        ) : null}
        {bisaUbah ? (
          <div className="flex flex-wrap justify-end gap-2">
            {salah ? <p className="mr-auto self-center text-sm text-tempo">Jumlah {salah.nama} belum benar.</p> : null}
            <Button variant="outline" disabled={menunggu || !ubah || Boolean(salah)} onClick={() => jalankan(mulai, async () => { await simpanIsiPr(id, isian(), catatan); setUbah(false); }, "Tersimpan")}>
              Simpan
            </Button>
            <Button
              disabled={menunggu || Boolean(salah) || !baris.length}
              onClick={() =>
                jalankan(
                  mulai,
                  async () => {
                    if (ubah) await simpanIsiPr(id, isian(), catatan);
                    await ajukanPr(id);
                    setUbah(false);
                  },
                  "Diajukan ke Finance",
                )
              }
            >
              {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" />}
              Ajukan ke Finance
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Tebakan awal kategori dari nama barang tambahan — tetap bisa diganti lewat chip. */
function tebakKategori(nama: string): string {
  const n = nama.toLowerCase();
  if (/\b(bbm|bensin|solar|pertalite|pertamax)\b/.test(n)) return "bbm";
  if (/\b(e-?toll|tol)\b/.test(n)) return "e_toll";
  if (/\b(bunga|dekor)/.test(n)) return "bunga_dekorasi";
  return "lain_lain";
}

/** Persetujuan Finance: dana ditransfer (bawaan = perkiraan) atau kembalikan dengan catatan. */
export function PanelFinance({ id, total, tanpaHarga }: { id: string; total: number; tanpaHarga: number }) {
  const [transfer, setTransfer] = useState(String(total));
  const [catatan, setCatatan] = useState("");
  const [kembali, setKembali] = useState(false);
  const [menunggu, mulai] = useTransition();
  const nominal = Number(transfer.replace(/\D/g, ""));
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-5">
      <h2 className="eyebrow">Persetujuan Finance</h2>
      <p className="text-sm">
        Perkiraan belanja <b className="font-mono tabular-nums">{rupiah(total)}</b>
        {tanpaHarga ? <span className="text-perhatian"> · {tanpaHarga} barang belum ada harga — belum masuk perkiraan</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="transfer" className="text-sm text-muted-foreground">
          Dana ditransfer
        </label>
        <Input
          id="transfer"
          value={transfer ? Number(transfer.replace(/\D/g, "") || 0).toLocaleString("id-ID") : ""}
          inputMode="numeric"
          onChange={(e) => setTransfer(e.target.value.replace(/\D/g, ""))}
          className="w-44 text-right font-mono tabular-nums"
        />
        <Button disabled={menunggu || !transfer} onClick={() => jalankan(mulai, () => setujuiPr(id, nominal), "PR disetujui")}>
          Setujui
        </Button>
        <Button variant="outline" disabled={menunggu} onClick={() => setKembali(true)}>
          Kembalikan
        </Button>
      </div>
      {kembali ? (
        <div className="flex flex-col gap-2">
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2} placeholder="Apa yang perlu diubah? (mis. kurangi minyak, stok masih ada)" aria-label="Catatan pengembalian" />
          <div className="flex justify-end">
            <Button variant="outline" disabled={menunggu || !catatan.trim()} onClick={() => jalankan(mulai, () => kembalikanPr(id, catatan), "Dikembalikan ke pembelanja")}>
              Kirim kembali ke Draft
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function TombolBatal({ id }: { id: string }) {
  const [yakin, setYakin] = useState(false);
  const [menunggu, mulai] = useTransition();
  return yakin ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Batalkan PR ini?</span>
      <Button variant="outline" disabled={menunggu} onClick={() => setYakin(false)}>
        Tidak
      </Button>
      <Button variant="destructive" disabled={menunggu} onClick={() => jalankan(mulai, () => batalkanPr(id), "PR dibatalkan")}>
        Ya, batalkan
      </Button>
    </div>
  ) : (
    <Button variant="ghost" onClick={() => setYakin(true)}>
      Batalkan PR
    </Button>
  );
}

/** Semua barang sudah dibelanjakan → PR selesai (D-081). */
export function TombolSelesai({ id }: { id: string }) {
  const [menunggu, mulai] = useTransition();
  return (
    <Button disabled={menunggu} onClick={() => jalankan(mulai, () => selesaikanPr(id), "PR ditandai selesai")}>
      {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      Tandai selesai
    </Button>
  );
}
