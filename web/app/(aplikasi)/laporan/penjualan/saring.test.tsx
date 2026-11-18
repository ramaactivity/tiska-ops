import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ==========================================================================
   PENYARING TANGGAL LAPORAN (PilihTanggal custom, D-059)

   Dulu isian tanggal bawaan browser mengirim "0002-09-30" selagi tahun
   diketik dan halaman berpindah di angka pertama. Kalender custom hanya
   mengirim tanggal utuh — yang dikunci di sini: memilih tanggal memindahkan
   halaman SEKALI dengan tanggal lengkap, dan "Hapus" melepas penyaringnya.
   ========================================================================== */

const gantiAlamat = vi.fn();
let alamat = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (...a: unknown[]) => gantiAlamat(...a) }),
  usePathname: () => "/laporan/penjualan",
  useSearchParams: () => alamat,
}));

import { SaringLaporan } from "./saring";

beforeEach(() => {
  gantiAlamat.mockReset();
  alamat = new URLSearchParams();
});

afterEach(cleanup);

const pasang = () => render(<SaringLaporan pelanggan={[]} />);

const buka = (label: RegExp) => fireEvent.click(screen.getByLabelText(label));

describe("memilih tanggal dari kalender", () => {
  it("berpindah sekali, dengan tanggal yang LENGKAP", async () => {
    alamat = new URLSearchParams({ sampai: "2026-09-30" });
    pasang();
    buka(/sampai tanggal/i);
    fireEvent.click(await screen.findByRole("button", { name: "Sel, 15 Sep 2026" }));

    expect(gantiAlamat).toHaveBeenCalledTimes(1);
    expect(String(gantiAlamat.mock.calls[0][0])).toContain("sampai=2026-09-15");
  });

  it("berlaku juga untuk isian Dari tanggal (tombol Hari ini)", async () => {
    pasang();
    buka(/dari tanggal/i);
    fireEvent.click(await screen.findByRole("button", { name: "Hari ini" }));

    expect(gantiAlamat).toHaveBeenCalledTimes(1);
    expect(String(gantiAlamat.mock.calls[0][0])).toMatch(/dari=\d{4}-\d{2}-\d{2}/);
  });
});

describe("melepas penyaringnya", () => {
  it("Hapus mengosongkan tanggal dan memindahkan halaman", async () => {
    alamat = new URLSearchParams({ sampai: "2026-09-30" });
    pasang();
    buka(/sampai tanggal/i);
    fireEvent.click(await screen.findByRole("button", { name: /Hapus/ }));

    expect(gantiAlamat).toHaveBeenCalledTimes(1);
    expect(String(gantiAlamat.mock.calls[0][0])).not.toContain("sampai=");
  });
});

describe("pilihan cepat periode", () => {
  it("Bulan lalu mengisi dari & sampai sekaligus, sekali pindah", () => {
    pasang();
    fireEvent.click(screen.getByRole("tab", { name: "Bulan lalu" }));
    expect(gantiAlamat).toHaveBeenCalledTimes(1);
    const q = new URLSearchParams(String(gantiAlamat.mock.calls[0][0]).split("?")[1]);
    expect(q.get("dari")).toMatch(/^\d{4}-\d{2}-01$/);
    expect(q.get("sampai")).toMatch(/^\d{4}-\d{2}-(28|29|30|31)$/);
  });
  it("Semua melepas periode", () => {
    alamat = new URLSearchParams({ dari: "2026-11-01", sampai: "2026-11-30", customer: "7" });
    pasang();
    fireEvent.click(screen.getByRole("tab", { name: "Semua" }));
    expect(String(gantiAlamat.mock.calls[0][0])).toBe("/laporan/penjualan?customer=7");
  });
});

