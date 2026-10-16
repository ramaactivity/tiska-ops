import { romawi } from "./uang";

/* ==========================================================================
   SYARAT & KETENTUAN — dirakit dari bagian sesuai isi pesanan (06-DOKUMEN-
   QUOTATION §4, D-043). Murni. Penomoran bagian (I, II, …) dihitung ulang
   dari bagian yang ikut, jadi tidak pernah melompat.
   ========================================================================== */

export type BagianSyarat = { kode: string; judul: string; isi: string; berlaku: string; urut: number };
export type JenisPesanan = { buffetStall: boolean; box: boolean; setMenu: boolean };

export const JUDUL_SYARAT = "SYARAT DAN KETENTUAN PEMESANAN DI TISKA CATERING";

function ikut(berlaku: string, p: JenisPesanan): boolean {
  switch (berlaku) {
    case "buffet_stall":
      return p.buffetStall;
    case "set_menu":
      return p.setMenu;
    case "box":
      return p.box;
    // Bagian harga versi buffet dipakai kecuali pesanannya box saja.
    case "bukan_box":
      return p.buffetStall || p.setMenu || !p.box;
    case "hanya_box":
      return p.box && !p.buffetStall && !p.setMenu;
    default:
      return true;
  }
}

export function rakitSyarat(bagian: BagianSyarat[], pesanan: JenisPesanan): string {
  const dipakai = bagian.filter((b) => ikut(b.berlaku, pesanan)).sort((a, b) => a.urut - b.urut);
  return [JUDUL_SYARAT, ...dipakai.map((b, i) => `${romawi(i + 1)}. ${b.judul}:\n${b.isi}`)].join("\n\n");
}

/** Tebakan awal jenis pesanan dari baris dokumen; sales tetap bisa mengubahnya. */
export function tebakJenisPesanan(baris: { charge_service: boolean; unit: string; price: string }[]): Omit<JenisPesanan, "setMenu"> {
  return {
    buffetStall: baris.some((b) => b.charge_service && b.price.trim() !== ""),
    box: baris.some((b) => /box/i.test(b.unit)),
  };
}
