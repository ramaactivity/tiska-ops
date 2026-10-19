"use client";

import { LoaderCircle, PackageCheck, Plus, Trash2, Truck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari, type OpsiCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupiah } from "@/lib/uang";

import { hapusAlatEvent, kembalikanAlat, keluarkanAlat, tambahAlatEvent } from "../../peralatan/actions";

type Baris = {
  id: string;
  nama: string;
  vendor: string | null;
  qty: number;
  satuan: string;
  biayaSewa: number | null;
  status: string;
  baik: number | null;
  rusak: number;
  hilang: number;
  catatan: string | null;
  /** Tersedia lebih sedikit dari yang direncanakan (event lain di tanggal sama). */
  kurang: number | null;
};

const bulat = (t: string) => (t.trim() === "" ? 0 : Number(t.replace(/\D/g, "")));

function jalan(mulai: (f: () => Promise<void>) => void, kerja: () => Promise<void>, ok: string) {
  mulai(async () => {
    try {
      await kerja();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal.");
    }
  });
}

function Kembali({ b }: { b: Baris }) {
  const [buka, setBuka] = useState(false);
  const [rusak, setRusak] = useState("0");
  const [hilang, setHilang] = useState("0");
  const [catatan, setCatatan] = useState("");
  const [menunggu, mulai] = useTransition();
  if (!buka) {
    return (
      <Button size="sm" variant="outline" onClick={() => setBuka(true)}>
        <PackageCheck className="size-4" />
        Kembali
      </Button>
    );
  }
  return (
    <div className="flex basis-full flex-wrap items-center gap-2 rounded-[10px] bg-muted p-3 text-sm">
      Rusak <Input value={rusak} inputMode="numeric" onChange={(e) => setRusak(e.target.value)} className="w-16 bg-card text-right font-mono" aria-label={`Rusak ${b.nama}`} />
      Hilang <Input value={hilang} inputMode="numeric" onChange={(e) => setHilang(e.target.value)} className="w-16 bg-card text-right font-mono" aria-label={`Hilang ${b.nama}`} />
      <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan, mis. 2 piring pecah di venue" className="min-w-40 flex-1 bg-card" aria-label={`Catatan kembali ${b.nama}`} />
      <Button size="sm" disabled={menunggu} onClick={() => jalan(mulai, () => kembalikanAlat(b.id, bulat(rusak), bulat(hilang), catatan), `${b.nama} kembali.`)}>
        {menunggu ? <LoaderCircle className="size-4 animate-spin" /> : null}
        Simpan
      </Button>
    </div>
  );
}

/** Alat per event: tambah milik/sewaan → Bawa keluar → Kembali (rusak/hilang). */
export function AlatEvent({ idEvent, pilihan, baris }: { idEvent: string; pilihan: (OpsiCari & { tersedia: number | null; satuan: string })[]; baris: Baris[] }) {
  const [asal, setAsal] = useState("milik");
  const [alat, setAlat] = useState<(typeof pilihan)[number] | undefined>();
  const [qty, setQty] = useState("");
  const [nama, setNama] = useState("");
  const [vendor, setVendor] = useState("");
  const [biaya, setBiaya] = useState("");
  const [menunggu, mulai] = useTransition();
  const lebih = asal === "milik" && alat?.tersedia != null && bulat(qty) > alat.tersedia;

  return (
    <div className="flex flex-col gap-3">
      {baris.length ? (
        <ul className="divide-y rounded-[12px] border">
          {baris.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {b.nama} <span className="font-mono text-sm tabular-nums">× {b.qty} {b.satuan}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {b.vendor ? `Sewa dari ${b.vendor}${b.biayaSewa ? ` · ${rupiah(b.biayaSewa)}` : ""}` : "Milik sendiri"}
                  {b.status === "keluar" ? " · sedang dibawa" : ""}
                  {b.status === "kembali" ? ` · kembali ${b.baik ?? 0} baik${b.rusak ? `, ${b.rusak} rusak` : ""}${b.hilang ? `, ${b.hilang} hilang` : ""}` : ""}
                  {b.catatan ? ` · ${b.catatan}` : ""}
                </p>
                {b.kurang !== null ? <p className="text-xs text-perhatian">⚠️ Hanya tersedia {b.kurang} — sisanya dipakai event lain di tanggal yang sama / rusak.</p> : null}
              </div>
              {b.status === "rencana" ? (
                <>
                  <Button size="sm" variant="outline" disabled={menunggu} onClick={() => jalan(mulai, () => keluarkanAlat(b.id), `${b.nama} dibawa keluar.`)}>
                    <Truck className="size-4" />
                    Bawa keluar
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Hapus ${b.nama}`} disabled={menunggu} onClick={() => jalan(mulai, () => hapusAlatEvent(b.id), "Dihapus.")}>
                    <Trash2 className="size-4" />
                  </Button>
                </>
              ) : b.status === "keluar" ? (
                <Kembali b={b} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada alat untuk event ini.</p>
      )}

      <div className="flex flex-col gap-2 rounded-[12px] border p-3">
        <PilihanChip
          kecil
          label="Asal alat"
          nilai={asal}
          onPilih={setAsal}
          pilihan={[
            { nilai: "milik", label: "Milik sendiri" },
            { nilai: "sewa", label: "Sewa dari vendor" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          {asal === "milik" ? (
            <div className="min-w-56 flex-1">
              <PilihCari nilai={alat} pilihan={pilihan} onPilih={(p) => setAlat(p as typeof alat)} placeholder="Cari alat, mis. chafing" />
            </div>
          ) : (
            <>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama alat, mis. tenda 3×3" className="min-w-40 flex-1" aria-label="Nama alat sewaan" />
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor" className="w-40" aria-label="Vendor sewaan" />
              <Input
                value={biaya ? Number(biaya).toLocaleString("id-ID") : ""}
                inputMode="numeric"
                onChange={(e) => setBiaya(e.target.value.replace(/\D/g, ""))}
                placeholder="Biaya sewa"
                className="w-32 text-right font-mono"
                aria-label="Biaya sewa"
              />
            </>
          )}
          <Input value={qty} inputMode="numeric" onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} placeholder="Jumlah" className="w-24 text-right font-mono" aria-label="Jumlah alat" />
          <Button
            variant="outline"
            disabled={menunggu || !(bulat(qty) > 0) || (asal === "milik" ? !alat : nama.trim().length < 2 || vendor.trim().length < 2)}
            onClick={() =>
              jalan(
                mulai,
                async () => {
                  await tambahAlatEvent(idEvent, {
                    idAlat: asal === "milik" ? alat!.id : null,
                    vendor: asal === "sewa" ? vendor : "",
                    nama: asal === "sewa" ? nama : "",
                    qty: bulat(qty),
                    biayaSewa: asal === "sewa" && biaya ? Number(biaya) : null,
                  });
                  setQty("");
                  setNama("");
                  setBiaya("");
                },
                "Alat ditambahkan.",
              )
            }
          >
            <Plus className="size-4" />
            Tambah
          </Button>
        </div>
        {lebih ? <p className="text-xs text-perhatian">⚠️ Tersedia hanya {alat!.tersedia} {alat!.satuan} di tanggal ini — kurangnya bisa disewa dari vendor.</p> : null}
      </div>
    </div>
  );
}
