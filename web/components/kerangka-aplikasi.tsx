"use client";

import {
  Banknote,
  BookOpen,
  Building2,
  Calculator,
  CalendarCheck,
  Car,
  Carrot,
  ChartColumn,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  Circle,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Menu,
  MonitorPlay,
  Package,
  PackageCheck,
  PackageOpen,
  Percent,
  ReceiptText,
  ScrollText,
  ShoppingBasket,
  Truck,
  UserCog,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { LogoTiska } from "@/components/logo-tiska";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Sesi } from "@/lib/auth";
import { type KelompokMenu, LABEL_PERAN } from "@/lib/navigasi";
import { DEFINISI_IMPOR } from "@/lib/impor/definisi";
import { cn } from "@/lib/utils";

/**
 * Kerangka aplikasi — sistem desain v2 (D-059).
 *
 * Sidebar di atas latar gradasi, menu berikon dengan kelompok yang bisa
 * dilipat, halaman aktif = kartu putih. Isi halaman berada di panel membulat
 * dengan breadcrumb di atasnya. Sidebar bisa diciutkan menjadi deret ikon
 * (pilihan diingat per browser). Di HP: bilah atas + laci menu.
 */

const IKON: Record<string, LucideIcon> = {
  dasbor: LayoutDashboard,
  operasional: Truck,
  tim: UsersRound,
  event: CalendarCheck,
  pengiriman: PackageCheck,
  "layar-dapur": MonitorPlay,
  kendaraan: Car,
  penawaran: FileText,
  lead: Inbox,
  tagihan: ReceiptText,
  pembayaran: Banknote,
  "laporan-penjualan": ChartColumn,
  "laporan-piutang": Wallet,
  "laporan-margin": Percent,
  pelanggan: Users,
  produk: Package,
  paket: PackageOpen,
  pricelist: BookOpen,
  resep: ChefHat,
  menu: UtensilsCrossed,
  bahan: Carrot,
  "kebutuhan-bahan": ShoppingBasket,
  belanja: ClipboardList,
  "angka-bisnis": Calculator,
  syarat: ScrollText,
  pengguna: UserCog,
  perusahaan: Building2,
};

const KUNCI_CIUT = "sidebar-ciut";
const KUNCI_LIPAT = "sidebar-lipat";

