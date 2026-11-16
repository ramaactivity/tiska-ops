"use client";

import { Check, CornerDownLeft, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { rapikanTeks, saringMirip } from "@/lib/cari-mirip";
import { KATEGORI_MENU, type KategoriMenu } from "@/lib/menu";
import { cn } from "@/lib/utils";

type MenuAda = { id: string; nama: string; kategori: string | null };

// Urutan sajian, sama dengan kartu "Daftarkan ke menu" (D-166).
const KELOMPOK: [string, KategoriMenu[]][] = [
  ["Pembuka", ["appetizer", "soup"]],
  ["Hidangan utama", ["rice", "pasta", "beef", "chicken", "fish", "seafood", "egg_tofu", "vegetable", "side"]],
  ["Stall & pelengkap", ["stall", "condiment", "snack"]],
  ["Penutup & minuman", ["dessert", "fruit", "beverage"]],
];
const kelompokDari = (k: string | null) => KELOMPOK.find(([, ks]) => ks.includes(k as KategoriMenu))?.[0] ?? "Belum berkategori";

type Baris = { jenis: "menu"; m: MenuAda } | { jenis: "baru"; teks: string };

/**
 * Panel cari menu ala Spotlight (D-167): kotak cari besar di tengah atas layar, hasil dikelompokkan per kategori,
 * chip filter kelompok, ↑↓ + Enter. Panel tetap terbuka sesudah menambah supaya isi paket bisa diisi berturut-turut.
 * Nama baru hanya opsi terakhir (D-163) — cari di daftar dulu.
 */
export function PaletMenu({
  buka,
  onTutup,
  menu,
  sudahAda,
  onPilih,
  onTulisBaru,
}: {
  buka: boolean;
  onTutup: () => void;
  menu: MenuAda[];
  /** Nama isi yang sudah ada di baris ini — ditandai "sudah ada". */
  sudahAda: string[];
  onPilih: (m: MenuAda) => void;
  onTulisBaru: (teks: string) => void;
}) {
  return (
    <Dialog open={buka} onOpenChange={(o) => (o ? null : onTutup())}>
      <DialogContent
        showCloseButton={false}
        lembarHp={false}
        className="top-[10vh] flex max-h-[min(78dvh,680px)] -translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl p-0 shadow-[0_24px_64px_-20px_rgba(31,42,92,0.45)] sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Tambah isi menu</DialogTitle>
        <DialogDescription className="sr-only">Cari menu dari daftar, tekan Enter untuk menambah.</DialogDescription>
        {buka ? <IsiPalet menu={menu} sudahAda={sudahAda} onPilih={onPilih} onTulisBaru={onTulisBaru} onTutup={onTutup} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function IsiPalet({ menu, sudahAda, onPilih, onTulisBaru, onTutup }: { menu: MenuAda[]; sudahAda: string[]; onPilih: (m: MenuAda) => void; onTulisBaru: (t: string) => void; onTutup: () => void }) {
  const [teks, setTeks] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [aktif, setAktif] = useState(0);
  const [ditambah, setDitambah] = useState<string[]>([]);
  const daftar = useRef<HTMLDivElement>(null);
  const ada = useMemo(() => new Set(sudahAda.map(rapikanTeks)), [sudahAda]);

  const q = teks.trim();
  const { kelompok, rata } = useMemo(() => {
    const sumber = filter ? menu.filter((m) => kelompokDari(m.kategori) === filter) : menu;
    // Tanpa ketikan: hanya tampilkan isi kelompok yang dipilih (daftar penuh terlalu panjang untuk dipindai).
    const hasil = q ? saringMirip(q, sumber, (m) => m.nama, 40) : filter ? [...sumber].sort((a, b) => a.nama.localeCompare(b.nama, "id")) : [];
    const peta = new Map<string, MenuAda[]>();
    for (const m of hasil) {
      const k = kelompokDari(m.kategori);
      peta.set(k, [...(peta.get(k) ?? []), m]);
    }
    const kelompok = [...peta.entries()];
    const rata: Baris[] = kelompok.flatMap(([, ms]) => ms.map((m) => ({ jenis: "menu" as const, m })));
    const persis = menu.some((m) => rapikanTeks(m.nama) === rapikanTeks(q));
    if (q.length >= 2 && !persis) rata.push({ jenis: "baru", teks: q });
    return { kelompok, rata };
  }, [menu, q, filter]);

  useEffect(() => {
    daftar.current?.querySelector(`[data-indeks="${aktif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aktif]);

  const pakai = (b: Baris | undefined) => {
    if (!b) return;
    if (b.jenis === "menu") {
      onPilih(b.m);
      setDitambah((d) => [...d, b.m.nama]);
    } else {
      onTulisBaru(b.teks);
      setDitambah((d) => [...d, b.teks]);
    }
    setTeks("");
  };

  const indeksMenu = new Map(rata.flatMap((b, i) => (b.jenis === "menu" ? [[b.m.id, i] as const] : [])));
  const barisMenu = (m: MenuAda) => {
    const i = indeksMenu.get(m.id) ?? -1;
    const sudah = ada.has(rapikanTeks(m.nama)) || ditambah.includes(m.nama);
    return (
      <li key={m.id}>
        <button
          type="button"
          data-indeks={i}
          onMouseMove={() => setAktif(i)}
          onClick={() => pakai({ jenis: "menu", m })}
          className={cn("flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[0.9375rem]", aktif === i && "bg-accent")}
        >
          <span className="min-w-0 flex-1 truncate">{m.nama}</span>
          {sudah ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lunas-halus px-2 py-0.5 text-xs text-lunas">
              <Check className="size-3" /> sudah ada
            </span>
          ) : null}
          <span className="shrink-0 text-xs text-muted-foreground">{m.kategori ? (KATEGORI_MENU[m.kategori as KategoriMenu] ?? m.kategori) : "tanpa kategori"}</span>
          {aktif === i ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
        </button>
      </li>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b px-5">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          value={teks}
          onChange={(e) => {
            setTeks(e.target.value);
            setAktif(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAktif((a) => Math.min(a + 1, rata.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAktif((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              pakai(rata[aktif]);
            }
          }}
          placeholder="Cari menu… mis. ayam bakar, puding, sambal"
          aria-label="Cari menu"
          role="combobox"
          aria-expanded={rata.length > 0}
          aria-controls="palet-menu-hasil"
          className="h-16 min-w-0 flex-1 bg-transparent text-xl outline-none placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden shrink-0 rounded-md border bg-muted px-1.5 py-0.5 font-sans text-xs text-muted-foreground sm:inline">Esc</kbd>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b px-5 py-3" role="group" aria-label="Saring kelompok menu">
        {[null, ...KELOMPOK.map(([j]) => j)].map((j) => (
          <button
            key={j ?? "semua"}
            type="button"
            aria-pressed={filter === j}
            onClick={() => {
              setFilter(j);
              setAktif(0);
            }}
            className={cn(
              "min-h-8 rounded-full border px-3 text-[0.8125rem] transition-colors",
              filter === j ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {j ?? "Semua"}
          </button>
        ))}
      </div>

      <div ref={daftar} id="palet-menu-hasil" className="min-h-40 flex-1 overflow-y-auto p-2" role="listbox">
        {!q && !filter ? (
          <p className="px-3 py-8 text-center text-muted-foreground">
            Ketik nama menu, atau pilih kelompok di atas untuk melihat isinya.
          </p>
        ) : (
          <>
            {kelompok.map(([judul, ms]) => (
              <section key={judul} className="mb-1">
                <p className="px-3 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">{judul}</p>
                <ul>{ms.map(barisMenu)}</ul>
              </section>
            ))}
            {q && !kelompok.length ? <p className="px-3 pt-4 pb-2 text-muted-foreground">Tidak ada di daftar menu.</p> : null}
            {rata.at(-1)?.jenis === "baru"
              ? (() => {
                  const i = rata.length - 1;
                  return (
                    <div className="mt-1 border-t pt-2">
                      <button
                        type="button"
                        data-indeks={i}
                        onMouseMove={() => setAktif(i)}
                        onClick={() => pakai(rata[i])}
                        className={cn("flex min-h-12 w-full items-center gap-3 rounded-[10px] px-3 text-left", aktif === i && "bg-accent")}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Plus className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          Belum ada? Pakai nama baru <b className="font-semibold">“{q}”</b>
                          <span className="block text-xs text-muted-foreground">Ditulis sendiri, belum masuk daftar menu — bisa didaftarkan nanti</span>
                        </span>
                      </button>
                    </div>
                  );
                })()
              : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
        <span className="hidden sm:inline">↑ ↓ pilih</span>
        <span className="hidden sm:inline">Enter tambah</span>
        <span className="min-w-0 flex-1 truncate">
          {ditambah.length ? <span className="text-lunas">✓ {ditambah.length} ditambahkan: {ditambah.join(", ")}</span> : "Panel tetap terbuka — bisa tambah beberapa isi sekaligus."}
        </span>
        <button type="button" onClick={onTutup} className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Selesai
        </button>
      </div>
    </>
  );
}
