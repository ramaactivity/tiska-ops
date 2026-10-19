"use client";

import { LoaderCircle, Plus, Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rupiah } from "@/lib/uang";

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
  /** 🔒 undefined = peran ini tidak boleh melihat harga. */
  nilai?: number | null;
  harga?: number | null;
};

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
    baris.map((b) => ({ id: b.id, idBahan: b.idBahan, nama: b.nama, qtyBeli: keAngka(b.qtyBeli), satuanBeli: b.satuanBeli, note: b.note?.trim() || null }));
  const salah = baris.find((b) => !Number.isFinite(keAngka(b.qtyBeli)) || keAngka(b.qtyBeli) < 0);
  // Nilai baris baru belum diketahui sampai disimpan (harga dihitung server).
  const total = lihatHarga ? baris.reduce((s, b) => s + (b.harga != null ? Math.round(keAngka(b.qtyBeli) * b.harga) : 0), 0) : 0;

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
              onPilih={(p) => tambah({ id: null, idBahan: p.id, nama: p.label, perlu: null, qtyBeli: "1", satuanBeli: p.sub?.split(" · ").at(-1) ?? null, note: null, manual: true })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input value={lain.nama} onChange={(e) => setLain({ ...lain, nama: e.target.value })} placeholder="Barang lain (tidak ada di master)" className="min-w-0 flex-1" aria-label="Nama barang lain" />
            <Input value={lain.satuan} onChange={(e) => setLain({ ...lain, satuan: e.target.value })} placeholder="Satuan" className="w-28" aria-label="Satuan barang lain" />
            <Button
              variant="outline"
              disabled={!lain.nama.trim()}
              onClick={() => {
                tambah({ id: null, idBahan: null, nama: lain.nama.trim(), perlu: null, qtyBeli: "1", satuanBeli: lain.satuan.trim() || null, note: null, manual: true, harga: lihatHarga ? null : undefined });
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
          Belum ada barang. Menu di event ini belum tersambung resep (lihat catatan di bawah) — tambahkan barangnya manual di atas.
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
                {lihatHarga && b.harga != null ? ` · @ ${rupiah(b.harga)}/${b.satuanBeli ?? "satuan"}` : lihatHarga && b.id ? " · belum ada harga" : ""}
              </p>
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
                {b.harga != null ? rupiah(Math.round(keAngka(b.qtyBeli) * b.harga)) : "—"}
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
