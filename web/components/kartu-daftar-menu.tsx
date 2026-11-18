"use client";

import { CircleAlert, CircleCheck, Link2, LoaderCircle, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PilihDropdown, type KelompokDropdown } from "@/components/pilih-dropdown";
import { calonMirip } from "@/lib/cari-mirip";
import { kunciMenu } from "@/lib/hitung/menu-dapur";
import { pecahNamaIsi, tebakKategoriMenu } from "@/lib/hitung/menu-baru";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";

type MenuAda = { id: string; nama: string; kategori: string | null };
export type DataMenuBaru = { nama: string; namaEn: string; keterangan: string; kategori: string };

// Dikelompokkan seperti urutan sajian, supaya 17 kategori mudah dipindai.
const KELOMPOK_KATEGORI: KelompokDropdown[] = (
  [
    ["Pembuka", ["appetizer", "soup"]],
    ["Hidangan utama", ["rice", "pasta", "beef", "chicken", "fish", "seafood", "egg_tofu", "vegetable", "side"]],
    ["Stall & pelengkap", ["stall", "condiment", "snack"]],
    ["Penutup & minuman", ["dessert", "fruit", "beverage"]],
  ] as [string, KategoriMenu[]][]
).map(([judul, kunci]) => ({ judul, opsi: kunci.map((id) => ({ id, label: KATEGORI_MENU[id] })) }));
const labelKategori = (k: string | null) => (k ? (KATEGORI_MENU[k as KategoriMenu] ?? k) : "tanpa kategori");

/**
 * Kartu "Daftarkan ke menu" (D-165). Teks isi yang diketik bebas dipecah jadi nama menu / nama Inggris / keterangan,
 * menu yang mirip ditampilkan lebih dulu supaya tidak dobel, dan kategori wajib dipilih. Teks di dokumen tidak berubah.
 */