function baca<T>(kunci: string, cadangan: T): T {
  try {
    const v = window.localStorage.getItem(kunci);
    return v ? (JSON.parse(v) as T) : cadangan;
  } catch {
    return cadangan;
  }
}
function simpan(kunci: string, nilai: unknown) {
  try {
    window.localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch {
    // Penyimpanan browser bisa ditutup — pilihan tampilan saja, tidak wajib.
  }
}

export function KerangkaAplikasi({
  sesi,
  kelompok,
  onKeluar,
  children,
}: {
  sesi: Sesi;
  /**
   * Menu yang sudah disaring DI SERVER dengan peta izin yang sama dengan
   * penjaga halamannya.
   */
  kelompok: KelompokMenu[];
  onKeluar: () => Promise<void>;
  children: React.ReactNode;
}) {
  const jalur = usePathname();
  const [bukaMenu, setBukaMenu] = useState(false);
  const [ciut, setCiut] = useState(false);
  const [lipat, setLipat] = useState<string[]>([]);

  useEffect(() => {
    // Pilihan tampilan tersimpan di browser (sistem luar) — dibaca sekali saat dibuka.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCiut(baca(KUNCI_CIUT, false));
    setLipat(baca<string[]>(KUNCI_LIPAT, []));
  }, []);

  // Halaman impor (/impor/customer) menyala di menu asalnya (Customer).
  const jalurMenu = DEFINISI_IMPOR[jalur.match(/^\/impor\/([^/]+)/)?.[1] ?? ""]?.kembali ?? jalur;
  const aktif = kelompok
    .flatMap((k) => k.butir.map((b) => ({ k: k.judul, b })))
    .filter(({ b }) => jalurMenu === b.href || jalurMenu.startsWith(`${b.href}/`))
    .sort((x, y) => y.b.href.length - x.b.href.length)[0];

  const ubahCiut = () => {
    setCiut((c) => {
      simpan(KUNCI_CIUT, !c);
      return !c;
    });
  };
  const ubahLipat = (judul: string) =>
    setLipat((l) => {
      const baru = l.includes(judul) ? l.filter((x) => x !== judul) : [...l, judul];
      simpan(KUNCI_LIPAT, baru);
      return baru;
    });

  return (
    <div className="min-h-dvh bg-[image:var(--shell)] lg:flex">
      {/* Sidebar tetap — layar lebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col transition-[width] duration-300 lg:flex",
          ciut ? "w-[76px]" : "w-64",
        )}
      >
        <div className={cn("flex h-20 items-center", ciut ? "justify-center" : "px-4")}>
          {ciut ? <LogoTiska varian="portrait" tinggi={44} /> : <LogoTiska tinggi={56} />}
        </div>
        <IsiNavigasi kelompok={kelompok} aktif={aktif?.b.href} ciut={ciut} lipat={lipat} onLipat={ubahLipat} />
        <KartuPengguna sesi={sesi} onKeluar={onKeluar} ciut={ciut} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:py-3 lg:pr-3">
        {/* Bilah atas HP */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur lg:hidden">
          <Sheet open={bukaMenu} onOpenChange={setBukaMenu}>
            <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Buka menu" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col bg-[image:var(--shell)] p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-16 items-center px-5">
                <LogoTiska tinggi={40} />
              </div>
              <IsiNavigasi
                kelompok={kelompok}
                aktif={aktif?.b.href}
                ciut={false}
                lipat={lipat}
                onLipat={ubahLipat}
                onPilih={() => setBukaMenu(false)}
              />
              <KartuPengguna sesi={sesi} onKeluar={onKeluar} ciut={false} />
            </SheetContent>
          </Sheet>
          <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-primary-strong">
            {aktif?.b.label ?? "Tiska Ops"}
          </span>
        </header>

        {/* Panel isi */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-background lg:rounded-[20px] lg:border lg:border-white/70 lg:shadow-[0_1px_2px_rgba(31,42,92,0.04),0_8px_24px_-12px_rgba(31,42,92,0.12)]">
          <button
            type="button"
            onClick={ubahCiut}
            aria-label={ciut ? "Lebarkan menu" : "Ciutkan menu"}
            className="absolute top-5 -left-3.5 z-20 hidden size-7 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground lg:flex"
          >
            <ChevronLeft className={cn("size-4 transition-transform duration-300", ciut && "rotate-180")} />
          </button>
          <div className="hidden h-16 items-center border-b border-border-row px-7 lg:flex">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[0.9375rem]">
              {aktif ? (
                <>
                  <span className="text-subtle-foreground">{aktif.k}</span>
                  <span className="text-subtle-foreground">/</span>
                  <span className="font-medium text-foreground">{aktif.b.label}</span>
                </>
              ) : (
                <span className="font-medium">Tiska Ops</span>
              )}
            </nav>
          </div>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

function IsiNavigasi({
  kelompok,
  aktif,
  ciut,
  lipat,
  onLipat,
  onPilih,
}: {
  kelompok: KelompokMenu[];
  aktif: string | undefined;
  ciut: boolean;
  lipat: string[];
  onLipat: (judul: string) => void;
  onPilih?: () => void;
}) {
  return (
    <nav className={cn("flex-1 overflow-y-auto pb-4 [scrollbar-width:none]", ciut ? "px-3" : "px-3.5")}>
      {kelompok.map((k) => {
        const adaAktif = k.butir.some((b) => b.href === aktif);
        const terlipat = !ciut && lipat.includes(k.judul) && !adaAktif;
        return (
          <div key={k.judul} className="mb-3">
            {ciut ? (
              <div className="mx-auto my-2 h-px w-8 bg-sidebar-border" />
            ) : (
              <button
                type="button"
                onClick={() => onLipat(k.judul)}
                aria-expanded={!terlipat}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold tracking-[0.08em] text-subtle-foreground uppercase transition-colors hover:text-muted-foreground"
              >
                {k.judul}
                <ChevronDown className={cn("size-3.5 transition-transform duration-300", terlipat && "-rotate-90")} />
              </button>
            )}
            {terlipat ? null : (
              <ul className="flex flex-col gap-0.5">
                {k.butir.map((butir) => {
                  const Ikon = IKON[butir.kunci] ?? Circle;
                  const ini = butir.href === aktif;
                  return (
                    <li key={butir.href}>
                      <Link
                        href={butir.href}
                        onClick={onPilih}
                        aria-current={ini ? "page" : undefined}
                        aria-label={butir.label}
                        title={ciut ? butir.label : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-[12px] text-[0.9375rem] transition-colors",
                          ciut ? "justify-center px-0" : "px-3",
                          ini
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[0_1px_2px_rgba(31,42,92,0.06),0_4px_12px_-6px_rgba(31,42,92,0.18)]"
                            : "text-sidebar-foreground hover:bg-white/55 dark:hover:bg-white/5",
                        )}
                      >
                        <Ikon className={cn("size-[18px] shrink-0", ini ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
                        {ciut ? null : <span className="truncate">{butir.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function KartuPengguna({ sesi, onKeluar, ciut }: { sesi: Sesi; onKeluar: () => Promise<void>; ciut: boolean }) {
  const router = useRouter();
  const [sedangKeluar, mulaiKeluar] = useTransition();

  const inisial = sesi.nama
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian[0])
    .join("")
    .toUpperCase();

  return (
    <div className="p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[12px] bg-white/60 p-2 text-left transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:bg-white/5 dark:hover:bg-white/10",
            ciut && "justify-center",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {inisial}
          </span>
          {ciut ? (
            <span className="sr-only">{sesi.nama}</span>
          ) : (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{sesi.nama}</span>
              <span className="block truncate text-xs text-muted-foreground">{LABEL_PERAN[sesi.peran]}</span>
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          {/* Div biasa, bukan DropdownMenuLabel: komponen itu melempar galat bila
              tidak berada di dalam Menu.Group (menjatuhkan halaman saat dibuka). */}
          <div className="px-2 py-1.5">
            <span className="block truncate text-sm font-medium">{sesi.nama}</span>
            <span className="nomor-dokumen block truncate text-muted-foreground">{sesi.username}</span>
          </div>
          <DropdownMenuSeparator />
          {/* Server action WAJIB dipanggil di dalam transition. */}
          <DropdownMenuItem
            disabled={sedangKeluar}
            onClick={() =>
              mulaiKeluar(async () => {
                await onKeluar();
                router.replace("/masuk");
                router.refresh();
              })
            }
          >
            <LogOut className="size-4" />
            {sedangKeluar ? "Keluar…" : "Keluar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
