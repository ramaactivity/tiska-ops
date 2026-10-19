"use client";

import { FileText, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PilihCari } from "@/components/pilih-cari";
import { PilihanChip } from "@/components/pilihan-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERAN_TUGAS } from "@/lib/hitung/penugasan";
import { tanggalSesiPendek } from "@/lib/sesi";
import { LABEL_STATUS_DAPUR, LABEL_STATUS_KIRIM } from "@/lib/tim";

const LABEL_STATUS: Record<string, string> = { ...LABEL_STATUS_DAPUR, ...LABEL_STATUS_KIRIM };

import { hapusAnggota, hapusKloter, tambahAnggota, tambahKloter } from "../actions";
import { PilihJam } from "@/components/pilih-jam";

export type KloterTampil = {
  id: string;
  tanggal: string;
  no: number;
  jam: string;
  catatan: string | null;
  lacak?: { id: string; status: string; jam: string; foto: boolean; oleh: string | null }[];
  anggota: { id: string; nama: string; peran: string; kendaraan: string | null; tugas: string | null; siap?: boolean }[];
};

function useAksi() {
  const [menunggu, mulai] = useTransition();
  const jalan = (kerja: () => Promise<void>, sukses: string) =>
    mulai(async () => {
      try {
        await kerja();
        toast.success(sukses);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    });
  return { menunggu, jalan };
}

function TambahAnggota({ idKloter, orang, kendaraan }: { idKloter: string; orang: { id: string; label: string }[]; kendaraan: { nilai: string; label: string }[] }) {
  const { menunggu, jalan } = useAksi();
  const [pilih, setPilih] = useState<{ id: string; label: string } | undefined>();
  const [nama, setNama] = useState("");
  const [peran, setPeran] = useState("crew");
  const [mobil, setMobil] = useState("");
  const [tugas, setTugas] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <PilihCari nilai={pilih} pilihan={orang} onPilih={(o) => { setPilih(o); setNama(""); }} placeholder="Pilih anggota tim…" />
        <Input value={nama} onChange={(e) => { setNama(e.target.value); setPilih(undefined); }} placeholder="…atau tulis nama DW" aria-label="Nama DW" />
      </div>
      <PilihanChip kecil label="Peran" nilai={peran} onPilih={setPeran} pilihan={Object.entries(PERAN_TUGAS).map(([nilai, label]) => ({ nilai, label }))} />
      {kendaraan.length ? <PilihanChip kecil label="Kendaraan" nilai={mobil} onPilih={(v) => setMobil(mobil === v ? "" : v)} pilihan={kendaraan} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={tugas} onChange={(e) => setTugas(e.target.value)} placeholder="Tugas khusus, mis. ambil bunga" aria-label="Tugas khusus" className="max-w-xs" />
        <Button
          size="sm"
          className="rounded-full"
          disabled={menunggu || (!pilih && !nama.trim())}
          onClick={() =>
            jalan(async () => {
              await tambahAnggota(idKloter, { userId: pilih?.id ?? null, nama, peran, kendaraanId: mobil || null, tugas });
              setPilih(undefined);
              setNama("");
              setTugas("");
              setMobil("");
            }, "Anggota ditambahkan")
          }
        >
          {menunggu ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" />}
          Tambah
        </Button>
      </div>
    </div>
  );
}

export function PenugasanEvent({
  idEvent,
  tanggal,
  kloter,
  orang,
  kendaraan,
  ubah,
}: {
  idEvent: string;
  tanggal: string[];
  kloter: KloterTampil[];
  orang: { id: string; label: string }[];
  kendaraan: { nilai: string; label: string }[];
  ubah: boolean;
}) {
  const { menunggu, jalan } = useAksi();
  const [tgl, setTgl] = useState(tanggal[0] ?? "");
  const [jam, setJam] = useState("");
  const [catatan, setCatatan] = useState("");
  return (
    <div className="flex flex-col gap-4">
      {kloter.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada kloter.</p> : null}
      {kloter.map((k) => (
        <div key={k.id} className="rounded-xl border p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium">
              Kloter {k.no} · {tanggalSesiPendek(k.tanggal)} · {k.jam} berangkat dr Julang
              {k.catatan ? <span className="block text-xs font-normal text-muted-foreground">{k.catatan}</span> : null}
              {k.lacak?.length ? (
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs font-normal">
                  {k.lacak.map((l) => (
                    <span key={l.id}>
                      {LABEL_STATUS[l.status] ?? l.status} {l.jam}
                      {l.oleh ? ` · ${l.oleh}` : ""}
                      {l.foto ? (
                        <>
                          {" · "}
                          <a href={`/event/foto/${l.id}`} target="_blank" rel="noopener" className="underline underline-offset-2">
                            foto
                          </a>
                        </>
                      ) : null}
                    </span>
                  ))}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="rounded-full" render={<a href={`/event/${idEvent}/delivery-order?kloter=${k.id}`} target="_blank" rel="noopener" />}>
                <FileText className="size-4" />
                Delivery order
              </Button>
            {ubah ? (
              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Hapus kloter ${k.no}`} disabled={menunggu} onClick={() => jalan(() => hapusKloter(k.id), "Kloter dihapus")}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
            </div>
          </div>
          <ol className="mt-2 flex flex-col gap-1 text-sm">
            {k.anggota.map((a, n) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <span>
                  {n + 1}. {a.siap ? "✅ " : "⏳ "}
                  {a.nama}
                  <span className="text-muted-foreground">
                    {" "}
                    · {PERAN_TUGAS[a.peran as keyof typeof PERAN_TUGAS] ?? a.peran}
                    {a.kendaraan ? ` · ${a.kendaraan}` : ""}
                    {a.tugas ? ` 👉🏻 ${a.tugas}` : ""}
                  </span>
                </span>
                {ubah ? (
                  <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`Hapus ${a.nama}`} disabled={menunggu} onClick={() => jalan(() => hapusAnggota(a.id), "Anggota dihapus")}>
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
          {ubah ? (
            <div className="mt-2">
              <TambahAnggota idKloter={k.id} orang={orang} kendaraan={kendaraan} />
            </div>
          ) : null}
        </div>
      ))}
      {ubah ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3">
          <span className="text-sm font-medium">Tambah kloter</span>
          {tanggal.length > 1 ? <PilihanChip kecil label="Tanggal kloter" nilai={tgl} onPilih={setTgl} pilihan={tanggal.map((t) => ({ nilai: t, label: tanggalSesiPendek(t) }))} /> : null}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-44">
              <PilihJam value={jam} onChange={setJam} placeholder="Jam berangkat" aria-label="Jam berangkat" />
            </div>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan, mis. sekalian bawa menu breakfast" aria-label="Catatan kloter" className="min-w-48 flex-1" />
            <Button size="sm" variant="outline" className="rounded-full" disabled={menunggu || !tgl || !jam.trim()} onClick={() => jalan(async () => { await tambahKloter(idEvent, { tanggal: tgl, jam, catatan }); setJam(""); setCatatan(""); }, "Kloter ditambahkan")}>
              <Plus className="size-4" />
              Kloter
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