export function KartuDaftarMenu({
  teks,
  menu,
  onTutup,
  onDaftar,
  onPakai,
}: {
  /** Teks isi di dokumen; null = kartu tertutup. */
  teks: string | null;
  menu: MenuAda[];
  onTutup: () => void;
  onDaftar: (d: DataMenuBaru) => Promise<boolean>;
  onPakai: (m: MenuAda) => void;
}) {
  return (
    <Dialog open={teks !== null} onOpenChange={(o) => (o ? null : onTutup())}>
      <DialogContent className="flex max-h-[92dvh] sm:max-h-[min(calc(100dvh-6rem),820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {teks !== null ? <IsiKartu key={teks} teks={teks} menu={menu} onTutup={onTutup} onDaftar={onDaftar} onPakai={onPakai} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function IsiKartu({ teks, menu, onTutup, onDaftar, onPakai }: { teks: string; menu: MenuAda[]; onTutup: () => void; onDaftar: (d: DataMenuBaru) => Promise<boolean>; onPakai: (m: MenuAda) => void }) {
  const awal = useMemo(() => pecahNamaIsi(teks), [teks]);
  const [d, setD] = useState<DataMenuBaru>(() => ({ nama: awal.nama, namaEn: awal.namaEn, keterangan: awal.keterangan, kategori: tebakKategoriMenu(awal) ?? "" }));
  const [kirim, setKirim] = useState(false);
  const ubah = (k: keyof DataMenuBaru, v: string) => setD((l) => ({ ...l, [k]: v }));

  const kunci = kunciMenu(d.nama);
  const persis = kunci.length >= 2 ? menu.find((m) => kunciMenu(m.nama) === kunci) : undefined;
  const mirip = useMemo(
    () => (d.nama.trim().length >= 3 ? calonMirip(d.nama, menu, (m) => m.nama, 0.45, 5).map((c) => c.x).filter((m) => m.id !== persis?.id) : []),
    [d.nama, menu, persis?.id],
  );
  // Nama persis sudah ada → tombol utama menautkan ke menu itu (kolom kosongnya dilengkapi), bukan membuat kembaran.
  const kategori = d.kategori || persis?.kategori || "";
  const bisa = kunci.length >= 2 && Boolean(kategori) && !kirim;

  return (
    <>
      <div className="border-b px-6 pt-5 pb-4">
        <DialogTitle className="text-lg font-semibold">Daftarkan ke data menu</DialogTitle>
        <DialogDescription className="mt-1">
          Teks di dokumen tidak berubah. Yang masuk data menu hanya nama menunya, supaya dapur, laporan, dan pencarian menu tetap rapi.
        </DialogDescription>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto text-sm">
        <section className="px-6 py-4">
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Teks di dokumen</p>
          <p className="rounded-[10px] border border-dashed bg-muted/40 px-3 py-2">{teks}</p>
          {awal.gandaMenu ? (
            <p className="mt-2 flex items-start gap-2 text-perhatian">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              Baris ini sepertinya berisi 2 menu (dipisah “/”). Daftarkan satu dulu — tulis nama menu pertama di bawah.
            </p>
          ) : null}
        </section>

        <section className="border-t px-6 py-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">1 · Cek dulu, sudah ada belum?</p>
          {persis ? (
            <div className="mb-2 flex items-center gap-3 rounded-[10px] border border-info-garis bg-info-halus px-3 py-2">
              <CircleCheck className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{persis.nama}</span> sudah ada di data menu ({labelKategori(persis.kategori)}).
                <span className="block text-xs text-muted-foreground">Tekan “Tautkan” di bawah — nama Inggris & keterangan hanya mengisi yang masih kosong.</span>
              </span>
            </div>
          ) : null}
          {mirip.length ? <p className="mb-1.5 text-muted-foreground">Mirip dengan menu ini — kalau sama, tekan “Pakai menu ini”:</p> : null}
          {mirip.length ? (
            <ul className="flex flex-col divide-y divide-border-row rounded-[10px] border">
              {mirip.map((m) => (
                <BarisMirip key={m.id} m={m} onPakai={onPakai} />
              ))}
            </ul>
          ) : !persis ? (
            <p className="flex items-center gap-2 text-lunas">
              <CircleCheck className="size-4" /> Tidak ada menu yang mirip — aman ditambahkan sebagai menu baru.
            </p>
          ) : null}
        </section>

        <section className="border-t px-6 py-4">
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">2 · {persis ? "Lengkapi data menu" : "Lengkapi data menu baru"}</p>
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Kolom label="Nama menu (Indonesia)" id="mb-nama" wajib>
              <Input id="mb-nama" value={d.nama} onChange={(e) => ubah("nama", e.target.value)} placeholder="mis. Sate Daging Haas" />
            </Kolom>
            <Kolom label="Nama Inggris" id="mb-en">
              <Input id="mb-en" value={d.namaEn} onChange={(e) => ubah("namaEn", e.target.value)} placeholder="mis. Indonesian Spiced Beef Satay" />
            </Kolom>
            <Kolom label="Keterangan" id="mb-ket">
              <Input id="mb-ket" value={d.keterangan} onChange={(e) => ubah("keterangan", e.target.value)} placeholder="mis. not spicy, isi 3 tusuk" />
            </Kolom>
            <Kolom label="Kategori" id="mb-kat" wajib>
              <PilihDropdown id="mb-kat" nilai={kategori} kelompok={KELOMPOK_KATEGORI} onPilih={(v) => ubah("kategori", v)} placeholder="Pilih kategori…" />
            </Kolom>
          </div>
        </section>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t bg-muted/40 px-6 py-3.5 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground sm:mr-auto">
          {!kategori ? "Kategori wajib dipilih." : ""}
        </p>
        <Button type="button" variant="outline" className="h-11" onClick={onTutup}>
          Batal
        </Button>
        <Button
          type="button"
          className="h-11 px-5"
          disabled={!bisa}
          onClick={async () => {
            setKirim(true);
            const ok = await onDaftar({ ...d, kategori });
            setKirim(false);
            if (ok) onTutup();
          }}
        >
          {kirim ? <LoaderCircle className="size-4 animate-spin" /> : persis ? <Link2 className="size-4" /> : <Plus className="size-4" />}
          {persis ? "Tautkan ke menu ini" : "Tambahkan ke data menu"}
        </Button>
      </div>
    </>
  );
}

function BarisMirip({ m, onPakai }: { m: MenuAda; onPakai: (m: MenuAda) => void }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="font-medium">{m.nama}</span>
        <span className="block text-xs text-muted-foreground">{labelKategori(m.kategori)}</span>
      </span>
      <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => onPakai(m)}>
        Pakai menu ini
      </Button>
    </li>
  );
}

function Kolom({ label, id, wajib, children }: { label: string; id: string; wajib?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {wajib ? <span className="text-muted-foreground"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
